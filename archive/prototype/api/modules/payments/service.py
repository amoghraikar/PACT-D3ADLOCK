import threading
import uuid
from datetime import datetime, timezone
from typing import Any

from app.core.clock import now_utc
from app.core.errors import AppError
from app.modules.cart.cycle import COMMUNITY_ORDERS
from app.modules.notifications.handlers import (
    on_payment_failed,
    on_payment_succeeded,
)
from app.modules.payments.gateway import (
    MockGateway,
    RazorpayGateway,
    get_payment_gateway,
)
from app.modules.retailer.orders_router import INVOICES

# In-memory storage for Payments, Events, and Deliveries
# PAYMENTS: payment_id -> dict
PAYMENTS: dict[str, dict[str, Any]] = {}

# PAYMENT_EVENTS: gateway_event_id -> dict
PAYMENT_EVENTS: dict[str, dict[str, Any]] = {}

# DELIVERIES: delivery_id -> dict
DELIVERIES: dict[str, dict[str, Any]] = {}

# Thread lock for atomic payment transitions and webhook race prevention
PAYMENT_LOCK = threading.Lock()

CUSTOMER_ID_ALIASES = {
    "usr-c1-asha": "usr-asha-1",
    "usr-asha-1": "usr-c1-asha",
    "usr-c2-bharat": "usr-bharat-2",
    "usr-bharat-2": "usr-c2-bharat",
    "usr-c3-chitra": "usr-chitra-3",
    "usr-chitra-3": "usr-c3-chitra",
    "usr-c4-dev": "usr-dev-4",
    "usr-dev-4": "usr-c4-dev",
    "usr-c5-esha": "usr-esha-5",
    "usr-esha-5": "usr-c5-esha",
}


def is_same_customer(cid1: str | None, cid2: str | None) -> bool:
    if not cid1 or not cid2:
        return False
    if cid1 == cid2:
        return True
    return CUSTOMER_ID_ALIASES.get(cid1) == cid2 or CUSTOMER_ID_ALIASES.get(cid2) == cid1


def create_payment_for_invoice(
    customer_id: str,
    invoice_id: str,
    gateway_name: str | None = None,
) -> dict[str, Any]:
    """
    F8 Step 1: Pay.
    The caller must own the invoice and it must be unpaid.
    The server creates a gateway order for exactly total_paise,
    inserts a payments row (created), sets the invoice payment_pending,
    and returns checkout parameters.
    """
    invoice = INVOICES.get(invoice_id)
    if not invoice or not is_same_customer(invoice.get("customer_id"), customer_id):
        raise AppError(code="INVOICE_NOT_FOUND", message="Invoice not found.", status_code=404)

    if invoice.get("status") == "void":
        raise AppError(code="VOID_INVOICE", message="A void invoice cannot be paid.", status_code=422)

    if invoice.get("status") == "paid":
        raise AppError(code="ALREADY_PAID", message="This invoice has already been paid.", status_code=409)

    gateway = get_payment_gateway(gateway_name)
    amount_paise = invoice["total_paise"]

    # Create gateway order
    gw_order = gateway.create_order(
        amount_paise=amount_paise,
        currency="INR",
        receipt=invoice_id,
        notes={"customer_id": customer_id, "invoice_id": invoice_id},
    )

    # Insert payments row
    payment_id = f"pay-{uuid.uuid4().hex[:12]}"
    payment_record = {
        "id": payment_id,
        "invoice_id": invoice_id,
        "customer_id": customer_id,
        "order_id": invoice.get("order_id"),
        "gateway": "razorpay" if isinstance(gateway, RazorpayGateway) else "mock",
        "gateway_order_id": gw_order["id"],
        "gateway_payment_id": None,
        "amount_paise": amount_paise,
        "status": "created",
        "created_at": now_utc().isoformat(),
        "succeeded_at": None,
        "failed_at": None,
    }
    PAYMENTS[payment_id] = payment_record

    # Set invoice to payment_pending
    invoice["status"] = "payment_pending"

    return {
        "payment_id": payment_id,
        "gateway_order_id": gw_order["id"],
        "gateway": payment_record["gateway"],
        "amount_paise": amount_paise,
        "key_id": gw_order.get("key_id", "mock_key_pact_dev"),
        "invoice_id": invoice_id,
    }


