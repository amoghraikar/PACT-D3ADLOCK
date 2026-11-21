import pytest
from fastapi.testclient import TestClient

from app.core.security import create_session_token
from app.main import app
from app.modules.cart.cycle import (
    COMMUNITY_ORDERS,
    CUSTOMER_ORDER_ITEMS,
)
from app.modules.catalogue.router import RETAILER_LISTINGS
from app.modules.notifications.handlers import on_invoice_created
from app.modules.notifications.service import (
    clear_notifications_for_test,
    get_user_notifications,
)
from app.modules.retailer.orders_router import (
    INVOICES,
    ORDER_DRAFT_BILLS,
    ORDER_RESERVATIONS,
    finalise_bill,
)


@pytest.fixture(autouse=True)
def setup_teardown():
    clear_notifications_for_test()
    yield
    clear_notifications_for_test()


def test_finalise_g_bill_creates_four_notifications_and_replay_is_idempotent():
    """
    P15 Test 1:
    Finalising the G bill creates exactly four bill_ready notifications with the F9 text;
    replaying the event creates none.
    """
    client = TestClient(app)

    # Setup Scenario G
    order_id = "ord-comm-green-2026-11"
    COMMUNITY_ORDERS[order_id] = {
        "id": order_id,
        "cart_id": "cart-green-2026-11",
        "community_id": "comm-green-1",
        "retailer_id": "ret-ravi-1",
        "order_no": "ORD-GREEN-202611-001",
        "status": "accepted",
    }
    CUSTOMER_ORDER_ITEMS[("ord-comm-green-2026-11", "usr-asha-1", "var-rice-5k")] = {
        "order_id": order_id, "customer_id": "usr-asha-1", "variant_id": "var-rice-5k",
        "requested_qty": 2, "packed_qty": 2, "unit_price_paise": 32000, "mrp_paise": 35000,
    }
    CUSTOMER_ORDER_ITEMS[("ord-comm-green-2026-11", "usr-asha-1", "var-sugar-1k")] = {
        "order_id": order_id, "customer_id": "usr-asha-1", "variant_id": "var-sugar-1k",
        "requested_qty": 1, "packed_qty": 1, "unit_price_paise": 4800, "mrp_paise": 5500,
    }
    CUSTOMER_ORDER_ITEMS[("ord-comm-green-2026-11", "usr-asha-1", "var-oil-1l")] = {
        "order_id": order_id, "customer_id": "usr-asha-1", "variant_id": "var-oil-1l",
        "requested_qty": 1, "packed_qty": 1, "unit_price_paise": 11200, "mrp_paise": 13000,
    }
    CUSTOMER_ORDER_ITEMS[("ord-comm-green-2026-11", "usr-bharat-2", "var-rice-5k")] = {
        "order_id": order_id, "customer_id": "usr-bharat-2", "variant_id": "var-rice-5k",
        "requested_qty": 1, "packed_qty": 1, "unit_price_paise": 32000, "mrp_paise": 35000,
    }
    CUSTOMER_ORDER_ITEMS[("ord-comm-green-2026-11", "usr-bharat-2", "var-dal-1k")] = {
        "order_id": order_id, "customer_id": "usr-bharat-2", "variant_id": "var-dal-1k",
        "requested_qty": 2, "packed_qty": 2, "unit_price_paise": 14000, "mrp_paise": 15000,
    }
    CUSTOMER_ORDER_ITEMS[("ord-comm-green-2026-11", "usr-chitra-3", "var-rice-5k")] = {
        "order_id": order_id, "customer_id": "usr-chitra-3", "variant_id": "var-rice-5k",
        "requested_qty": 1, "packed_qty": 1, "unit_price_paise": 32000, "mrp_paise": 35000,
    }
    CUSTOMER_ORDER_ITEMS[("ord-comm-green-2026-11", "usr-chitra-3", "var-sugar-1k")] = {
        "order_id": order_id, "customer_id": "usr-chitra-3", "variant_id": "var-sugar-1k",
        "requested_qty": 1, "packed_qty": 1, "unit_price_paise": 4800, "mrp_paise": 5500,
    }
    CUSTOMER_ORDER_ITEMS[("ord-comm-green-2026-11", "usr-chitra-3", "var-dal-1k")] = {
        "order_id": order_id, "customer_id": "usr-chitra-3", "variant_id": "var-dal-1k",
        "requested_qty": 1, "packed_qty": 1, "unit_price_paise": 14000, "mrp_paise": 15000,
    }
    CUSTOMER_ORDER_ITEMS[("ord-comm-green-2026-11", "usr-dev-4", "var-rice-5k")] = {
        "order_id": order_id, "customer_id": "usr-dev-4", "variant_id": "var-rice-5k",
        "requested_qty": 2, "packed_qty": 2, "unit_price_paise": 32000, "mrp_paise": 35000,
    }

    RETAILER_LISTINGS[("ret-ravi-1", "var-rice-5k")] = {"stock_qty": 100, "reserved_qty": 0}
    RETAILER_LISTINGS[("ret-ravi-1", "var-sugar-1k")] = {"stock_qty": 100, "reserved_qty": 0}
    RETAILER_LISTINGS[("ret-ravi-1", "var-oil-1l")] = {"stock_qty": 100, "reserved_qty": 0}
    RETAILER_LISTINGS[("ret-ravi-1", "var-dal-1k")] = {"stock_qty": 100, "reserved_qty": 0}

    ORDER_DRAFT_BILLS[order_id] = {
        "overall_discount_paise": 25000,
        "delivery_charge_paise": 0,
        "lines": [],
    }

    # Finalise order
    token_ravi = create_session_token("usr-ravi-21")
    res = client.post(
        f"/api/v1/retailer/orders/{order_id}/finalise",
        headers={"Authorization": f"Bearer {token_ravi}"},
    )
    assert res.status_code == 200

    # Exactly 4 bill_ready notifications created
    expected_f9_text = "Your grocery order has been packed. Your final bill is ready. Please review your invoice and complete payment."

    for uid in ["usr-asha-1", "usr-bharat-2", "usr-chitra-3", "usr-dev-4"]:
        user_notifs = get_user_notifications(uid)
        assert len(user_notifs) == 1
        n = user_notifs[0]
        assert n["type"] == "bill_ready"
        assert n["message"] == expected_f9_text
        assert n["is_read"] is False

    # Replaying the invoice.created event creates no new notifications (idempotent)
    for uid in ["usr-asha-1", "usr-bharat-2", "usr-chitra-3", "usr-dev-4"]:
        inv_id = f"inv-{order_id}-{uid}"
        on_invoice_created(order_id, inv_id, uid, 72000)
        # Still only 1
        assert len(get_user_notifications(uid)) == 1


