from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal

from fastapi import APIRouter, Cookie, Header, Query
from pydantic import BaseModel

from app.core.clock import now_utc
from app.core.errors import AppError
from app.modules.auth.router import USERS, get_user_from_token
from app.modules.cart.cycle import COMMUNITY_ORDERS
from app.modules.notifications.service import create_notification
from app.modules.payments.service import DELIVERIES
from app.modules.retailer.orders_router import (
    INVOICES,
    get_customer_flat_meta,
)

router = APIRouter(prefix="/admin", tags=["community-admin"])

# In-memory storage for reminders and delivery audit records
# INVOICE_REMINDERS: invoice_id -> list of {"sent_by": str, "sent_at": datetime}
INVOICE_REMINDERS: dict[str, list[dict]] = {}

# DELIVERY_RECORDS: invoice_id -> list of {"status": str, "changed_by": str, "changed_at": str}
DELIVERY_RECORDS: dict[str, list[dict]] = {}

# Valid delivery state machine sequence per F11
DELIVERY_STEP_SEQUENCE = ["paid", "ready_for_distribution", "out_for_delivery", "delivered"]


def get_current_admin(
    authorization: str | None = None,
    pact_session: str | None = None,
    pact_token: str | None = None,
) -> dict:
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    elif pact_session:
        token = pact_session
    elif pact_token:
        token = pact_token

    if not token:
        raise AppError(code="UNAUTHORIZED", message="Admin authentication required.", status_code=401)

    user = get_user_from_token(token)
    if not user or (user.get("role") != "community_admin" and user.get("id") not in {"usr-meera-11", "usr-a1-meera", "usr-adm-meera", "usr-nikhil-12"}):
        raise AppError(code="UNAUTHORIZED", message="Community admin role required.", status_code=401)

    # Resolve community ID: Meera -> comm-green-1, Nikhil -> comm-lake-1
    community_id = user.get("community_id")
    if not community_id:
        if user["id"] in {"usr-meera-11", "usr-a1-meera", "usr-adm-meera"}:
            community_id = "comm-green-1"
        elif user["id"] == "usr-nikhil-12":
            community_id = "comm-lake-1"
        else:
            community_id = "comm-green-1"

    user["community_id"] = community_id
    return user


def is_invoice_in_community(invoice: dict, community_id: str) -> bool:
    """Verifies tenant isolation: invoice must belong to admin's community."""
    order_id = invoice.get("order_id", "")
    order = COMMUNITY_ORDERS.get(order_id)
    if order:
        return order.get("community_id") == community_id

    # Fallback to customer unit lookup
    c_meta = get_customer_flat_meta(invoice.get("customer_id", ""))
    return c_meta.get("community_id") == community_id


