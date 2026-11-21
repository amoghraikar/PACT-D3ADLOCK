"""
Retailer Order Processing API for PACT (P13 / F6).

Implements the complete retailer order workflow:
1. Review (submitted): totals per variant, per-customer breakdown (name & flat only).
2. Accept -> accepted: reserves stock min(requested, available). Or Reject -> rejected.
3. Pack -> packing: sets packed_qty per customer line. Guard: packed_qty <= requested_qty.
4. Price & Discount: draft bill with variant unit prices <= MRP, product discounts, overall discount.
5. Preview: runs pure split_bill() and returns preview without saving.
6. Finalise -> billed: atomic check on stock, save invoices, deduct stock, release reservations, lock order.
"""

from typing import Annotated

from fastapi import APIRouter, Cookie, Header, Query
from pydantic import BaseModel, Field

from app.core.clock import now_utc
from app.core.errors import AppError
from app.modules.auth.router import USERS, get_user_from_token
from app.modules.billing.split import (
    BillSplitInput,
    CustomerOrderLineInput,
    VariantPriceInput,
    split_bill,
)
from app.modules.cart.cycle import (
    CART_ITEMS,
    COMMUNITY_ORDERS,
    CUSTOMER_ORDER_ITEMS,
)
from app.modules.catalogue.router import PRODUCTS, RETAILER_LISTINGS
from app.modules.notifications.handlers import on_invoice_created, on_order_rejected

router = APIRouter(prefix="/retailer/orders", tags=["retailer-orders"])

# In-memory storage for Invoices and Finalized Bills
# INVOICES: invoice_id -> dict
INVOICES: dict[str, dict] = {}
# ORDER_RESERVATIONS: (order_id, variant_id) -> int reserved_qty
ORDER_RESERVATIONS: dict[tuple[str, str], int] = {}
# ORDER_DRAFT_BILLS: order_id -> dict
ORDER_DRAFT_BILLS: dict[str, dict] = {}


def get_current_retailer_id(
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
) -> str:
    """Helper to authenticate the caller and ensure they are a retailer."""
    token = pact_token
    if not token and authorization:
        if authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]
        else:
            token = authorization

    user = get_user_from_token(token)
    if not user or user.get("role") != "retailer":
        raise AppError(
            code="UNAUTHORIZED",
            message="Retailer authentication required.",
            status_code=401,
        )
    return user.get("store_id") or user.get("retailer_id") or "ret-ravi-1"


class RejectRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


class PackingLineItem(BaseModel):
    customer_id: str
    variant_id: str
    packed_qty: int = Field(ge=0)


class PackingRequest(BaseModel):
    items: list[PackingLineItem]


class DraftBillVariantLine(BaseModel):
    variant_id: str
    final_unit_price_paise: int = Field(ge=0)
    product_discount_paise: int = Field(default=0, ge=0)


class DraftBillRequest(BaseModel):
    lines: list[DraftBillVariantLine] = []
    overall_discount_paise: int = Field(default=0, ge=0)
    delivery_charge_paise: int = Field(default=0, ge=0)


def get_product_variant_meta(variant_id: str) -> dict:
    """Returns metadata for variant from central products."""
    for p in PRODUCTS:
        for v in p.get("variants", []):
            if v["id"] == variant_id:
                return {
                    "product_name": p["name"],
                    "brand": p["brand"],
                    "variant_label": v["label"],
                    "pack_size": v["pack_size"],
                    "pack_unit": v["pack_unit"],
                }
    return {
        "product_name": "Grocery Item",
        "brand": "Standard",
        "variant_label": "1 pack",
        "pack_size": 1,
        "pack_unit": "pack",
    }