def test_nobody_can_read_another_persons_notifications():
    """
    P15 Test 2:
    Nobody can read another person's notifications.
    """
    client = TestClient(app)

    token_asha = create_session_token("usr-asha-1")
    token_bharat = create_session_token("usr-bharat-2")

    # Seed notification for Asha
    on_invoice_created("ord-1", "inv-1", "usr-asha-1", 72000)

    # Asha can see her notification
    res_asha = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {token_asha}"})
    assert res_asha.status_code == 200
    assert len(res_asha.json()["notifications"]) == 1
    asha_notif_id = res_asha.json()["notifications"][0]["id"]

    # Bharat sees 0 notifications
    res_bharat = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {token_bharat}"})
    assert res_bharat.status_code == 200
    assert len(res_bharat.json()["notifications"]) == 0

    # Bharat cannot mark Asha's notification as read (404)
    res_hack = client.post(
        f"/api/v1/notifications/{asha_notif_id}/read",
        headers={"Authorization": f"Bearer {token_bharat}"},
    )
    assert res_hack.status_code == 404

    # Asha can mark her notification as read
    res_read = client.post(
        f"/api/v1/notifications/{asha_notif_id}/read",
        headers={"Authorization": f"Bearer {token_asha}"},
    )
    assert res_read.status_code == 200
    assert res_read.json()["notification"]["is_read"] is True
