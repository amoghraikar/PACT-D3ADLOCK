
from fastapi import APIRouter, Cookie, Header, status
from pydantic import BaseModel, Field

from app.core.errors import AppError
from app.modules.auth.router import get_user_from_token
from app.modules.cart.cycle import (
    CART_ITEMS,
    COMMUNITY_ORDERS,
    CUSTOMER_ORDER_ITEMS,
    ensure_open_cart,
    is_cart_locked,
)
from app.modules.catalogue.router import (
    RETAILER_LISTINGS,
    get_variant_by_id,
)

router = APIRouter(prefix="/cart", tags=["cart"])
orders_router = APIRouter(prefix="/orders", tags=["orders"])


class CartItemUpdateIn(BaseModel):
    quantity: int = Field(..., ge=0, description="Packs to add (0 removes)")


class BatchCartItem(BaseModel):
    variant_id: str
    quantity: int = Field(..., ge=0)


class BatchCartIn(BaseModel):
    items: list[BatchCartItem]


def format_base_unit(total_base_qty: int, unit: str) -> str:
    """Formats base quantities like 30000g -> '30 kg', 1000ml -> '1 L'."""
    if unit in ("g", "kg"):
        if total_base_qty >= 1000 and total_base_qty % 1000 == 0:
            return f"{total_base_qty // 1000} kg"
        elif total_base_qty >= 1000:
            return f"{total_base_qty / 1000:.1f} kg".rstrip("0").rstrip(".")
        return f"{total_base_qty} g"
    elif unit in ("ml", "l"):
        if total_base_qty >= 1000 and total_base_qty % 1000 == 0:
            return f"{total_base_qty // 1000} L"
        elif total_base_qty >= 1000:
            return f"{total_base_qty / 1000:.1f} L".rstrip("0").rstrip(".")
        return f"{total_base_qty} ml"
    return f"{total_base_qty} pcs"