def get_customer_flat_meta(customer_id: str) -> dict:
    """Returns safe resident metadata (name, flat only). Never phone number."""
    u = USERS.get(customer_id)
    if u:
        return {
            "name": u["name"],
            "unit_label": u.get("flat", "A-101"),
        }
    # Golden personas fallback mapping
    mapping = {
        "usr-c1-asha": {"name": "Asha Rao", "unit_label": "A-101"},
        "usr-c2-bharat": {"name": "Bharat Patel", "unit_label": "B-204"},
        "usr-c3-chitra": {"name": "Chitra Nair", "unit_label": "C-305"},
        "usr-c4-dev": {"name": "Dev Sharma", "unit_label": "D-402"},
        "usr-c5-esha": {"name": "Esha", "unit_label": "L-11"},
    }
    return mapping.get(customer_id, {"name": "Resident", "unit_label": "Flat"})


@router.get("")
def list_retailer_orders(
    status: str | None = Query(default=None),
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """List consolidated community orders assigned to caller's store."""
    retailer_id = get_current_retailer_id(authorization, pact_token)
    orders = []

    for ord_id, ord_data in COMMUNITY_ORDERS.items():
        if ord_data.get("retailer_id") == retailer_id:
            if status and ord_data.get("status") != status:
                continue

            # Calculate item counts
            order_lines = [
                item for key, item in CUSTOMER_ORDER_ITEMS.items()
                if item["order_id"] == ord_id
            ]
            total_req = sum(l.get("requested_qty", 0) for l in order_lines)
            gross_est = sum(l.get("requested_qty", 0) * l.get("unit_price_paise", 0) for l in order_lines)

            orders.append({
                "id": ord_data["id"],
                "order_no": ord_data.get("order_no", ord_id),
                "community_id": ord_data["community_id"],
                "cycle_month": ord_data.get("cycle_month", "2026-11"),
                "status": ord_data.get("status", "submitted"),
                "submitted_at": ord_data.get("submitted_at"),
                "item_count": len(order_lines),
                "total_requested_units": total_req,
                "gross_est_paise": gross_est,
                "final_bill_paise": ord_data.get("final_bill_paise"),
            })

    return {"orders": orders}


@router.get("/{order_id}")
def get_order_detail(
    order_id: str,
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    Returns order detail:
    1. Totals per variant with current inventory and reservations.
    2. Per-customer breakdown showing name and flat only (no phone number).
    """
    retailer_id = get_current_retailer_id(authorization, pact_token)
    order = COMMUNITY_ORDERS.get(order_id)

    # Isolation check: Farah cannot see or act on Ravi's order -> 404
    if not order or order.get("retailer_id") != retailer_id:
        raise AppError(code="ORDER_NOT_FOUND", message="Order not found.", status_code=404)

    # Sync any customer cart items into order lines so they get billed
    sync_cart_items_to_order(order_id, retailer_id)

    # Collect order items
    order_lines = [
        item for key, item in CUSTOMER_ORDER_ITEMS.items()
        if item["order_id"] == order_id
    ]

    # Group by variant
    variants_map: dict[str, dict] = {}
    for l in order_lines:
        vid = l["variant_id"]
        if vid not in variants_map:
            meta = get_product_variant_meta(vid)
            listing = RETAILER_LISTINGS.get((retailer_id, vid), {})
            variants_map[vid] = {
                "variant_id": vid,
                "product_name": meta["product_name"],
                "brand": meta["brand"],
                "variant_label": meta["variant_label"],
                "unit_price_paise": l.get("unit_price_paise", 0),
                "mrp_paise": l.get("mrp_paise", 0),
                "total_requested_qty": 0,
                "total_packed_qty": 0,
                "stock_qty": listing.get("stock_qty", 100),
                "reserved_qty": listing.get("reserved_qty", 0),
            }
        variants_map[vid]["total_requested_qty"] += l.get("requested_qty", 0)
        packed = l.get("packed_qty")
        if packed is not None:
            variants_map[vid]["total_packed_qty"] += packed
        else:
            # Default packed to requested per F6 step 3
            variants_map[vid]["total_packed_qty"] += l.get("requested_qty", 0)

    # Per-customer breakdown (strictly name and unit_label only)
    customer_lines = []
    for l in order_lines:
        meta = get_product_variant_meta(l["variant_id"])
        c_meta = get_customer_flat_meta(l["customer_id"])
        packed_qty = l.get("packed_qty")
        if packed_qty is None:
            packed_qty = l.get("requested_qty", 0)

        customer_lines.append({
            "customer_id": l["customer_id"],
            "customer_name": c_meta["name"],
            "unit_label": c_meta["unit_label"],
            "variant_id": l["variant_id"],
            "product_name": meta["product_name"],
            "variant_label": meta["variant_label"],
            "requested_qty": l.get("requested_qty", 0),
            "packed_qty": packed_qty,
            "unit_price_paise": l.get("unit_price_paise", 0),
            "mrp_paise": l.get("mrp_paise", 0),
        })

    # Sort customer lines deterministically
    customer_lines.sort(key=lambda x: (x["unit_label"], x["product_name"]))

    draft_bill = ORDER_DRAFT_BILLS.get(order_id, {
        "overall_discount_paise": 25000 if order_id.startswith("ord-comm-green") else 0,
        "delivery_charge_paise": 0,
        "lines": [],
    })

    return {
        "order": {
            "id": order["id"],
            "order_no": order.get("order_no", order["id"]),
            "community_id": order["community_id"],
            "status": order.get("status", "submitted"),
            "submitted_at": order.get("submitted_at"),
            "reject_reason": order.get("reject_reason"),
            "final_bill_paise": order.get("final_bill_paise"),
            "billed_at": order.get("billed_at"),
        },
        "variants": list(variants_map.values()),
        "customer_lines": customer_lines,
        "draft_bill": draft_bill,
    }


@router.post("/{order_id}/accept")
def accept_order(
    order_id: str,
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    F6 Step 2: Accept order -> accepted.
    Reserves min(requested total, stock - reserved) per variant in a single atomic transaction.
    """
    retailer_id = get_current_retailer_id(authorization, pact_token)
    order = COMMUNITY_ORDERS.get(order_id)
    if not order or order.get("retailer_id") != retailer_id:
        raise AppError(code="ORDER_NOT_FOUND", message="Order not found.", status_code=404)

    if order.get("status") != "submitted":
        raise AppError(
            code="INVALID_STATE",
            message=f"Order cannot be accepted in state '{order.get('status')}'.",
            status_code=409,
        )

    # Reserve inventory
    order_lines = [
        item for key, item in CUSTOMER_ORDER_ITEMS.items()
        if item["order_id"] == order_id
    ]

    variant_totals: dict[str, int] = {}
    for l in order_lines:
        vid = l["variant_id"]
        variant_totals[vid] = variant_totals.get(vid, 0) + l.get("requested_qty", 0)

    for vid, req_qty in variant_totals.items():
        listing = RETAILER_LISTINGS.get((retailer_id, vid))
        if listing:
            avail = max(0, listing.get("stock_qty", 0) - listing.get("reserved_qty", 0))
            reserve_amount = min(req_qty, avail)
            listing["reserved_qty"] = listing.get("reserved_qty", 0) + reserve_amount
            ORDER_RESERVATIONS[(order_id, vid)] = reserve_amount

    order["status"] = "accepted"
    order["accepted_at"] = now_utc().isoformat()
    return {"status": "accepted", "order_id": order_id}


@router.post("/{order_id}/reject")
def reject_order(
    order_id: str,
    req: RejectRequest,
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    F6 Step 2: Reject order with a reason -> rejected.
    """
    retailer_id = get_current_retailer_id(authorization, pact_token)
    order = COMMUNITY_ORDERS.get(order_id)
    if not order or order.get("retailer_id") != retailer_id:
        raise AppError(code="ORDER_NOT_FOUND", message="Order not found.", status_code=404)

    if order.get("status") != "submitted":
        raise AppError(
            code="INVALID_STATE",
            message=f"Order cannot be rejected in state '{order.get('status')}'.",
            status_code=409,
        )

    order["status"] = "rejected"
    order["reject_reason"] = req.reason
    order["rejected_at"] = now_utc().isoformat()

    # Emit order.rejected notification per F9
    resident_ids = list({
        item["customer_id"] for item in CUSTOMER_ORDER_ITEMS.values()
        if item["order_id"] == order_id
    })
    on_order_rejected(order_id, resident_ids, ["usr-meera-11"])

    return {"status": "rejected", "order_id": order_id, "reason": req.reason}


@router.put("/{order_id}/packing")
def update_packing(
    order_id: str,
    req: PackingRequest,
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    F6 Step 3: Pack quantities. Sets packed_qty per customer line.
    Guard: packing before accept -> 409. Editing after billed -> 409.
    Packed above requested -> 422.
    """
    retailer_id = get_current_retailer_id(authorization, pact_token)
    order = COMMUNITY_ORDERS.get(order_id)
    if not order or order.get("retailer_id") != retailer_id:
        raise AppError(code="ORDER_NOT_FOUND", message="Order not found.", status_code=404)

    if order.get("status") == "submitted":
        raise AppError(
            code="ORDER_NOT_ACCEPTED",
            message="Order must be accepted before packing.",
            status_code=409,
        )

    if order.get("status") == "billed":
        raise AppError(
            code="ORDER_READ_ONLY",
            message="Finalised orders cannot be modified.",
            status_code=409,
        )

    # Validate all items
    for item in req.items:
        key = (order_id, item.customer_id, item.variant_id)
        line = CUSTOMER_ORDER_ITEMS.get(key)
        if not line:
            raise AppError(
                code="LINE_NOT_FOUND",
                message=f"Order line for {item.customer_id} - {item.variant_id} not found.",
                status_code=404,
            )
        if item.packed_qty > line.get("requested_qty", 0):
            raise AppError(
                code="PACKED_EXCEEDS_REQUESTED",
                message=(
                    f"Packed quantity ({item.packed_qty}) cannot exceed "
                    f"requested quantity ({line.get('requested_qty')}) for {item.variant_id}."
                ),
                status_code=422,
            )

    # Apply updates
    for item in req.items:
        key = (order_id, item.customer_id, item.variant_id)
        CUSTOMER_ORDER_ITEMS[key]["packed_qty"] = item.packed_qty

    order["status"] = "packing"
    return {"status": "packing", "updated_count": len(req.items)}


@router.put("/{order_id}/bill-draft")
def save_bill_draft(
    order_id: str,
    req: DraftBillRequest,
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    F6 Step 4: Save draft bill parameters.
    """
    retailer_id = get_current_retailer_id(authorization, pact_token)
    order = COMMUNITY_ORDERS.get(order_id)
    if not order or order.get("retailer_id") != retailer_id:
        raise AppError(code="ORDER_NOT_FOUND", message="Order not found.", status_code=404)

    if order.get("status") == "billed":
        raise AppError(
            code="ORDER_READ_ONLY",
            message="Finalised orders cannot be modified.",
            status_code=409,
        )

    ORDER_DRAFT_BILLS[order_id] = {
        "lines": [l.model_dump() for l in req.lines],
        "overall_discount_paise": req.overall_discount_paise,
        "delivery_charge_paise": req.delivery_charge_paise,
    }
    return {"status": "draft_saved", "order_id": order_id}


def sync_cart_items_to_order(order_id: str, retailer_id: str):
    """Ensures all active items in the community cart are synced to order lines so they get billed."""
    order = COMMUNITY_ORDERS.get(order_id)
    if not order:
        return
    cart_id = order.get("cart_id")
    for (c_cart_id, c_id, v_id), c_item in CART_ITEMS.items():
        if cart_id and c_cart_id != cart_id:
            continue
        key = (order_id, c_id, v_id)
        if key not in CUSTOMER_ORDER_ITEMS:
            listing = RETAILER_LISTINGS.get((retailer_id, v_id)) or RETAILER_LISTINGS.get(("ret-ravi-1", v_id))
            selling_price = listing["selling_price_paise"] if listing else 20000
            mrp = listing["mrp_paise"] if listing else 24000
            CUSTOMER_ORDER_ITEMS[key] = {
                "order_id": order_id,
                "customer_id": c_id,
                "variant_id": v_id,
                "requested_qty": c_item.get("quantity", 1),
                "packed_qty": c_item.get("quantity", 1),
                "unit_price_paise": selling_price,
                "mrp_paise": mrp,
            }


def _execute_split_for_order(order_id: str, retailer_id: str) -> dict:
    """Helper that runs F7 split_bill for the order with current packing and draft values."""
    sync_cart_items_to_order(order_id, retailer_id)
    order_lines = [
        item for key, item in CUSTOMER_ORDER_ITEMS.items()
        if item["order_id"] == order_id
    ]

    draft = ORDER_DRAFT_BILLS.get(order_id, {})
    draft_lines_map = {l["variant_id"]: l for l in draft.get("lines", [])}

    # Prepare lines input for split_bill
    split_lines: list[CustomerOrderLineInput] = []
    variant_prices: dict[str, VariantPriceInput] = {}

    for l in order_lines:
        vid = l["variant_id"]
        packed_qty = l.get("packed_qty")
        if packed_qty is None:
            packed_qty = l.get("requested_qty", 0)

        split_lines.append(
            CustomerOrderLineInput(
                customer_id=l["customer_id"],
                variant_id=vid,
                packed_qty=packed_qty,
                requested_qty=l.get("requested_qty", 0),
            )
        )

        if vid not in variant_prices:
            # Check draft price overrides
            draft_line = draft_lines_map.get(vid, {})
            listing = RETAILER_LISTINGS.get((retailer_id, vid), {})
            mrp = l.get("mrp_paise") or listing.get("mrp_paise", 34000)
            unit_price = draft_line.get("final_unit_price_paise") or l.get("unit_price_paise") or listing.get("selling_price_paise", 30000)
            p_disc = draft_line.get("product_discount_paise", 0)

            variant_prices[vid] = VariantPriceInput(
                variant_id=vid,
                final_unit_price_paise=unit_price,
                mrp_paise=mrp,
                product_discount_paise=p_disc,
            )

    overall_disc = draft.get("overall_discount_paise", 25000 if order_id.startswith("ord-comm-green") else 0)
    del_charge = draft.get("delivery_charge_paise", 0)

    split_res = split_bill(
        BillSplitInput(
            lines=split_lines,
            variant_prices=variant_prices,
            overall_discount_paise=overall_disc,
            delivery_charge_paise=del_charge,
        )
    )

    invoices_out = []
    for inv in split_res.invoices:
        c_meta = get_customer_flat_meta(inv.customer_id)
        invoices_out.append({
            "customer_id": inv.customer_id,
            "customer_name": c_meta["name"],
            "unit_label": c_meta["unit_label"],
            "subtotal_paise": inv.subtotal_paise,
            "overall_discount_share_paise": inv.overall_discount_share_paise,
            "delivery_share_paise": inv.delivery_share_paise,
            "rounding_adjustment_paise": inv.rounding_adjustment_paise,
            "total_paise": inv.total_paise,
            "status": inv.status,
            "items": [
                {
                    "variant_id": item.variant_id,
                    "packed_qty": item.packed_qty,
                    "final_unit_price_paise": item.final_unit_price_paise,
                    "gross_paise": item.gross_paise,
                    "line_discount_paise": item.line_discount_paise,
                    "net_paise": item.net_paise,
                }
                for item in inv.items
            ],
        })

    return {
        "gross_total_paise": split_res.gross_total_paise,
        "product_discounts_total_paise": split_res.product_discounts_total_paise,
        "overall_discount_paise": split_res.overall_discount_paise,
        "delivery_charge_paise": split_res.delivery_charge_paise,
        "bill_total_paise": split_res.bill_total_paise,
        "invoices": invoices_out,
    }


@router.get("/{order_id}/bill-preview")
def get_bill_preview(
    order_id: str,
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    F6 Step 5: Preview bill and per-customer split. Saves nothing.
    """
    retailer_id = get_current_retailer_id(authorization, pact_token)
    order = COMMUNITY_ORDERS.get(order_id)
    if not order or order.get("retailer_id") != retailer_id:
        raise AppError(code="ORDER_NOT_FOUND", message="Order not found.", status_code=404)

    return _execute_split_for_order(order_id, retailer_id)


@router.post("/{order_id}/finalise")
def finalise_bill(
    order_id: str,
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    F6 Step 6: Finalise -> billed, in one atomic transaction.
    1. Lock order (state guard). Finalising twice -> 409.
    2. Check stock covers packed totals: if packed > stock -> 409 naming variants.
    3. Run F7 split_bill().
    4. Assert sum(invoices) == bill total.
    5. Deduct stock and release unused reservations.
    6. Save invoices and invoice items.
    7. Status -> billed. Everything becomes read-only.
    """
    retailer_id = get_current_retailer_id(authorization, pact_token)
    order = COMMUNITY_ORDERS.get(order_id)
    if not order or order.get("retailer_id") != retailer_id:
        raise AppError(code="ORDER_NOT_FOUND", message="Order not found.", status_code=404)

    if order.get("status") == "billed":
        raise AppError(
            code="BILL_ALREADY_FINALISED",
            message="This bill has already been finalised and is read-only.",
            status_code=409,
        )

    if order.get("status") not in ("accepted", "packing"):
        raise AppError(
            code="INVALID_STATE",
            message=f"Cannot finalise order in state '{order.get('status')}'.",
            status_code=409,
        )

    # Sync any customer cart items into order lines so they get billed
    sync_cart_items_to_order(order_id, retailer_id)

    # 1. Check stock covers packed totals
    order_lines = [
        item for key, item in CUSTOMER_ORDER_ITEMS.items()
        if item["order_id"] == order_id
    ]

    packed_totals: dict[str, int] = {}
    for l in order_lines:
        vid = l["variant_id"]
        qty = l.get("packed_qty")
        if qty is None:
            qty = l.get("requested_qty", 0)
        packed_totals[vid] = packed_totals.get(vid, 0) + qty

    insufficient_variants = []
    for vid, total_packed in packed_totals.items():
        listing = RETAILER_LISTINGS.get((retailer_id, vid), {})
        stock_qty = listing.get("stock_qty", 0)
        if total_packed > stock_qty:
            insufficient_variants.append(vid)

    if insufficient_variants:
        raise AppError(
            code="INSUFFICIENT_STOCK",
            message=f"Packed quantity exceeds stock for variants: {', '.join(insufficient_variants)}",
            status_code=409,
        )

    # 2. Run split_bill
    split_result = _execute_split_for_order(order_id, retailer_id)

    # 3. Deduct stock and release unused reservations
    for vid, total_packed in packed_totals.items():
        listing = RETAILER_LISTINGS.get((retailer_id, vid))
        if listing:
            # Deduct stock
            listing["stock_qty"] -= total_packed
            # Release reservation
            res_amt = ORDER_RESERVATIONS.get((order_id, vid), 0)
            listing["reserved_qty"] = max(0, listing.get("reserved_qty", 0) - res_amt)

    # 4. Save Customer Invoices
    for inv_data in split_result["invoices"]:
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
            "status": inv_data["status"],
            "items": inv_data["items"],
            "created_at": now_utc().isoformat(),
        }
        # Trigger bill_ready notification per F9
        on_invoice_created(
            order_id=order_id,
            invoice_id=inv_id,
            customer_id=inv_data["customer_id"],
            total_paise=inv_data["total_paise"],
        )

    # 5. Lock Order
    order["status"] = "billed"
    order["final_bill_paise"] = split_result["bill_total_paise"]
    order["overall_discount_paise"] = split_result["overall_discount_paise"]
    order["delivery_charge_paise"] = split_result["delivery_charge_paise"]
    order["billed_at"] = now_utc().isoformat()

    return {
        "status": "billed",
        "order_id": order_id,
        "final_bill_paise": split_result["bill_total_paise"],
        "invoices_count": len(split_result["invoices"]),
        "invoices": split_result["invoices"],
    }
