from fastapi.testclient import TestClient
import pytest

from app.core.security import create_session_token
from app.main import app
from app.modules.cart.cycle import (
    CARTS,
    COMMUNITY_ORDERS,
    CUSTOMER_ORDER_ITEMS,
)
from app.modules.catalogue.router import RETAILER_LISTINGS
from app.modules.retailer.orders_router import (
    INVOICES,
    ORDER_DRAFT_BILLS,
    ORDER_RESERVATIONS,
)


@pytest.fixture(autouse=True)
def reset_order_state():
    """Reset order tables and setup Golden Scenario G order before each test."""
    COMMUNITY_ORDERS.clear()
    CUSTOMER_ORDER_ITEMS.clear()
    INVOICES.clear()
    ORDER_DRAFT_BILLS.clear()
    ORDER_RESERVATIONS.clear()

    # Reset listings for Sri Lakshmi Stores (ret-ravi-1)
    RETAILER_LISTINGS[("ret-ravi-1", "var-rice-sona-5kg")] = {
        "mrp_paise": 34000,
        "selling_price_paise": 30000,
        "stock_qty": 100,
        "reserved_qty": 0,
        "availability": "active",
    }
    RETAILER_LISTINGS[("ret-ravi-1", "var-sugar-1kg")] = {
        "mrp_paise": 8000,
        "selling_price_paise": 7500,
        "stock_qty": 100,
        "reserved_qty": 0,
        "availability": "active",
    }
    RETAILER_LISTINGS[("ret-ravi-1", "var-oil-sunflower-1l")] = {
        "mrp_paise": 27000,
        "selling_price_paise": 25000,
        "stock_qty": 50,
        "reserved_qty": 0,
        "availability": "active",
    }
    RETAILER_LISTINGS[("ret-ravi-1", "var-dal-toor-500g")] = {
        "mrp_paise": 11000,
        "selling_price_paise": 10000,
        "stock_qty": 80,
        "reserved_qty": 0,
        "availability": "active",
    }

    # Setup Golden Scenario G Order:
    # 9 customer lines: Rice 5kg x 6, Sugar 1kg x 2, Oil 1L x 1, Dal 500g x 3
    order_id = "ord-comm-green-meadows-2026-11"
    COMMUNITY_ORDERS[order_id] = {
        "id": order_id,
        "cart_id": "cart-comm-green-meadows-2026-11",
        "community_id": "comm-green-meadows",
        "retailer_id": "ret-ravi-1",
        "order_no": "ORD-GREEN-202611-001",
        "status": "submitted",
        "submitted_at": "2026-11-25T00:00:00Z",
    }

    # 1. Asha: Rice 5kg x 1, Sugar 1kg x 2, Oil 1L x 1, Dal 500g x 1 (total ₹800)
    CUSTOMER_ORDER_ITEMS[(order_id, "usr-c1-asha", "var-rice-sona-5kg")] = {
        "order_id": order_id, "customer_id": "usr-c1-asha", "variant_id": "var-rice-sona-5kg",
        "requested_qty": 1, "packed_qty": None, "unit_price_paise": 30000, "mrp_paise": 34000,
    }
    CUSTOMER_ORDER_ITEMS[(order_id, "usr-c1-asha", "var-sugar-1kg")] = {
        "order_id": order_id, "customer_id": "usr-c1-asha", "variant_id": "var-sugar-1kg",
        "requested_qty": 2, "packed_qty": None, "unit_price_paise": 7500, "mrp_paise": 8000,
    }
    CUSTOMER_ORDER_ITEMS[(order_id, "usr-c1-asha", "var-oil-sunflower-1l")] = {
        "order_id": order_id, "customer_id": "usr-c1-asha", "variant_id": "var-oil-sunflower-1l",
        "requested_qty": 1, "packed_qty": None, "unit_price_paise": 25000, "mrp_paise": 27000,
    }
    CUSTOMER_ORDER_ITEMS[(order_id, "usr-c1-asha", "var-dal-toor-500g")] = {
        "order_id": order_id, "customer_id": "usr-c1-asha", "variant_id": "var-dal-toor-500g",
        "requested_qty": 1, "packed_qty": None, "unit_price_paise": 10000, "mrp_paise": 11000,
    }

    # 2. Bharat: Rice 5kg x 2 (total ₹600)
    CUSTOMER_ORDER_ITEMS[(order_id, "usr-c2-bharat", "var-rice-sona-5kg")] = {
        "order_id": order_id, "customer_id": "usr-c2-bharat", "variant_id": "var-rice-sona-5kg",
        "requested_qty": 2, "packed_qty": None, "unit_price_paise": 30000, "mrp_paise": 34000,
    }

    # 3. Chitra: Rice 5kg x 1, Dal 500g x 1 (total ₹400)
    CUSTOMER_ORDER_ITEMS[(order_id, "usr-c3-chitra", "var-rice-sona-5kg")] = {
        "order_id": order_id, "customer_id": "usr-c3-chitra", "variant_id": "var-rice-sona-5kg",
        "requested_qty": 1, "packed_qty": None, "unit_price_paise": 30000, "mrp_paise": 34000,
    }
    CUSTOMER_ORDER_ITEMS[(order_id, "usr-c3-chitra", "var-dal-toor-500g")] = {
        "order_id": order_id, "customer_id": "usr-c3-chitra", "variant_id": "var-dal-toor-500g",
        "requested_qty": 1, "packed_qty": None, "unit_price_paise": 10000, "mrp_paise": 11000,
    }

    # 4. Dev: Rice 5kg x 2, Dal 500g x 1 (total ₹700)
    CUSTOMER_ORDER_ITEMS[(order_id, "usr-c4-dev", "var-rice-sona-5kg")] = {
        "order_id": order_id, "customer_id": "usr-c4-dev", "variant_id": "var-rice-sona-5kg",
        "requested_qty": 2, "packed_qty": None, "unit_price_paise": 30000, "mrp_paise": 34000,
    }
    CUSTOMER_ORDER_ITEMS[(order_id, "usr-c4-dev", "var-dal-toor-500g")] = {
        "order_id": order_id, "customer_id": "usr-c4-dev", "variant_id": "var-dal-toor-500g",
        "requested_qty": 1, "packed_qty": None, "unit_price_paise": 10000, "mrp_paise": 11000,
    }