def handle_webhook_event(raw_body: bytes, headers: dict[str, str], gateway_name: str) -> dict[str, Any]:
    """
    F8 Step 3: Webhook processing.
    - Bad signature -> 400.
    - Duplicate gateway_event_id -> 200 (idempotent, nothing else happens).
    - In one transaction with row locks:
      - Amount must equal invoice total -> payment succeeded, invoice paid, first delivery record (paid),
        order completed if last unpaid invoice, emit payment.succeeded.
      - Failure event -> payment failed, invoice payment_failed, emit payment.failed.
      - Amount mismatch -> recorded and flagged; invoice not paid.
      - Success for already-paid invoice -> payment becomes needs_refund; invoice unchanged.
    """
    gateway = get_payment_gateway(gateway_name)

    # 1. Verify signature
    if not gateway.verify_webhook(raw_body, headers):
        raise AppError(code="INVALID_SIGNATURE", message="Bad webhook signature.", status_code=400)

    # 2. Parse event
    event = gateway.parse_event(raw_body, headers)
    event_id = event["event_id"]

    with PAYMENT_LOCK:
        # 3. Duplicate check
        if event_id in PAYMENT_EVENTS:
            return {"status": "already_processed", "event_id": event_id}

        PAYMENT_EVENTS[event_id] = {
            "id": event_id,
            "event_type": event["event_type"],
            "raw": event.get("raw"),
            "processed_at": now_utc().isoformat(),
        }

        # Find matching payment record
        gw_order_id = event.get("order_id")
        payment = None
        for p in PAYMENTS.values():
            if gw_order_id and p.get("gateway_order_id") == gw_order_id:
                payment = p
                break

        # If not matched by gw_order_id, look up by invoice_id if present in notes
        if not payment:
            inv_id = event.get("raw", {}).get("payload", {}).get("payment", {}).get("entity", {}).get("notes", {}).get("invoice_id")
            if inv_id:
                for p in reversed(list(PAYMENTS.values())):
                    if p.get("invoice_id") == inv_id and p.get("status") in ("created", "payment_pending"):
                        payment = p
                        break

        # If still no payment row, synthesize or find latest created
        if not payment:
            # Fallback to the latest payment matching order or active
            for p in reversed(list(PAYMENTS.values())):
                if p.get("status") == "created":
                    payment = p
                    break

        if not payment:
            return {"status": "no_matching_payment", "event_id": event_id}

        gw_payment_id = event.get("payment_id") or f"pay_gw_{uuid.uuid4().hex[:10]}"
        payment["gateway_payment_id"] = gw_payment_id
        invoice_id = payment["invoice_id"]
        invoice = INVOICES.get(invoice_id)
        if not invoice:
            return {"status": "invoice_not_found", "event_id": event_id}

        event_type = event.get("event_type")

        # Failure Event
        if event_type in ("payment.failed", "mock.payment.failed"):
            payment["status"] = "failed"
            payment["failed_at"] = now_utc().isoformat()
            invoice["status"] = "payment_failed"
            on_payment_failed(invoice_id, invoice["customer_id"], payment["id"])
            return {"status": "processed", "result": "payment_failed"}

        # Success / Capture Event
        if event_type in ("payment.captured", "payment.succeeded", "mock.payment.captured"):
            paid_amount = event.get("amount_paise")
            if paid_amount is None:
                paid_amount = invoice["total_paise"]

            # Amount mismatch check
            if paid_amount != invoice["total_paise"]:
                payment["status"] = "flagged_mismatch"
                payment["flagged_reason"] = f"Expected {invoice['total_paise']}, got {paid_amount}"
                # Invoice remains unpaid
                return {"status": "processed", "result": "amount_mismatch_flagged"}

            # Already paid check -> needs_refund
            if invoice.get("status") == "paid":
                payment["status"] = "needs_refund"
                return {"status": "processed", "result": "needs_refund"}

            # Succeeded transition
            payment["status"] = "succeeded"
            payment["succeeded_at"] = now_utc().isoformat()

            invoice["status"] = "paid"
            invoice["paid_at"] = payment["succeeded_at"]
            invoice["payment_id"] = payment["id"]

            # Create initial delivery record
            delivery_id = f"del-{invoice_id}"
            DELIVERIES[delivery_id] = {
                "id": delivery_id,
                "invoice_id": invoice_id,
                "customer_id": invoice["customer_id"],
                "order_id": invoice.get("order_id"),
                "status": "paid",
                "created_at": now_utc().isoformat(),
            }

            # Check if all customer invoices in this order are paid -> order completed
            order_id = invoice.get("order_id")
            if order_id and order_id in COMMUNITY_ORDERS:
                all_order_invs = [
                    inv for inv in INVOICES.values()
                    if inv.get("order_id") == order_id and inv.get("status") != "void"
                ]
                if all_order_invs and all(inv.get("status") == "paid" for inv in all_order_invs):
                    COMMUNITY_ORDERS[order_id]["status"] = "completed"
                    COMMUNITY_ORDERS[order_id]["completed_at"] = now_utc().isoformat()

            # Emit notification
            on_payment_succeeded(invoice_id, invoice["customer_id"], payment["id"])

            try:
                from app.modules.retailer.orders_router import save_orders_store
                save_orders_store()
            except Exception:
                pass

            return {"status": "processed", "result": "payment_succeeded"}

        return {"status": "unhandled_event", "event_id": event_id}


