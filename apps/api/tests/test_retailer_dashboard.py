import pytest
from fastapi.testclient import TestClient

from app.core.clock import now_utc
from app.core.security import create_session_token
from app.main import app
from app.modules.cart.cycle import COMMUNITY_ORDERS, CUSTOMER_ORDER_ITEMS
from app.modules.catalogue.router import RETAILER_LISTINGS
from app.modules.payments.service import clear_payments_for_test
from app.modules.retailer.orders_router import INVOICES


@pytest.fixture(autouse=True)
def setup_teardown():
    clear_payments_for_test()
    COMMUNITY_ORDERS.clear()
    CUSTOMER_ORDER_ITEMS.clear()
    INVOICES.clear()
    yield
    clear_payments_for_test()
    COMMUNITY_ORDERS.clear()
    CUSTOMER_ORDER_ITEMS.clear()
    INVOICES.clear()


def test_scenario_g_collection_after_asha_bharat_dev_pay():
    """
    P18 Test 1:
    G after Asha, Bharat and Dev pay:
    ₹1,890 of ₹2,250 received, 84%, 3 paid, 1 unpaid, ₹360 pending.
    """
    client = TestClient(app)
    token_ravi = create_session_token("usr-ravi-21")

    order_id = "ord-comm-green-2026-11"
    COMMUNITY_ORDERS[order_id] = {
        "id": order_id,
        "community_id": "comm-green-1",
        "retailer_id": "ret-ravi-1",
        "final_bill_paise": 225000,
        "status": "billed",
    }

    now_str = now_utc().isoformat()
    # 4 Scenario G invoices:
    # Asha: ₹720 (paid)
    INVOICES[f"inv-{order_id}-usr-asha-1"] = {
        "id": f"inv-{order_id}-usr-asha-1",
        "order_id": order_id,
        "customer_id": "usr-asha-1",
        "total_paise": 72000,
        "status": "paid",
        "paid_at": now_str,
    }
    # Bharat: ₹540 (paid)
    INVOICES[f"inv-{order_id}-usr-bharat-2"] = {
        "id": f"inv-{order_id}-usr-bharat-2",
        "order_id": order_id,
        "customer_id": "usr-bharat-2",
        "total_paise": 54000,
        "status": "paid",
        "paid_at": now_str,
    }
    # Chitra: ₹360 (unpaid)
    INVOICES[f"inv-{order_id}-usr-chitra-3"] = {
        "id": f"inv-{order_id}-usr-chitra-3",
        "order_id": order_id,
        "customer_id": "usr-chitra-3",
        "total_paise": 36000,
        "status": "issued",
        "paid_at": None,
    }
    # Dev: ₹630 (paid)
    INVOICES[f"inv-{order_id}-usr-dev-4"] = {
        "id": f"inv-{order_id}-usr-dev-4",
        "order_id": order_id,
        "customer_id": "usr-dev-4",
        "total_paise": 63000,
        "status": "paid",
        "paid_at": now_str,
    }

    # Query Collections for order
    res = client.get(
        f"/api/v1/retailer/orders/{order_id}/collections",
        headers={"Authorization": f"Bearer {token_ravi}"},
    )
    assert res.status_code == 200
    data = res.json()

    assert data["bill_total_paise"] == 225000  # ₹2,250
    assert data["received_paise"] == 189000    # ₹1,890 (720 + 540 + 630)
    assert data["pending_paise"] == 36000      # ₹360 (Chitra)
    assert data["paid_count"] == 3
    assert data["unpaid_count"] == 1
    assert data["progress_percent"] == 84      # 1890 / 2250 * 100 = 84%
    assert data["settlement_line"] == "Settlement: not available in test mode"

    # Query Dashboard
    d_res = client.get(
        "/api/v1/retailer/dashboard",
        headers={"Authorization": f"Bearer {token_ravi}"},
    )
    assert d_res.status_code == 200
    d_data = d_res.json()
    assert d_data["sales_this_month_paise"] == 189000
    assert d_data["growth_percent"] is None  # null when last month is 0


def test_retailer_tenant_isolation():
    """
    P18 Test 2:
    Farah's dashboard is unaffected by anything of Ravi's.
    """
    client = TestClient(app)
    token_farah = create_session_token("usr-farah-22")

    # Ravi's order in Green Meadows
    order_id = "ord-comm-green-2026-11"
    COMMUNITY_ORDERS[order_id] = {
        "id": order_id,
        "community_id": "comm-green-1",
        "retailer_id": "ret-ravi-1",
        "final_bill_paise": 225000,
        "status": "billed",
    }
    INVOICES[f"inv-{order_id}-usr-asha-1"] = {
        "id": f"inv-{order_id}-usr-asha-1",
        "order_id": order_id,
        "customer_id": "usr-asha-1",
        "total_paise": 72000,
        "status": "paid",
        "paid_at": now_utc().isoformat(),
    }

    # Farah queries dashboard -> sales must be 0, no orders
    res = client.get(
        "/api/v1/retailer/dashboard",
        headers={"Authorization": f"Bearer {token_farah}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["sales_this_month_paise"] == 0
    assert data["orders"]["received"] == 0
    assert len(data["recent_orders"]) == 0

    # Farah cannot access Ravi's collections endpoint (404)
    res_col = client.get(
        f"/api/v1/retailer/orders/{order_id}/collections",
        headers={"Authorization": f"Bearer {token_farah}"},
    )
    assert res_col.status_code == 404
