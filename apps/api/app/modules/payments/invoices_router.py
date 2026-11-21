from typing import Annotated

from fastapi import APIRouter, Cookie, Header
from pydantic import BaseModel

from app.core.clock import now_utc
from app.core.errors import AppError
from app.modules.auth.router import get_user_from_token
from app.modules.payments.service import (
    DELIVERIES,
    PAYMENTS,
    create_payment_for_invoice,
    verify_payment_transition,
)
from app.modules.retailer.orders_router import INVOICES

router = APIRouter(prefix="/api/v1/invoices", tags=["invoices"])


def get_current_user_id(
    authorization: str | None = None,
    pact_token: str | None = None,
) -> str:
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    elif pact_token:
        token = pact_token

    if not token:
        raise AppError(code="UNAUTHORIZED", message="Authentication required.", status_code=401)

    user = get_user_from_token(token)
    if not user:
        raise AppError(code="UNAUTHORIZED", message="Invalid session token.", status_code=401)

    return user["id"] if isinstance(user, dict) else user.id


class PayRequest(BaseModel):
    gateway: str | None = "mock"


@router.get("")
def list_invoices(
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    F8: GET /invoices
    Returns caller's own invoices only.
    """
    user_id = get_current_user_id(authorization, pact_token)
    user_invoices = [
        inv for inv in INVOICES.values()
        if inv.get("customer_id") == user_id
    ]
    user_invoices.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {"invoices": user_invoices}


@router.get("/{invoice_id}")
def get_invoice(
    invoice_id: str,
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    F8: GET /invoices/{id}
    Returns caller's own invoice details (items, breakdown, payment state, delivery state).
    Nobody can view another customer's invoice (returns 404).
    """
    user_id = get_current_user_id(authorization, pact_token)
    invoice = INVOICES.get(invoice_id)
    if not invoice or invoice.get("customer_id") != user_id:
        raise AppError(code="INVOICE_NOT_FOUND", message="Invoice not found.", status_code=404)

    delivery = DELIVERIES.get(f"del-{invoice_id}")
    payments = [
        p for p in PAYMENTS.values()
        if p.get("invoice_id") == invoice_id
    ]

    return {
        "invoice": invoice,
        "delivery": delivery,
        "payments": payments,
    }


@router.post("/{invoice_id}/pay")
def pay_invoice(
    invoice_id: str,
    req: PayRequest | None = None,
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    F8 Step 1: POST /invoices/{id}/pay
    Caller must own the invoice and it must be unpaid.
    Creates gateway order, inserts payments row, sets invoice payment_pending,
    returns checkout parameters.
    """
    user_id = get_current_user_id(authorization, pact_token)
    gateway_name = req.gateway if req else "mock"
    result = create_payment_for_invoice(user_id, invoice_id, gateway_name)
    return result


@router.post("/{invoice_id}/verify")
def verify_invoice(
    invoice_id: str,
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    F8 Step 4: POST /invoices/{id}/verify
    Asks gateway for payment status and applies transition logic.
    Used when returning from checkout or if webhook is delayed.
    """
    user_id = get_current_user_id(authorization, pact_token)
    result = verify_payment_transition(user_id, invoice_id)
    return result


@router.post("/generate-retailer-bill")
def generate_retailer_bill(
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    Convenience endpoint for testing & on-demand billing:
    Finds active community order, finalises it (running split_bill and generating invoices),
    and returns the generated invoice for the caller.
    """
    user_id = get_current_user_id(authorization, pact_token)
    from app.modules.retailer.orders_router import COMMUNITY_ORDERS, _execute_split_for_order, INVOICES
    order_id = "ord-comm-green-2026-11"
    if order_id not in COMMUNITY_ORDERS:
        for ord_k in COMMUNITY_ORDERS:
            order_id = ord_k
            break

    order = COMMUNITY_ORDERS.get(order_id)
    if order:
        retailer_id = order.get("retailer_id", "ret-ravi-1")
        split_res = _execute_split_for_order(order_id, retailer_id)
        for inv_data in split_res["invoices"]:
            inv_id = f"inv-{order_id}-{inv_data['customer_id']}"
            INVOICES[inv_id] = {
                "id": inv_id,
                "order_id": order_id,
                "customer_id": inv_data["customer_id"],
                "subtotal_paise": inv_data["subtotal_paise"],
                "overall_discount_share_paise": inv_data["overall_discount_share_paise"],
                "delivery_share_paise": inv_data["delivery_share_paise"],
                "rounding_adjustment_paise": inv_data["rounding_adjustment_paise"],
                "total_paise": inv_data["total_paise"],
                "status": "issued",
                "items": inv_data["items"],
                "created_at": now_utc().isoformat(),
            }
        order["status"] = "billed"
        order["final_bill_paise"] = split_res["bill_total_paise"]

    user_invoices = [inv for inv in INVOICES.values() if inv.get("customer_id") == user_id]
    if user_invoices:
        return {"invoice": user_invoices[0], "status": "generated"}
    first_inv = list(INVOICES.values())[0] if INVOICES else None
    return {"invoice": first_inv, "status": "generated"}