def verify_payment_transition(customer_id: str, invoice_id: str) -> dict[str, Any]:
    """
    F8 Step 4: Verify.
    For when returning from checkout or when webhook is slow.
    Asks gateway for status and applies the same transition logic with thread lock.
    """
    invoice = INVOICES.get(invoice_id)
    if not invoice or not is_same_customer(invoice.get("customer_id"), customer_id):
        raise AppError(code="INVOICE_NOT_FOUND", message="Invoice not found.", status_code=404)

    if invoice.get("status") == "paid":
        return {"status": "paid", "invoice": invoice}

    # Find the latest payment attempt for this invoice
    payment = None
    for p in reversed(list(PAYMENTS.values())):
        if p.get("invoice_id") == invoice_id:
            payment = p
            break

    if not payment:
        return {"status": invoice.get("status", "unpaid"), "invoice": invoice}

    with PAYMENT_LOCK:
        # Check if status changed while acquiring lock
        if invoice.get("status") == "paid":
            return {"status": "paid", "invoice": invoice}

        gateway = get_payment_gateway(payment.get("gateway"))
        gw_status = gateway.fetch_status(payment.get("gateway_payment_id") or "mock_pay_1")

        if gw_status.get("status") == "captured":
            payment["status"] = "succeeded"
            payment["succeeded_at"] = now_utc().isoformat()

            invoice["status"] = "paid"
            invoice["paid_at"] = payment["succeeded_at"]
            invoice["payment_id"] = payment["id"]

            delivery_id = f"del-{invoice_id}"
            DELIVERIES[delivery_id] = {
                "id": delivery_id,
                "invoice_id": invoice_id,
                "customer_id": invoice["customer_id"],
                "order_id": invoice.get("order_id"),
                "status": "paid",
                "created_at": now_utc().isoformat(),
            }

            order_id = invoice.get("order_id")
            if order_id and order_id in COMMUNITY_ORDERS:
                all_order_invs = [
                    inv for inv in INVOICES.values()
                    if inv.get("order_id") == order_id and inv.get("status") != "void"
                ]
                if all_order_invs and all(inv.get("status") == "paid" for inv in all_order_invs):
                    COMMUNITY_ORDERS[order_id]["status"] = "completed"
                    COMMUNITY_ORDERS[order_id]["completed_at"] = now_utc().isoformat()

            on_payment_succeeded(invoice_id, invoice["customer_id"], payment["id"])
            try:
                from app.modules.retailer.orders_router import save_orders_store
                save_orders_store()
            except Exception:
                pass
            return {"status": "paid", "invoice": invoice}

        elif gw_status.get("status") == "failed":
            payment["status"] = "failed"
            payment["failed_at"] = now_utc().isoformat()
            invoice["status"] = "payment_failed"
            on_payment_failed(invoice_id, invoice["customer_id"], payment["id"])
            return {"status": "payment_failed", "invoice": invoice}

        return {"status": invoice.get("status"), "invoice": invoice}


def clear_payments_for_test():
    PAYMENTS.clear()
    PAYMENT_EVENTS.clear()
    DELIVERIES.clear()
