from datetime import datetime
from zoneinfo import ZoneInfo

from app.core.clock import BUSINESS_TZ, now_business, now_utc
from app.core.config import settings

# In-memory stores for Carts, Items, Orders, OrderItems
# Carts: cart_id -> dict
CARTS: dict[str, dict] = {}
# CartItems: (cart_id, customer_id, variant_id) -> dict
CART_ITEMS: dict[tuple[str, str, str], dict] = {}
# Orders: order_id -> dict
COMMUNITY_ORDERS: dict[str, dict] = {}
# CustomerOrderItems: (order_id, customer_id, variant_id) -> dict
CUSTOMER_ORDER_ITEMS: dict[tuple[str, str, str], dict] = {}


def get_cycle_boundaries(target_dt: datetime | None = None) -> tuple[str, datetime, datetime]:
    """
    Computes (cycle_month, opens_at, locks_at) based on D4:
    - Calendar month in Asia/Kolkata
    - Opens on 1st at 00:00:00 IST
    - Locks on 25th at 00:00:00 IST (last edit 24th at 23:59:59)
    """
    dt = target_dt or now_business()
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=BUSINESS_TZ)
    else:
        dt = dt.astimezone(BUSINESS_TZ)

    year = dt.year
    month = dt.month
    cycle_month = f"{year:04d}-{month:02d}"

    # Opens on the 1st at 00:00:00 IST
    opens_ist = datetime(year, month, 1, 0, 0, 0, tzinfo=BUSINESS_TZ)
    opens_at = opens_ist.astimezone(ZoneInfo("UTC"))

    # Locks on the cutoff day (25th) at 00:00:00 IST
    cutoff_day = settings.CYCLE_CUTOFF_DAY
    locks_ist = datetime(year, month, cutoff_day, 0, 0, 0, tzinfo=BUSINESS_TZ)
    locks_at = locks_ist.astimezone(ZoneInfo("UTC"))

    return cycle_month, opens_at, locks_at


def ensure_open_cart(community_id: str, assigned_retailer_id: str) -> dict:
    """
    Ensures an open cart exists for the community for the current cycle month.
    Snapshots the assigned store.
    """
    cycle_month, opens_at, locks_at = get_cycle_boundaries()

    for cart in CARTS.values():
        if cart["community_id"] == community_id and cart["cycle_month"] == cycle_month:
            return cart

    cart_id = f"cart-{community_id}-{cycle_month}"
    cart = {
        "id": cart_id,
        "community_id": community_id,
        "cycle_month": cycle_month,
        "retailer_id": assigned_retailer_id,
        "status": "open",
        "opens_at": opens_at,
        "locks_at": locks_at,
    }
    CARTS[cart_id] = cart
    return cart


def is_cart_locked(cart: dict) -> bool:
    """
    A cart is locked if its status is not 'open', or if current UTC time >= locks_at.
    """
    if cart["status"] != "open":
        return True
    return now_utc() >= cart["locks_at"]
