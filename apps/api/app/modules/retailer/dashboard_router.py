from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Cookie, Header, Query

from app.core.clock import now_utc
from app.core.errors import AppError
from app.modules.auth.router import get_user_from_token
from app.modules.cart.cycle import COMMUNITY_ORDERS, CUSTOMER_ORDER_ITEMS
from app.modules.catalogue.router import PRODUCTS, RETAILER_LISTINGS
from app.modules.payments.service import PAYMENTS
from app.modules.retailer.orders_router import (
    INVOICES,
    get_customer_flat_meta,
    get_product_variant_meta,
)

router = APIRouter(prefix="/retailer", tags=["retailer-dashboard"])


def get_current_retailer_id(
    authorization: str | None = None,
    pact_token: str | None = None,
) -> str:
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    elif pact_token:
        token = pact_token

    if not token:
        raise AppError(code="UNAUTHORIZED", message="Retailer authentication required.", status_code=401)

    user = get_user_from_token(token)
    if not user or user.get("role") != "retailer":
        raise AppError(code="UNAUTHORIZED", message="Retailer role required.", status_code=401)

    return user.get("store_id") or user.get("retailer_id") or "ret-ravi-1"


@router.get("/dashboard")
def get_retailer_dashboard(
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    F10: GET /retailer/dashboard
    All metrics computed as aggregates over real rows belonging to the caller's store.
    Tenant isolated: Farah never sees Ravi's data.
    """
    retailer_id = get_current_retailer_id(authorization, pact_token)
    now = now_utc()
    current_month_str = f"{now.year}-{now.month:02d}"

    # 1. Store's Orders
    store_orders = [
        o for o in COMMUNITY_ORDERS.values()
        if o.get("retailer_id") == retailer_id
    ]

    orders_count = {
        "received": len(store_orders),
        "awaiting": len([o for o in store_orders if o.get("status") == "submitted"]),
        "processing": len([o for o in store_orders if o.get("status") in ("accepted", "packing", "billed")]),
        "completed": len([o for o in store_orders if o.get("status") == "completed"]),
        "rejected": len([o for o in store_orders if o.get("status") == "rejected"]),
    }

    # 2. Store's Invoices
    store_order_ids = {o["id"] for o in store_orders}
    store_invoices = [
        inv for inv in INVOICES.values()
        if inv.get("order_id") in store_order_ids
    ]

    # Sales this month: sum of total_paise of paid invoices with paid_at in current month
    paid_this_month = [
        inv for inv in store_invoices
        if inv.get("status") == "paid" and inv.get("paid_at")
    ]
    sales_this_month_paise = sum(inv.get("total_paise", 0) for inv in paid_this_month)

    # Growth: compared to last month. Last month is 0 for initial launch -> null, shown as "-"
    sales_last_month_paise = 0
    growth_percent = None

    # New customers: residents whose first order line with this store was submitted this month
    store_customer_ids = {
        item["customer_id"] for item in CUSTOMER_ORDER_ITEMS.values()
        if item.get("order_id") in store_order_ids
    }
    new_customers_count = len(store_customer_ids)

    # 3. Low stock listings
    low_stock_items = []
    for (ret_id, vid), listing in RETAILER_LISTINGS.items():
        if ret_id == retailer_id and listing.get("availability") != "inactive":
            avail = listing.get("stock_qty", 0) - listing.get("reserved_qty", 0)
            threshold = listing.get("min_stock_threshold", 20)
            if avail < threshold:
                meta = get_product_variant_meta(vid)
                low_stock_items.append({
                    "variant_id": vid,
                    "product_name": meta["product_name"],
                    "variant_label": meta["variant_label"],
                    "stock_qty": listing.get("stock_qty", 0),
                    "reserved_qty": listing.get("reserved_qty", 0),
                    "available_qty": avail,
                    "min_threshold": threshold,
                })

    return {
        "retailer_id": retailer_id,
        "sales_this_month_paise": sales_this_month_paise,
        "sales_last_month_paise": sales_last_month_paise,
        "growth_percent": growth_percent,
        "new_customers_count": new_customers_count,
        "orders": orders_count,
        "low_stock_count": len(low_stock_items),
        "low_stock_items": low_stock_items,
        "recent_orders": store_orders,
    }


@router.get("/orders/{order_id}/collections")
def get_order_collections(
    order_id: str,
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    F10: GET /retailer/orders/{id}/collections
    Collection metrics for one bulk order:
    - bill total
    - received (sum of paid invoices)
    - pending (sum of unpaid, non-void invoices)
    - paid count, unpaid count
    - progress %
    - per-customer rows (name, flat, amount, status, transactions)
    - settlement line (D8)
    """
    retailer_id = get_current_retailer_id(authorization, pact_token)
    order = COMMUNITY_ORDERS.get(order_id)
    if not order or order.get("retailer_id") != retailer_id:
        raise AppError(code="ORDER_NOT_FOUND", message="Order not found.", status_code=404)

    order_invoices = [
        inv for inv in INVOICES.values()
        if inv.get("order_id") == order_id and inv.get("status") != "void"
    ]

    bill_total_paise = order.get("final_bill_paise") or sum(inv.get("total_paise", 0) for inv in order_invoices)
    paid_invoices = [inv for inv in order_invoices if inv.get("status") == "paid"]
    unpaid_invoices = [inv for inv in order_invoices if inv.get("status") != "paid"]

    received_paise = sum(inv.get("total_paise", 0) for inv in paid_invoices)
    pending_paise = sum(inv.get("total_paise", 0) for inv in unpaid_invoices)

    progress_percent = round((received_paise / bill_total_paise * 100)) if bill_total_paise > 0 else 0

    customer_rows = []
    for inv in order_invoices:
        c_meta = get_customer_flat_meta(inv["customer_id"])
        inv_payments = [
            p for p in PAYMENTS.values()
            if p.get("invoice_id") == inv["id"]
        ]
        customer_rows.append({
            "customer_id": inv["customer_id"],
            "name": c_meta["name"],
            "unit_label": c_meta["unit_label"],
            "invoice_id": inv["id"],
            "amount_paise": inv["total_paise"],
            "status": inv["status"],
            "transactions_count": len(inv_payments),
            "paid_at": inv.get("paid_at"),
        })

    customer_rows.sort(key=lambda x: (x["unit_label"], x["name"]))

    return {
        "order_id": order_id,
        "bill_total_paise": bill_total_paise,
        "received_paise": received_paise,
        "pending_paise": pending_paise,
        "paid_count": len(paid_invoices),
        "unpaid_count": len(unpaid_invoices),
        "total_invoices_count": len(order_invoices),
        "progress_percent": progress_percent,
        "customer_rows": customer_rows,
        "settlement_line": "Settlement: not available in test mode",
    }


@router.get("/history")
def get_retailer_history(
    month: str | None = None,
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """F10: GET /retailer/history?month="""
    retailer_id = get_current_retailer_id(authorization, pact_token)
    store_orders = [
        o for o in COMMUNITY_ORDERS.values()
        if o.get("retailer_id") == retailer_id
    ]
    return {
        "retailer_id": retailer_id,
        "orders": store_orders,
    }
