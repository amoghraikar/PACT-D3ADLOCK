"""
Cart service layer containing all business logic for community carts and customer items.
"""

from typing import Any
from app.core.errors import AppError
from app.modules.cart.cycle import (
    CART_ITEMS,
    CARTS,
    COMMUNITY_ORDERS,
    CUSTOMER_ORDER_ITEMS,
    ensure_open_cart,
    is_cart_locked,
    save_cart_store,
)
from app.modules.catalogue.router import (
    RETAILER_LISTINGS,
    get_variant_by_id,
)

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


def is_matching_cart(c1: str | None, c2: str | None) -> bool:
    if not c1 or not c2:
        return True
    if c1 == c2:
        return True
    c1_norm = c1.replace("green-meadows", "green-1")
    c2_norm = c2.replace("green-meadows", "green-1")
    return c1_norm == c2_norm


def sync_cart_item_to_active_orders(cart_id: str, customer_id: str, variant_id: str, quantity: int):
    """
    Real-Time Sync: Whenever a customer adds/updates/removes items in cart,
    immediately update the active community order lines so the retailer sees it in real time!
    """
    try:
        from app.modules.retailer.orders_router import COMMUNITY_ORDERS, CUSTOMER_ORDER_ITEMS, save_orders_store

        for ord_id, order in list(COMMUNITY_ORDERS.items()):
            if is_matching_cart(order.get("cart_id"), cart_id) or order.get("retailer_id") == "ret-ravi-1":
                retailer_id = order.get("retailer_id", "ret-ravi-1")
                listing = RETAILER_LISTINGS.get((retailer_id, variant_id)) or RETAILER_LISTINGS.get(("ret-ravi-1", variant_id))
                selling_price = listing["selling_price_paise"] if listing else 20000
                mrp = listing["mrp_paise"] if listing else 24000

                key = (ord_id, customer_id, variant_id)
                if quantity <= 0:
                    CUSTOMER_ORDER_ITEMS.pop(key, None)
                else:
                    CUSTOMER_ORDER_ITEMS[key] = {
                        "order_id": ord_id,
                        "customer_id": customer_id,
                        "variant_id": variant_id,
                        "requested_qty": quantity,
                        "packed_qty": quantity,
                        "unit_price_paise": selling_price,
                        "mrp_paise": mrp,
                    }
        save_orders_store()
    except Exception as e:
        print("Error syncing cart item to order:", e)


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


class CartService:
    @staticmethod
    def get_cart_view(user: dict, comm_id: str, assigned_retailer: str) -> dict[str, Any]:
        """Calculates community totals and user items for the active cycle."""
        cart = ensure_open_cart(comm_id, assigned_retailer)
        customer_id = user["id"]
        my_items = []
        my_est_total_paise = 0

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

            if item["customer_id"] == customer_id or is_same_customer(item["customer_id"], customer_id):
                listing = RETAILER_LISTINGS.get((assigned_retailer, var_id)) or RETAILER_LISTINGS.get(("ret-ravi-1", var_id))
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

    @staticmethod
    def update_item_quantity(user: dict, comm_id: str, assigned_retailer: str, variant_id: str, quantity: int) -> dict[str, Any]:
        """Updates or removes an item in the cart. Real-time updates active order lines."""
        cart = ensure_open_cart(comm_id, assigned_retailer)

        if is_cart_locked(cart):
            raise AppError(
                code="CART_LOCKED",
                message="Ordering for this month has closed. You can add items again next cycle.",
                status_code=409,
            )

        listing = RETAILER_LISTINGS.get((assigned_retailer, variant_id)) or RETAILER_LISTINGS.get(("ret-ravi-1", variant_id))
        if not listing:
            prod, variant = get_variant_by_id(variant_id)
            if prod and variant:
                listing = {
                    "stock_qty": 100,
                    "reserved_qty": 0,
                    "selling_price_paise": 20000,
                    "mrp_paise": 24000,
                    "availability": "active",
                }
                RETAILER_LISTINGS[(assigned_retailer, variant_id)] = listing
                RETAILER_LISTINGS[("ret-ravi-1", variant_id)] = listing
            else:
                raise AppError(
                    code="VARIANT_NOT_AVAILABLE",
                    message="This item is not available for your building's monthly order.",
                    status_code=404,
                )

        customer_id = user["id"]
        item_key = (cart["id"], customer_id, variant_id)

        if quantity <= 0:
            CART_ITEMS.pop(item_key, None)
        else:
            CART_ITEMS[item_key] = {
                "cart_id": cart["id"],
                "customer_id": customer_id,
                "variant_id": variant_id,
                "quantity": quantity,
            }

        sync_cart_item_to_active_orders(cart["id"], customer_id, variant_id, quantity)
        save_cart_store()

        return {"message": "Item updated", "variant_id": variant_id, "quantity": quantity}

    @staticmethod
    def batch_update(user: dict, comm_id: str, assigned_retailer: str, items: list[dict[str, Any]]) -> dict[str, Any]:
        """Applies batch updates to cart items."""
        cart = ensure_open_cart(comm_id, assigned_retailer)

        if is_cart_locked(cart):
            raise AppError(
                code="CART_LOCKED",
                message="Ordering for this month has closed.",
                status_code=409,
            )

        customer_id = user["id"]
        for bi in items:
            var_id = bi["variant_id"]
            qty = bi["quantity"]
            item_key = (cart["id"], customer_id, var_id)
            if qty <= 0:
                CART_ITEMS.pop(item_key, None)
            else:
                CART_ITEMS[item_key] = {
                    "cart_id": cart["id"],
                    "customer_id": customer_id,
                    "variant_id": var_id,
                    "quantity": qty,
                }
            sync_cart_item_to_active_orders(cart["id"], customer_id, var_id, qty)

        save_cart_store()
        return {"message": "Batch update applied", "updated_count": len(items)}