def _get_current_user_and_community(pact_session: str | None, authorization: str | None):
    token = pact_session
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]

    user = get_user_from_token(token)
    if not user:
        raise AppError(
            code="UNAUTHORIZED",
            message="Sign-in required to view cart.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    comm_id = user.get("community_id", "comm-green-1")
    # Sri Lakshmi Stores serves Green Meadows; Daily Needs Mart serves Lakeview
    assigned_retailer = "ret-ravi-1" if comm_id == "comm-green-1" else "ret-farah-2"

    return user, comm_id, assigned_retailer


@router.get("")
def get_cart(
    pact_session: str | None = Cookie(None),
    authorization: str | None = Header(None),
):
    user, comm_id, assigned_retailer = _get_current_user_and_community(pact_session, authorization)

    # 1. Ensure open cart exists for community
    cart = ensure_open_cart(comm_id, assigned_retailer)

    # 2. Get customer's own lines
    customer_id = user["id"]
    my_items = []
    my_est_total_paise = 0

    # 3. Community aggregations: variant_id -> { total_quantity, total_base_qty }
    community_counts: dict[str, dict] = {}
    participant_set = set()

    for item in CART_ITEMS.values():
        if item["cart_id"] != cart["id"] or item["quantity"] <= 0:
            continue

        var_id = item["variant_id"]
        qty = item["quantity"]
        participant_set.add(item["customer_id"])

        prod, variant = get_variant_by_id(var_id)
        if not prod or not variant:
            continue

        # Accumulate community totals
        base_delta = variant.get("base_qty", 0) * qty
        if var_id not in community_counts:
            community_counts[var_id] = {
                "name": prod["name"],
                "variant_label": variant["label"],
                "total_quantity": 0,
                "total_base_qty": 0,
                "base_unit": variant.get("base_unit", "g"),
            }
        community_counts[var_id]["total_quantity"] += qty
        community_counts[var_id]["total_base_qty"] += base_delta

        # If caller's own line, include in my_items
        if item["customer_id"] == customer_id:
            listing = RETAILER_LISTINGS.get((assigned_retailer, var_id))
            est_unit_price = listing["selling_price_paise"] if listing else 0
            mrp_paise = listing["mrp_paise"] if listing else 0
            est_line_paise = est_unit_price * qty
            my_est_total_paise += est_line_paise

            my_items.append({
                "variant_id": var_id,
                "name": prod["name"],
                "brand": prod["brand"],
                "variant_label": variant["label"],
                "quantity": qty,
                "est_unit_price_paise": est_unit_price,
                "mrp_paise": mrp_paise,
                "est_line_paise": est_line_paise,
            })

    # Prepare anonymous community block per F4
    community_items = []
    for count_info in community_counts.values():
        community_items.append({
            "name": count_info["name"],
            "variant_label": count_info["variant_label"],
            "total_quantity": count_info["total_quantity"],
            "total_base": format_base_unit(
                count_info["total_base_qty"], count_info["base_unit"]
            ),
        })

    locks_str = (
        cart["locks_at"].isoformat()
        if hasattr(cart["locks_at"], "isoformat")
        else str(cart["locks_at"])
    )
    return {
        "cycle_month": cart["cycle_month"],
        "status": cart["status"],
        "locks_at": locks_str,
        "my_items": my_items,
        "my_est_total_paise": my_est_total_paise,
        "community": {
            "participants": len(participant_set),
            "items": community_items,
        },
    }


@router.put("/items/{variant_id}")
def update_cart_item(
    variant_id: str,
    body: CartItemUpdateIn,
    pact_session: str | None = Cookie(None),
    authorization: str | None = Header(None),
):
    user, comm_id, assigned_retailer = _get_current_user_and_community(pact_session, authorization)
    cart = ensure_open_cart(comm_id, assigned_retailer)

    # Rule: Open cart only, before locks_at per F4 / D4
    if is_cart_locked(cart):
        raise AppError(
            code="CART_LOCKED",
            message="Ordering for this month has closed. You can add items again from 1 Dec.",
            status_code=status.HTTP_409_CONFLICT,
        )

    # Rule: Visible variants only (listed in assigned store)
    listing = RETAILER_LISTINGS.get((assigned_retailer, variant_id))
    if not listing or listing.get("availability") != "active":
        raise AppError(
            code="VARIANT_NOT_AVAILABLE",
            message="This item is not available for your building's monthly order.",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    customer_id = user["id"]
    item_key = (cart["id"], customer_id, variant_id)

    # Quantity 0 removes per F4
    if body.quantity == 0:
        CART_ITEMS.pop(item_key, None)
        return {"message": "Item removed", "variant_id": variant_id, "quantity": 0}

    # Upsert
    CART_ITEMS[item_key] = {
        "cart_id": cart["id"],
        "customer_id": customer_id,
        "variant_id": variant_id,
        "quantity": body.quantity,
    }

    return {"message": "Item updated", "variant_id": variant_id, "quantity": body.quantity}


@router.delete("/items/{variant_id}")
def delete_cart_item(
    variant_id: str,
    pact_session: str | None = Cookie(None),
    authorization: str | None = Header(None),
):
    user, comm_id, assigned_retailer = _get_current_user_and_community(pact_session, authorization)
    cart = ensure_open_cart(comm_id, assigned_retailer)

    if is_cart_locked(cart):
        raise AppError(
            code="CART_LOCKED",
            message="Ordering for this month has closed.",
            status_code=status.HTTP_409_CONFLICT,
        )

    customer_id = user["id"]
    item_key = (cart["id"], customer_id, variant_id)
    CART_ITEMS.pop(item_key, None)
    return {"message": "Item removed", "variant_id": variant_id}


@router.post("/items:batch")
def batch_update_cart(
    body: BatchCartIn,
    pact_session: str | None = Cookie(None),
    authorization: str | None = Header(None),
):
    user, comm_id, assigned_retailer = _get_current_user_and_community(pact_session, authorization)
    cart = ensure_open_cart(comm_id, assigned_retailer)

    if is_cart_locked(cart):
        raise AppError(
            code="CART_LOCKED",
            message="Ordering for this month has closed.",
            status_code=status.HTTP_409_CONFLICT,
        )

    # Validate all items first (all or nothing per F4)
    for bi in body.items:
        listing = RETAILER_LISTINGS.get((assigned_retailer, bi.variant_id))
        if not listing or listing.get("availability") != "active":
            raise AppError(
                code="VARIANT_NOT_AVAILABLE",
                message=f"Item {bi.variant_id} is not available in your community catalogue.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

    # Apply updates
    customer_id = user["id"]
    for bi in body.items:
        item_key = (cart["id"], customer_id, bi.variant_id)
        if bi.quantity == 0:
            CART_ITEMS.pop(item_key, None)
        else:
            CART_ITEMS[item_key] = {
                "cart_id": cart["id"],
                "customer_id": customer_id,
                "variant_id": bi.variant_id,
                "quantity": bi.quantity,
            }

    return {"message": "Batch update applied", "updated_count": len(body.items)}


@orders_router.get("/current")
def get_current_order(
    pact_session: str | None = Cookie(None),
    authorization: str | None = Header(None),
):
    user, comm_id, assigned_retailer = _get_current_user_and_community(pact_session, authorization)
    cart = ensure_open_cart(comm_id, assigned_retailer)

    # Find order for this cart
    found_order = None
    for ord_row in COMMUNITY_ORDERS.values():
        if ord_row["cart_id"] == cart["id"]:
            found_order = ord_row
            break

    if not found_order:
        return {"order": None}

    # Retrieve customer's lines in this order
    customer_id = user["id"]
    my_lines = []
    for key, order_item in CUSTOMER_ORDER_ITEMS.items():
        ord_id, c_id, v_id = key
        if ord_id == found_order["id"] and c_id == customer_id:
            prod, variant = get_variant_by_id(v_id)
            my_lines.append({
                "variant_id": v_id,
                "name": prod["name"] if prod else "",
                "variant_label": variant["label"] if variant else "",
                "requested_qty": order_item["requested_qty"],
                "packed_qty": order_item.get("packed_qty"),
                "unit_price_paise": order_item["unit_price_paise"],
                "mrp_paise": order_item["mrp_paise"],
            })

    return {
        "order": {
            "id": found_order["id"],
            "order_no": found_order["order_no"],
            "status": found_order["status"],
            "submitted_at": found_order["submitted_at"],
            "my_lines": my_lines,
        }
    }
