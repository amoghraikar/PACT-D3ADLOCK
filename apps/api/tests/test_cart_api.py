from datetime import datetime

from fastapi.testclient import TestClient

from app.core.clock import BUSINESS_TZ, set_clock_override
from app.core.config import settings
from app.main import app
from app.modules.cart.cycle import CART_ITEMS, CARTS, COMMUNITY_ORDERS, CUSTOMER_ORDER_ITEMS

client = TestClient(app)


def _login_as(phone: str) -> str:
    """Helper to verify OTP and return session cookie value."""
    client.post(f"{settings.API_PREFIX}/auth/otp/request", json={"phone": phone})
    res = client.post(
        f"{settings.API_PREFIX}/auth/otp/verify",
        json={"phone": phone, "code": "000000"},
    )
    assert res.status_code == 200
    return res.cookies[settings.SESSION_COOKIE_NAME]


def test_golden_scenario_g_cart_and_isolation():
    # Reset clock to open cycle (e.g. 15th Nov 2026)
    set_clock_override(datetime(2026, 11, 15, 12, 0, 0, tzinfo=BUSINESS_TZ))
    CARTS.clear()
    CART_ITEMS.clear()
    COMMUNITY_ORDERS.clear()
    CUSTOMER_ORDER_ITEMS.clear()

    # 1. Seed Golden Scenario G lines via dev helper
    res = client.post(f"{settings.API_PREFIX}/dev/seed/golden")
    assert res.status_code == 200

    # 2. Asha inspects her cart
    asha_cookie = _login_as("+919999900001")
    res = client.get(
        f"{settings.API_PREFIX}/cart",
        cookies={settings.SESSION_COOKIE_NAME: asha_cookie},
    )
    assert res.status_code == 200
    data = res.json()

    # Asha's 4 lines: Rice 5kg x 1, Sugar 1kg x 2, Sunflower Oil 1L x 1, Toor Dal 500g x 1
    assert len(data["my_items"]) == 4
    # Asha's estimated total: 300 + 150 + 250 + 100 = ₹800 (80000 paise)
    assert data["my_est_total_paise"] == 80000

    # Building community totals (anonymous)
    comm = data["community"]
    assert comm["participants"] == 4  # Asha, Bharat, Chitra, Dev

    # Find Sona Masoori Rice in community items
    rice_item = next(i for i in comm["items"] if i["name"] == "Sona Masoori Rice")
    # Total quantity: Asha(1) + Bharat(2) + Chitra(1) + Dev(2) = 6 packs
    assert rice_item["total_quantity"] == 6
    # Total base: 6 * 5 kg = 30 kg
    assert rice_item["total_base"] == "30 kg"

    # 3. Bharat inspects his cart
    bharat_cookie = _login_as("+919999900002")
    res = client.get(
        f"{settings.API_PREFIX}/cart",
        cookies={settings.SESSION_COOKIE_NAME: bharat_cookie},
    )
    assert res.status_code == 200
    b_data = res.json()
    # Bharat has only Rice 5kg x 2
    assert len(b_data["my_items"]) == 1
    assert b_data["my_items"][0]["quantity"] == 2
    assert b_data["my_est_total_paise"] == 60000  # ₹600

    # Bharat sees NO resident names, only the same anonymous building aggregates
    assert b_data["community"]["participants"] == 4


def test_cart_item_upsert_and_removal():
    set_clock_override(datetime(2026, 11, 15, 12, 0, 0, tzinfo=BUSINESS_TZ))
    asha_cookie = _login_as("+919999900001")

    # Add 2 packs of Toor Dal (500 g)
    res = client.put(
        f"{settings.API_PREFIX}/cart/items/var-dal-toor-500g",
        json={"quantity": 2},
        cookies={settings.SESSION_COOKIE_NAME: asha_cookie},
    )
    assert res.status_code == 200

    # Verify
    cookies = {settings.SESSION_COOKIE_NAME: asha_cookie}
    res = client.get(f"{settings.API_PREFIX}/cart", cookies=cookies)
    item = next(i for i in res.json()["my_items"] if i["variant_id"] == "var-dal-toor-500g")
    assert item["quantity"] == 2

    # Setting quantity 0 removes it
    res = client.put(
        f"{settings.API_PREFIX}/cart/items/var-dal-toor-500g",
        json={"quantity": 0},
        cookies=cookies,
    )
    assert res.status_code == 200

    # Verify removed
    res = client.get(f"{settings.API_PREFIX}/cart", cookies=cookies)
    assert not any(i["variant_id"] == "var-dal-toor-500g" for i in res.json()["my_items"])


def test_clock_cutoff_and_cart_locked_409():
    asha_cookie = _login_as("+919999900001")
    from app.modules.cart.cycle import get_cycle_boundaries
    from datetime import timedelta
    _, _, locks_at = get_cycle_boundaries()

    # 1. 1 second before cutoff in UTC, write succeeds
    set_clock_override(locks_at - timedelta(seconds=1))
    res = client.put(
        f"{settings.API_PREFIX}/cart/items/var-sugar-1kg",
        json={"quantity": 3},
        cookies={settings.SESSION_COOKIE_NAME: asha_cookie},
    )
    assert res.status_code == 200

    # 2. At cutoff (or after), write answers 409 CART_LOCKED
    set_clock_override(locks_at + timedelta(seconds=1))
    res = client.put(
        f"{settings.API_PREFIX}/cart/items/var-sugar-1kg",
        json={"quantity": 4},
        cookies={settings.SESSION_COOKIE_NAME: asha_cookie},
    )
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "CART_LOCKED"


def test_p11_cutoff_bulk_order_and_idempotency():
    # Setup G scenario
    set_clock_override(datetime(2026, 11, 15, 12, 0, 0, tzinfo=BUSINESS_TZ))
    CARTS.clear()
    CART_ITEMS.clear()
    COMMUNITY_ORDERS.clear()
    CUSTOMER_ORDER_ITEMS.clear()
    client.post(f"{settings.API_PREFIX}/dev/seed/golden")

    # Move clock past cutoff (25 Nov 00:05:00 IST)
    set_clock_override(datetime(2026, 11, 25, 0, 5, 0, tzinfo=BUSINESS_TZ))

    # Run cutoff
    res = client.post(
        f"{settings.API_PREFIX}/dev/cycle/lock-now",
        json={"community_id": "comm-green-1"},
    )
    assert res.status_code == 200
    order_data = res.json()["order"]
    assert order_data["status"] == "submitted"
    assert order_data["item_count"] == 9  # 9 customer lines in G

    # Cutoff idempotency: running again returns same order without duplicates
    res2 = client.post(
        f"{settings.API_PREFIX}/dev/cycle/lock-now",
        json={"community_id": "comm-green-1"},
    )
    assert res2.status_code == 200
    assert res2.json()["order"]["id"] == order_data["id"]
    assert len(COMMUNITY_ORDERS) == 1

    # Check order for Asha via GET /orders/current
    asha_cookie = _login_as("+919999900001")
    res = client.get(
        f"{settings.API_PREFIX}/orders/current",
        cookies={settings.SESSION_COOKIE_NAME: asha_cookie},
    )
    assert res.status_code == 200
    lines = res.json()["order"]["my_lines"]
    assert len(lines) == 4
    # Asha's prices are snapshotted
    rice_line = next(line for line in lines if line["variant_id"] == "var-rice-sona-5kg")
    assert rice_line["requested_qty"] == 1
    assert rice_line["unit_price_paise"] == 30000
    assert rice_line["mrp_paise"] == 34000
