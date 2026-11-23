
from app.core.clock import now_utc
from app.modules.cart.cycle import (
    CART_ITEMS,
    CARTS,
    COMMUNITY_ORDERS,
    CUSTOMER_ORDER_ITEMS,
)
from app.modules.catalogue.router import RETAILER_LISTINGS
from app.modules.notifications.handlers import on_order_submitted


def perform_cutoff_for_cart(cart: dict) -> dict | None:
    """
    Executes the 5 cutoff steps from F4 in one atomic operation:
    1. Lock the cart row; set locked.
    2. No items -> closed_empty; stop.
    3. Create the community_orders row (submitted) with UNIQUE(cart_id) idempotency.
    4. Copy cart lines into customer_order_items with requested_qty and price snapshots.
    5. Set the cart submitted; emit order.submitted.
    """
    cart_id = cart["id"]

    # Idempotency check: if cart is already submitted, return existing order
    if cart.get("status") == "submitted":
        for ord_row in COMMUNITY_ORDERS.values():
            if ord_row["cart_id"] == cart_id:
                return ord_row

    if cart.get("status") == "closed_empty":
        return None

    # Step 1: Lock cart
    cart["status"] = "locked"

    # Find active items for this cart
    active_items = [
        item for item in CART_ITEMS.values()
        if item["cart_id"] == cart_id and item.get("quantity", 0) > 0
    ]

    # Step 2: If no items, mark closed_empty and stop
    if not active_items:
        cart["status"] = "closed_empty"
        return None

    # Step 3: Create order (submitted) with UNIQUE(cart_id)
    order_id = f"ord-{cart['community_id']}-{cart['cycle_month']}"
    if order_id in COMMUNITY_ORDERS:
        return COMMUNITY_ORDERS[order_id]

    comm_code = cart["community_id"].replace("comm-", "").upper()
    cycle_num = cart["cycle_month"].replace("-", "")
    order_no = f"ORD-{comm_code}-{cycle_num}-001"

    order = {
        "id": order_id,
        "cart_id": cart_id,
        "community_id": cart["community_id"],
        "retailer_id": cart["retailer_id"],
        "order_no": order_no,
        "status": "submitted",
        "submitted_at": now_utc().isoformat(),
        "item_count": len(active_items),
    }
    COMMUNITY_ORDERS[order_id] = order

    # Step 4: Copy every cart line into customer_order_items with price snapshots
    for item in active_items:
        listing = RETAILER_LISTINGS.get((cart["retailer_id"], item["variant_id"]))
        selling_price_paise = listing["selling_price_paise"] if listing else 0
        mrp_paise = listing["mrp_paise"] if listing else 0

        key = (order_id, item["customer_id"], item["variant_id"])
        CUSTOMER_ORDER_ITEMS[key] = {
            "order_id": order_id,
            "customer_id": item["customer_id"],
            "variant_id": item["variant_id"],
            "requested_qty": item["quantity"],
            "packed_qty": None,
            "unit_price_paise": selling_price_paise,
            "mrp_paise": mrp_paise,
        }

    # Step 5: Set cart submitted and emit order.submitted per F4 / F9
    cart["status"] = "submitted"
    resident_ids = list({item["customer_id"] for item in active_items})
    on_order_submitted(
        order_id=order_id,
        community_name="Green Meadows Apartments",
        retailer_user_id="usr-ravi-21",
        resident_user_ids=resident_ids,
    )
    return order


def run_cycle_tick() -> list[dict]:
    """
    Scans all open carts where now_utc() >= locks_at and executes cutoff.
    """
    now = now_utc()
    created_orders = []

    for cart in list(CARTS.values()):
        if cart.get("status") == "open" and now >= cart["locks_at"]:
            order = perform_cutoff_for_cart(cart)
            if order:
                created_orders.append(order)

    return created_orders
