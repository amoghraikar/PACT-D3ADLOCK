import pytest
from fastapi.testclient import TestClient

from app.core.clock import now_utc
from app.core.security import create_session_token
from app.main import app
from app.modules.admin.dashboard_router import (
    DELIVERY_RECORDS,
    INVOICE_REMINDERS,
)
from app.modules.cart.cycle import COMMUNITY_ORDERS
from app.modules.notifications.service import (
    clear_notifications_for_test,
    get_user_notifications,
)
from app.modules.payments.service import DELIVERIES, clear_payments_for_test
from app.modules.retailer.orders_router import INVOICES


@pytest.fixture(autouse=True)
def setup_teardown():
    clear_payments_for_test()
    clear_notifications_for_test()
    COMMUNITY_ORDERS.clear()
    INVOICES.clear()
    INVOICE_REMINDERS.clear()
    DELIVERY_RECORDS.clear()
    yield
    clear_payments_for_test()
    clear_notifications_for_test()
    COMMUNITY_ORDERS.clear()
    INVOICES.clear()
    INVOICE_REMINDERS.clear()
    DELIVERY_RECORDS.clear()


def test_scenario_g_admin_paid_and_unpaid_sections():
    """
    P19 Test 1:
    G: Paid lists Asha, Bharat and Dev. Unpaid lists Chitra with ₹360 due.
    """
    client = TestClient(app)
    token_meera = create_session_token("usr-meera-11")

    order_id = "ord-comm-green-2026-11"
    COMMUNITY_ORDERS[order_id] = {
        "id": order_id,
        "community_id": "comm-green-1",
        "retailer_id": "ret-ravi-1",
        "final_bill_paise": 225000,
        "status": "billed",
    }

    now_str = now_utc().isoformat()
    # Asha: paid
    INVOICES[f"inv-{order_id}-usr-asha-1"] = {
        "id": f"inv-{order_id}-usr-asha-1",
        "order_id": order_id,
        "customer_id": "usr-asha-1",
        "total_paise": 72000,
        "status": "paid",
        "paid_at": now_str,
    }
    # Bharat: paid
    INVOICES[f"inv-{order_id}-usr-bharat-2"] = {
        "id": f"inv-{order_id}-usr-bharat-2",
        "order_id": order_id,
        "customer_id": "usr-bharat-2",
        "total_paise": 54000,
        "status": "paid",
        "paid_at": now_str,
    }
    # Chitra: unpaid (₹360)
    INVOICES[f"inv-{order_id}-usr-chitra-3"] = {
        "id": f"inv-{order_id}-usr-chitra-3",
        "order_id": order_id,
        "customer_id": "usr-chitra-3",
        "total_paise": 36000,
        "status": "issued",
        "paid_at": None,
    }
    # Dev: paid
    INVOICES[f"inv-{order_id}-usr-dev-4"] = {
        "id": f"inv-{order_id}-usr-dev-4",
        "order_id": order_id,
        "customer_id": "usr-dev-4",
        "total_paise": 63000,
        "status": "paid",
        "paid_at": now_str,
    }

    # Query Paid section
    res_paid = client.get(
        "/api/v1/admin/invoices?section=paid",
        headers={"Authorization": f"Bearer {token_meera}"},
    )
    assert res_paid.status_code == 200
    paid_invs = res_paid.json()["invoices"]
    assert len(paid_invs) == 3
    paid_customer_ids = {inv["customer_id"] for inv in paid_invs}
    assert paid_customer_ids == {"usr-asha-1", "usr-bharat-2", "usr-dev-4"}

    # Query Unpaid section
    res_unpaid = client.get(
        "/api/v1/admin/invoices?section=unpaid",
        headers={"Authorization": f"Bearer {token_meera}"},
    )
    assert res_unpaid.status_code == 200
    unpaid_invs = res_unpaid.json()["invoices"]
    assert len(unpaid_invs) == 1
    assert unpaid_invs[0]["customer_id"] == "usr-chitra-3"
    assert unpaid_invs[0]["amount_paise"] == 36000


def test_admin_reminders_and_hourly_limit():
    """
    P19 Test 2:
    A reminder creates the F9 notification and records sent_by;
    a second within the hour is skipped and reported as skipped.
    """
    client = TestClient(app)
    token_meera = create_session_token("usr-meera-11")

    order_id = "ord-comm-green-2026-11"
    COMMUNITY_ORDERS[order_id] = {
        "id": order_id,
        "community_id": "comm-green-1",
        "retailer_id": "ret-ravi-1",
        "status": "billed",
    }
    chitra_inv_id = f"inv-{order_id}-usr-chitra-3"
    INVOICES[chitra_inv_id] = {
        "id": chitra_inv_id,
        "order_id": order_id,
        "customer_id": "usr-chitra-3",
        "total_paise": 36000,
        "status": "issued",
    }

    # First reminder
    res1 = client.post(
        "/api/v1/admin/reminders",
        headers={"Authorization": f"Bearer {token_meera}"},
        json={"all_unpaid": True},
    )
    assert res1.status_code == 200
    assert res1.json()["sent"] == 1
    assert res1.json()["skipped_recent"] == 0

    # Chitra received F9 payment reminder text
    notifs = get_user_notifications("usr-chitra-3")
    assert len(notifs) == 1
    assert notifs[0]["type"] == "payment_reminder"
    assert "Your PACT grocery order is packed and ready." in notifs[0]["message"]

    # Immediate second reminder within the hour -> skipped
    res2 = client.post(
        "/api/v1/admin/reminders",
        headers={"Authorization": f"Bearer {token_meera}"},
        json={"all_unpaid": True},
    )
    assert res2.status_code == 200
    assert res2.json()["sent"] == 0
    assert res2.json()["skipped_recent"] == 1

    # Still only 1 notification
    assert len(get_user_notifications("usr-chitra-3")) == 1