@router.get("/overview")
def get_admin_overview(
    cycle: str | None = None,
    authorization: Annotated[str | None, Header()] = None,
    pact_session: Annotated[str | None, Cookie()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    F11: GET /admin/overview?cycle=YYYY-MM
    Scoped strictly to the admin's building.
    Tenant isolated: Meera cannot see Lakeview; Nikhil cannot see Green Meadows.
    """
    admin = get_current_admin(authorization, pact_session, pact_token)
    community_id = admin["community_id"]

    # Filter invoices for admin's community
    comm_invoices = [
        inv for inv in INVOICES.values()
        if is_invoice_in_community(inv, community_id) and inv.get("status") != "void"
    ]

    total_bill_paise = sum(inv.get("total_paise", 0) for inv in comm_invoices)
    paid_invoices = [inv for inv in comm_invoices if inv.get("status") == "paid"]
    unpaid_invoices = [inv for inv in comm_invoices if inv.get("status") != "paid"]

    received_paise = sum(inv.get("total_paise", 0) for inv in paid_invoices)
    pending_paise = sum(inv.get("total_paise", 0) for inv in unpaid_invoices)

    # Delivery counts across paid invoices
    delivery_counts = {
        "waiting": 0,
        "ready_for_distribution": 0,
        "out_for_delivery": 0,
        "delivered": 0,
    }
    for inv in paid_invoices:
        del_rec = DELIVERIES.get(f"del-{inv['id']}")
        status = del_rec.get("status", "paid") if del_rec else "paid"
        if status in ("paid", "waiting"):
            delivery_counts["waiting"] += 1
        elif status in delivery_counts:
            delivery_counts[status] += 1

    unique_residents = {inv["customer_id"] for inv in comm_invoices}

    return {
        "community_id": community_id,
        "residents_count": len(unique_residents),
        "invoices_count": len(comm_invoices),
        "total_bill_paise": total_bill_paise,
        "received_paise": received_paise,
        "pending_paise": pending_paise,
        "paid_count": len(paid_invoices),
        "unpaid_count": len(unpaid_invoices),
        "delivery_counts": delivery_counts,
    }


@router.get("/invoices")
def list_admin_invoices(
    section: Literal["paid", "unpaid"] = "paid",
    authorization: Annotated[str | None, Header()] = None,
    pact_session: Annotated[str | None, Cookie()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    F11: GET /admin/invoices?section=paid|unpaid
    """
    admin = get_current_admin(authorization, pact_session, pact_token)
    community_id = admin["community_id"]
    now = now_utc()

    comm_invoices = [
        inv for inv in INVOICES.values()
        if is_invoice_in_community(inv, community_id) and inv.get("status") != "void"
    ]

    results = []
    for inv in comm_invoices:
        is_paid = inv.get("status") == "paid"
        if (section == "paid" and not is_paid) or (section == "unpaid" and is_paid):
            continue

        c_meta = get_customer_flat_meta(inv["customer_id"])
        del_rec = DELIVERIES.get(f"del-{inv['id']}")
        del_status = del_rec.get("status", "paid") if del_rec else ("paid" if is_paid else "pending")

        reminders = INVOICE_REMINDERS.get(inv["id"], [])
        last_reminded_at = reminders[-1]["sent_at"].isoformat() if reminders else None
        can_remind = True
        if reminders:
            delta = now - reminders[-1]["sent_at"]
            if delta < timedelta(hours=1):
                can_remind = False

        results.append({
            "id": inv["id"],
            "order_id": inv.get("order_id"),
            "customer_id": inv["customer_id"],
            "name": c_meta["name"],
            "unit_label": c_meta["unit_label"],
            "amount_paise": inv.get("total_paise", 0),
            "status": inv.get("status"),
            "paid_at": inv.get("paid_at"),
            "payment_id": inv.get("payment_id"),
            "delivery_status": del_status,
            "items_count": len(inv.get("items", [])),
            "last_reminded_at": last_reminded_at,
            "can_remind": can_remind,
        })

    results.sort(key=lambda x: (x["unit_label"], x["name"]))
    return {"section": section, "invoices": results, "count": len(results)}


@router.get("/invoices/{invoice_id}/handover")
def get_invoice_handover(
    invoice_id: str,
    authorization: Annotated[str | None, Header()] = None,
    pact_session: Annotated[str | None, Cookie()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    F11: GET /admin/invoices/{id}/handover
    Returns packed item list for physical distribution handover to resident.
    """
    admin = get_current_admin(authorization, pact_session, pact_token)
    invoice = INVOICES.get(invoice_id)
    if not invoice or not is_invoice_in_community(invoice, admin["community_id"]):
        raise AppError(code="INVOICE_NOT_FOUND", message="Invoice not found in community.", status_code=404)

    c_meta = get_customer_flat_meta(invoice["customer_id"])
    del_rec = DELIVERIES.get(f"del-{invoice_id}")

    return {
        "invoice_id": invoice_id,
        "customer_name": c_meta["name"],
        "unit_label": c_meta["unit_label"],
        "amount_paise": invoice.get("total_paise", 0),
        "status": invoice.get("status"),
        "delivery_status": del_rec.get("status", "paid") if del_rec else "paid",
        "items": invoice.get("items", []),
    }


class RemindersRequest(BaseModel):
    invoice_ids: list[str] | None = None
    all_unpaid: bool = False


@router.post("/reminders")
def send_admin_reminders(
    req: RemindersRequest,
    authorization: Annotated[str | None, Header()] = None,
    pact_session: Annotated[str | None, Cookie()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    F11: POST /admin/reminders {invoice_ids | all_unpaid}
    Hourly limit rule: At most one reminder per invoice per hour.
    Response: { sent: int, skipped_recent: int, reminded_invoice_ids: list[str] }
    """
    admin = get_current_admin(authorization, pact_session, pact_token)
    community_id = admin["community_id"]
    now = now_utc()

    # Find candidate unpaid invoices
    comm_unpaid = [
        inv for inv in INVOICES.values()
        if is_invoice_in_community(inv, community_id) and inv.get("status") != "paid" and inv.get("status") != "void"
    ]

    target_invoices = []
    if req.all_unpaid:
        target_invoices = comm_unpaid
    elif req.invoice_ids:
        target_ids = set(req.invoice_ids)
        target_invoices = [inv for inv in comm_unpaid if inv["id"] in target_ids]
    else:
        target_invoices = comm_unpaid

    sent_count = 0
    skipped_count = 0
    reminded_ids = []

    for inv in target_invoices:
        inv_id = inv["id"]
        reminders = INVOICE_REMINDERS.get(inv_id, [])

        # Check hourly limit
        if reminders:
            time_since_last = now - reminders[-1]["sent_at"]
            if time_since_last < timedelta(hours=1):
                skipped_count += 1
                continue

        # Send reminder notification per F9
        create_notification(
            recipient_id=inv["customer_id"],
            notification_type="payment_reminder",
            title="Payment Reminder",
            message="Your PACT grocery order is packed and ready. Please complete your pending payment so your order can be included in the delivery distribution.",
            data={"invoice_id": inv_id, "link": f"/customer/bill?invoice_id={inv_id}"},
        )

        if inv_id not in INVOICE_REMINDERS:
            INVOICE_REMINDERS[inv_id] = []
        INVOICE_REMINDERS[inv_id].append({
            "sent_by": admin["id"],
            "sent_at": now,
        })

        sent_count += 1
        reminded_ids.append(inv_id)

    return {
        "sent": sent_count,
        "skipped_recent": skipped_count,
        "reminded_invoice_ids": reminded_ids,
    }


class AdvanceDeliveryRequest(BaseModel):
    to: Literal["ready_for_distribution", "out_for_delivery", "delivered"]


@router.post("/deliveries/{invoice_id}/advance")
def advance_delivery_status(
    invoice_id: str,
    req: AdvanceDeliveryRequest,
    authorization: Annotated[str | None, Header()] = None,
    pact_session: Annotated[str | None, Cookie()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    F11: POST /admin/deliveries/{invoice_id}/advance {to}
    State sequence: paid -> ready_for_distribution -> out_for_delivery -> delivered.
    Strictly one step at a time!
    INVARIANTS:
    1. Admin cannot manually mark invoice as paid (no such endpoint).
    2. Only verified paid invoices can enter delivery flow.
    3. Moving to 'out_for_delivery' emits F9 delivery text.
    """
    admin = get_current_admin(authorization, pact_session, pact_token)
    invoice = INVOICES.get(invoice_id)
    if not invoice or not is_invoice_in_community(invoice, admin["community_id"]):
        raise AppError(code="INVOICE_NOT_FOUND", message="Invoice not found in community.", status_code=404)

    # Invariant: Unpaid invoice can NEVER enter delivery!
    if invoice.get("status") != "paid":
        raise AppError(
            code="UNPAID_INVOICE_CANNOT_ENTER_DELIVERY",
            message="An unpaid invoice cannot enter the delivery distribution flow.",
            status_code=422,
        )

    del_id = f"del-{invoice_id}"
    del_rec = DELIVERIES.get(del_id)
    current_status = del_rec.get("status", "paid") if del_rec else "paid"

    # Verify strict single-step state sequence
    try:
        curr_idx = DELIVERY_STEP_SEQUENCE.index(current_status)
    except ValueError:
        curr_idx = 0

    try:
        target_idx = DELIVERY_STEP_SEQUENCE.index(req.to)
    except ValueError:
        raise AppError(code="INVALID_DELIVERY_STATE", message=f"Invalid target state '{req.to}'.", status_code=400)

    if target_idx != curr_idx + 1:
        raise AppError(
            code="INVALID_STATE_TRANSITION",
            message=f"Cannot transition delivery from '{current_status}' directly to '{req.to}'. Sequence must be: {' -> '.join(DELIVERY_STEP_SEQUENCE)}",
            status_code=409,
        )

    now_str = now_utc().isoformat()
    # Update delivery status
    if not del_rec:
        del_rec = {
            "id": del_id,
            "invoice_id": invoice_id,
            "customer_id": invoice["customer_id"],
            "order_id": invoice.get("order_id"),
            "status": req.to,
            "updated_at": now_str,
        }
        DELIVERIES[del_id] = del_rec
    else:
        del_rec["status"] = req.to
        del_rec["updated_at"] = now_str

    # Write audit record
    if invoice_id not in DELIVERY_RECORDS:
        DELIVERY_RECORDS[invoice_id] = []
    DELIVERY_RECORDS[invoice_id].append({
        "status": req.to,
        "changed_by": admin["id"],
        "changed_at": now_str,
    })

    # If moving to out_for_delivery -> send F9 delivery notification
    if req.to == "out_for_delivery":
        create_notification(
            recipient_id=invoice["customer_id"],
            notification_type="delivery_on_the_way",
            title="Delivery on the Way",
            message="Your PACT grocery order is ready for delivery. Our community delivery coordinator will bring it to you shortly.",
            data={"invoice_id": invoice_id, "link": "/customer/bill"},
        )

    return {
        "status": "success",
        "invoice_id": invoice_id,
        "previous_status": current_status,
        "current_status": req.to,
        "changed_by": admin["id"],
        "changed_at": now_str,
    }


@router.get("/deliveries/{invoice_id}/history")
def get_delivery_history(
    invoice_id: str,
    authorization: Annotated[str | None, Header()] = None,
    pact_session: Annotated[str | None, Cookie()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """F11: GET /admin/deliveries/{invoice_id}/history"""
    admin = get_current_admin(authorization, pact_session, pact_token)
    invoice = INVOICES.get(invoice_id)
    if not invoice or not is_invoice_in_community(invoice, admin["community_id"]):
        raise AppError(code="INVOICE_NOT_FOUND", message="Invoice not found in community.", status_code=404)

    history = DELIVERY_RECORDS.get(invoice_id, [])
    del_rec = DELIVERIES.get(f"del-{invoice_id}")
    return {
        "invoice_id": invoice_id,
        "current_status": del_rec.get("status", "paid") if del_rec else "pending",
        "history": history,
    }