def get_ravi_token() -> str:
    return create_session_token("usr-ravi-21")


def get_farah_token() -> str:
    return create_session_token("usr-farah-22")


def test_golden_scenario_g_end_to_end():
    """
    P13 Golden Scenario G:
    Ravi accepts -> packs everything -> ₹250 overall discount ->
    invoices ₹720, ₹540, ₹360, ₹630 and bill of ₹2,250;
    stock falls by 6, 2, 1 and 3.
    """
    client = TestClient(app)
    token = get_ravi_token()
    headers = {"Authorization": f"Bearer {token}"}
    order_id = "ord-comm-green-meadows-2026-11"

    # Initial stock checks: 100, 100, 50, 80
    assert RETAILER_LISTINGS[("ret-ravi-1", "var-rice-sona-5kg")]["stock_qty"] == 100
    assert RETAILER_LISTINGS[("ret-ravi-1", "var-sugar-1kg")]["stock_qty"] == 100
    assert RETAILER_LISTINGS[("ret-ravi-1", "var-oil-sunflower-1l")]["stock_qty"] == 50
    assert RETAILER_LISTINGS[("ret-ravi-1", "var-dal-toor-500g")]["stock_qty"] == 80

    # 1. Detail check: breakdown contains name and flat only, no phone numbers
    res = client.get(f"/api/v1/retailer/orders/{order_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "customer_lines" in data
    for line in data["customer_lines"]:
        assert "customer_name" in line
        assert "unit_label" in line
        assert "phone" not in line
        assert "+91" not in str(line)

    # 2. Accept order -> reserves stock
    res_accept = client.post(f"/api/v1/retailer/orders/{order_id}/accept", headers=headers)
    assert res_accept.status_code == 200
    assert res_accept.json()["status"] == "accepted"
    # Reserved amounts: 6 rice, 2 sugar, 1 oil, 3 dal
    assert RETAILER_LISTINGS[("ret-ravi-1", "var-rice-sona-5kg")]["reserved_qty"] == 6

    # 3. Pack everything: 9 lines
    packing_items = [
        {"customer_id": "usr-c1-asha", "variant_id": "var-rice-sona-5kg", "packed_qty": 1},
        {"customer_id": "usr-c1-asha", "variant_id": "var-sugar-1kg", "packed_qty": 2},
        {"customer_id": "usr-c1-asha", "variant_id": "var-oil-sunflower-1l", "packed_qty": 1},
        {"customer_id": "usr-c1-asha", "variant_id": "var-dal-toor-500g", "packed_qty": 1},
        {"customer_id": "usr-c2-bharat", "variant_id": "var-rice-sona-5kg", "packed_qty": 2},
        {"customer_id": "usr-c3-chitra", "variant_id": "var-rice-sona-5kg", "packed_qty": 1},
        {"customer_id": "usr-c3-chitra", "variant_id": "var-dal-toor-500g", "packed_qty": 1},
        {"customer_id": "usr-c4-dev", "variant_id": "var-rice-sona-5kg", "packed_qty": 2},
        {"customer_id": "usr-c4-dev", "variant_id": "var-dal-toor-500g", "packed_qty": 1},
    ]
    res_pack = client.put(
        f"/api/v1/retailer/orders/{order_id}/packing",
        headers=headers,
        json={"items": packing_items},
    )
    assert res_pack.status_code == 200
    assert res_pack.json()["status"] == "packing"

    # 4. Draft bill with ₹250 overall discount (25000 paise)
    res_draft = client.put(
        f"/api/v1/retailer/orders/{order_id}/bill-draft",
        headers=headers,
        json={"overall_discount_paise": 25000, "delivery_charge_paise": 0, "lines": []},
    )
    assert res_draft.status_code == 200

    # 5. Preview bill: verify exact amounts 720, 540, 360, 630 and bill 2,250
    res_prev = client.get(f"/api/v1/retailer/orders/{order_id}/bill-preview", headers=headers)
    assert res_prev.status_code == 200
    prev_data = res_prev.json()
    assert prev_data["bill_total_paise"] == 225000
    invs = {inv["customer_id"]: inv for inv in prev_data["invoices"]}
    assert invs["usr-c1-asha"]["total_paise"] == 72000
    assert invs["usr-c2-bharat"]["total_paise"] == 54000
    assert invs["usr-c3-chitra"]["total_paise"] == 36000
    assert invs["usr-c4-dev"]["total_paise"] == 63000

    # 6. Finalise bill
    res_fin = client.post(f"/api/v1/retailer/orders/{order_id}/finalise", headers=headers)
    assert res_fin.status_code == 200
    fin_data = res_fin.json()
    assert fin_data["status"] == "billed"
    assert fin_data["final_bill_paise"] == 225000
    assert fin_data["invoices_count"] == 4

    # 7. Stock checks: must fall by 6, 2, 1 and 3
    assert RETAILER_LISTINGS[("ret-ravi-1", "var-rice-sona-5kg")]["stock_qty"] == 94  # 100 - 6
    assert RETAILER_LISTINGS[("ret-ravi-1", "var-sugar-1kg")]["stock_qty"] == 98       # 100 - 2
    assert RETAILER_LISTINGS[("ret-ravi-1", "var-oil-sunflower-1l")]["stock_qty"] == 49 # 50 - 1
    assert RETAILER_LISTINGS[("ret-ravi-1", "var-dal-toor-500g")]["stock_qty"] == 77   # 80 - 3
    # Reservations must be released
    assert RETAILER_LISTINGS[("ret-ravi-1", "var-rice-sona-5kg")]["reserved_qty"] == 0

    # 8. Guard: Finalising twice or packing after billed -> 409
    res_fin_again = client.post(f"/api/v1/retailer/orders/{order_id}/finalise", headers=headers)
    assert res_fin_again.status_code == 409

    res_pack_again = client.put(
        f"/api/v1/retailer/orders/{order_id}/packing",
        headers=headers,
        json={"items": packing_items},
    )
    assert res_pack_again.status_code == 409


def test_golden_scenario_g_short_pack_variant():
    """
    Scenario G short-pack:
    Dev's Toor Dal is packed 0 ->
    invoices 716.67, 537.50, 358.33, 537.50 and bill ₹2,150.
    """
    client = TestClient(app)
    token = get_ravi_token()
    headers = {"Authorization": f"Bearer {token}"}
    order_id = "ord-comm-green-meadows-2026-11"

    client.post(f"/api/v1/retailer/orders/{order_id}/accept", headers=headers)

    # Dev's Toor Dal packed 0
    packing_items = [
        {"customer_id": "usr-c1-asha", "variant_id": "var-rice-sona-5kg", "packed_qty": 1},
        {"customer_id": "usr-c1-asha", "variant_id": "var-sugar-1kg", "packed_qty": 2},
        {"customer_id": "usr-c1-asha", "variant_id": "var-oil-sunflower-1l", "packed_qty": 1},
        {"customer_id": "usr-c1-asha", "variant_id": "var-dal-toor-500g", "packed_qty": 1},
        {"customer_id": "usr-c2-bharat", "variant_id": "var-rice-sona-5kg", "packed_qty": 2},
        {"customer_id": "usr-c3-chitra", "variant_id": "var-rice-sona-5kg", "packed_qty": 1},
        {"customer_id": "usr-c3-chitra", "variant_id": "var-dal-toor-500g", "packed_qty": 1},
        {"customer_id": "usr-c4-dev", "variant_id": "var-rice-sona-5kg", "packed_qty": 2},
        {"customer_id": "usr-c4-dev", "variant_id": "var-dal-toor-500g", "packed_qty": 0},  # short!
    ]
    client.put(
        f"/api/v1/retailer/orders/{order_id}/packing",
        headers=headers,
        json={"items": packing_items},
    )

    client.put(
        f"/api/v1/retailer/orders/{order_id}/bill-draft",
        headers=headers,
        json={"overall_discount_paise": 25000, "delivery_charge_paise": 0, "lines": []},
    )

    res_fin = client.post(f"/api/v1/retailer/orders/{order_id}/finalise", headers=headers)
    assert res_fin.status_code == 200
    data = res_fin.json()
    assert data["final_bill_paise"] == 215000
    invs = {inv["customer_id"]: inv for inv in data["invoices"]}
    assert invs["usr-c1-asha"]["total_paise"] == 71667
    assert invs["usr-c2-bharat"]["total_paise"] == 53750
    assert invs["usr-c3-chitra"]["total_paise"] == 35833
    assert invs["usr-c4-dev"]["total_paise"] == 53750


def test_retailer_isolation():
    """Farah cannot see or act on Ravi's order (404)."""
    client = TestClient(app)
    farah_headers = {"Authorization": f"Bearer {get_farah_token()}"}
    order_id = "ord-comm-green-meadows-2026-11"

    # Farah tries to view Ravi's order
    res = client.get(f"/api/v1/retailer/orders/{order_id}", headers=farah_headers)
    assert res.status_code == 404

    # Farah tries to accept Ravi's order
    res = client.post(f"/api/v1/retailer/orders/{order_id}/accept", headers=farah_headers)
    assert res.status_code == 404


def test_packing_before_accept_fails():
    """Packing before accept answers 409."""
    client = TestClient(app)
    headers = {"Authorization": f"Bearer {get_ravi_token()}"}
    order_id = "ord-comm-green-meadows-2026-11"

    res = client.put(
        f"/api/v1/retailer/orders/{order_id}/packing",
        headers=headers,
        json={"items": [{"customer_id": "usr-c1-asha", "variant_id": "var-rice-sona-5kg", "packed_qty": 1}]},
    )
    assert res.status_code == 409


def test_packed_above_requested_fails():
    """Packed above requested quantity answers 422."""
    client = TestClient(app)
    headers = {"Authorization": f"Bearer {get_ravi_token()}"}
    order_id = "ord-comm-green-meadows-2026-11"

    client.post(f"/api/v1/retailer/orders/{order_id}/accept", headers=headers)

    # Asha requested 1 pack of rice; trying to pack 2
    res = client.put(
        f"/api/v1/retailer/orders/{order_id}/packing",
        headers=headers,
        json={"items": [{"customer_id": "usr-c1-asha", "variant_id": "var-rice-sona-5kg", "packed_qty": 2}]},
    )
    assert res.status_code == 422


def test_insufficient_stock_at_finalise_fails():
    """Packed above stock at finalise answers 409 naming the variants."""
    client = TestClient(app)
    headers = {"Authorization": f"Bearer {get_ravi_token()}"}
    order_id = "ord-comm-green-meadows-2026-11"

    client.post(f"/api/v1/retailer/orders/{order_id}/accept", headers=headers)

    # Reduce stock of rice to 2 (while packed is 6)
    RETAILER_LISTINGS[("ret-ravi-1", "var-rice-sona-5kg")]["stock_qty"] = 2

    res = client.post(f"/api/v1/retailer/orders/{order_id}/finalise", headers=headers)
    assert res.status_code == 409
    assert "var-rice-sona-5kg" in res.json()["error"]["message"]