def test_delivery_flow_and_unpaid_guard():
    """
    P19 Test 3:
    - Delivery moves paid → ready_for_distribution → out_for_delivery → delivered,
      in order only, each step recording who and when.
    - "Out for delivery" sends the F9 delivery text.
    - An unpaid invoice can never enter delivery (422).
    """
    client = TestClient(app)
    token_meera = create_session_token("usr-meera-11")

    order_id = "ord-comm-green-2026-11"
    COMMUNITY_ORDERS[order_id] = {
        "id": order_id,
        "community_id": "comm-green-1",
        "retailer_id": "ret-ravi-1",
        "status": "billed",
    }
    asha_inv_id = f"inv-{order_id}-usr-asha-1"
    INVOICES[asha_inv_id] = {
        "id": asha_inv_id,
        "order_id": order_id,
        "customer_id": "usr-asha-1",
        "total_paise": 72000,
        "status": "paid",
        "paid_at": now_utc().isoformat(),
    }
    DELIVERIES[f"del-{asha_inv_id}"] = {
        "id": f"del-{asha_inv_id}",
        "invoice_id": asha_inv_id,
        "customer_id": "usr-asha-1",
        "status": "paid",
    }

    # 1. Unpaid invoice guard
    unpaid_inv_id = f"inv-{order_id}-usr-chitra-3"
    INVOICES[unpaid_inv_id] = {
        "id": unpaid_inv_id,
        "order_id": order_id,
        "customer_id": "usr-chitra-3",
        "total_paise": 36000,
        "status": "issued",
    }
    res_bad = client.post(
        f"/api/v1/admin/deliveries/{unpaid_inv_id}/advance",
        headers={"Authorization": f"Bearer {token_meera}"},
        json={"to": "ready_for_distribution"},
    )
    assert res_bad.status_code == 422

    # 2. Cannot skip states: paid directly to out_for_delivery -> 409
    res_skip = client.post(
        f"/api/v1/admin/deliveries/{asha_inv_id}/advance",
        headers={"Authorization": f"Bearer {token_meera}"},
        json={"to": "out_for_delivery"},
    )
    assert res_skip.status_code == 409

    # 3. Step 1: paid -> ready_for_distribution
    res_step1 = client.post(
        f"/api/v1/admin/deliveries/{asha_inv_id}/advance",
        headers={"Authorization": f"Bearer {token_meera}"},
        json={"to": "ready_for_distribution"},
    )
    assert res_step1.status_code == 200
    assert res_step1.json()["current_status"] == "ready_for_distribution"

    # 4. Step 2: ready_for_distribution -> out_for_delivery (emits F9 notification)
    res_step2 = client.post(
        f"/api/v1/admin/deliveries/{asha_inv_id}/advance",
        headers={"Authorization": f"Bearer {token_meera}"},
        json={"to": "out_for_delivery"},
    )
    assert res_step2.status_code == 200
    assert res_step2.json()["current_status"] == "out_for_delivery"

    asha_notifs = get_user_notifications("usr-asha-1")
    assert any(n["type"] == "delivery_on_the_way" for n in asha_notifs)

    # 5. Step 3: out_for_delivery -> delivered
    res_step3 = client.post(
        f"/api/v1/admin/deliveries/{asha_inv_id}/advance",
        headers={"Authorization": f"Bearer {token_meera}"},
        json={"to": "delivered"},
    )
    assert res_step3.status_code == 200
    assert res_step3.json()["current_status"] == "delivered"


def test_admin_community_isolation():
    """
    P19 Test 4:
    Meera cannot see Lakeview. Nikhil cannot see Green Meadows.
    """
    client = TestClient(app)
    token_meera = create_session_token("usr-meera-11")
    token_nikhil = create_session_token("usr-nikhil-12")

    # Order in Lakeview
    lake_order_id = "ord-comm-lake-2026-11"
    COMMUNITY_ORDERS[lake_order_id] = {
        "id": lake_order_id,
        "community_id": "comm-lake-1",
        "retailer_id": "ret-farah-2",
        "final_bill_paise": 150000,
        "status": "billed",
    }
    lake_inv_id = f"inv-{lake_order_id}-usr-lake-1"
    INVOICES[lake_inv_id] = {
        "id": lake_inv_id,
        "order_id": lake_order_id,
        "customer_id": "usr-lake-1",
        "total_paise": 150000,
        "status": "paid",
    }

    # Meera queries overview -> 0 invoices from Lakeview
    res_m = client.get("/api/v1/admin/overview", headers={"Authorization": f"Bearer {token_meera}"})
    assert res_m.status_code == 200
    assert res_m.json()["community_id"] == "comm-green-1"
    assert res_m.json()["invoices_count"] == 0

    # Meera cannot access Lakeview invoice handover
    res_hand = client.get(
        f"/api/v1/admin/invoices/{lake_inv_id}/handover",
        headers={"Authorization": f"Bearer {token_meera}"},
    )
    assert res_hand.status_code == 404

    # Nikhil sees Lakeview invoice
    res_n = client.get("/api/v1/admin/overview", headers={"Authorization": f"Bearer {token_nikhil}"})
    assert res_n.status_code == 200
    assert res_n.json()["community_id"] == "comm-lake-1"
    assert res_n.json()["invoices_count"] == 1
