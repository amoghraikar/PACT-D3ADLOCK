"""
Comprehensive test suite for Milestone 6: Retailer Order Management.

Covers:
1. View incoming community bulk orders with status filtering & pagination.
2. View total demand grouped by variant, participating household count, and packing records.
3. Accept order lifecycle (PENDING -> ACCEPTED with timestamp and audit log).
4. Reject order lifecycle (PENDING -> REJECTED with reason recorded in audit log).
5. Start packing and update packed quantities:
   - Rule: packed_qty cannot exceed requested_qty (HTTP 409 PACKED_EXCEEDS_REQUESTED).
   - Rule: Out-of-stock / unavailable items marked with packed_qty = 0.
   - Rule: Short-packed quantities auditable via RetailerPackingItem and AuditLog.
   - Rule: Financial snapshots locked; cannot modify packing after billing.
6. Preview final retailer bill using in-memory F7 simulation.
7. Send bill & trigger atomic F7 invoice generation (status -> BILLED, zero discrepancy verified).
8. Dispatch consolidated order (BILLED -> DISPATCHED with timestamp).
9. Retailer dashboard metrics (total, pending, packing, sales, gross value, outstanding, inventory alerts).
10. Strict retailer-tenant isolation and role-based access control.
"""

import uuid
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.clock import set_clock_override
from app.core.config import settings
from app.core.db import SessionLocal
from app.main import app
from app.models.billing import DiscountAllocation, Invoice, InvoiceItem, RetailerBill
from app.models.catalogue import ProductVariant
from app.models.commerce import BulkOrder, ShoppingCycle
from app.models.identity import OtpVerification, Role, User
from app.models.organization import Community, Retailer
from app.repositories.cycle_repository import CycleRepository

client = TestClient(app)


@pytest.fixture(scope="function")
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        set_clock_override(None)
        session.rollback()
        session.close()


def _get_auth_token(phone: str, db) -> str:
    db.query(OtpVerification).filter(OtpVerification.phone == phone).delete()
    db.commit()
    client.post("/api/v1/auth/request-otp", json={"phone": phone})
    resp = client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp": settings.DEV_OTP})
    return resp.json()["access_token"]


def _clean_cycle_and_orders(db, cycle: ShoppingCycle):
    from app.models.billing import PaymentRecord, Refund
    from app.models.commerce import CommunityCartItem, RetailerPackingItem

    existing_orders = list(db.scalars(select(BulkOrder).where(BulkOrder.cycle_id == cycle.id)).all())
    for bo in existing_orders:
        db.query(RetailerBill).filter(RetailerBill.bulk_order_id == bo.id).delete()
        invoices = list(db.scalars(select(Invoice).where(Invoice.bulk_order_id == bo.id)).all())
        for inv in invoices:
            db.query(Refund).filter(Refund.invoice_id == inv.id).delete()
            db.query(PaymentRecord).filter(PaymentRecord.invoice_id == inv.id).delete()
            db.query(InvoiceItem).filter(InvoiceItem.invoice_id == inv.id).delete()
            db.query(DiscountAllocation).filter(DiscountAllocation.invoice_id == inv.id).delete()
            db.delete(inv)
        for item in bo.items:
            db.query(RetailerPackingItem).filter(RetailerPackingItem.bulk_order_item_id == item.id).delete()
        db.delete(bo)
    db.query(CommunityCartItem).filter(CommunityCartItem.cycle_id == cycle.id).delete()
    db.commit()


def _setup_test_bulk_order(db) -> tuple[BulkOrder, str, str, str]:
    """Helper to set up a fresh bulk order with resident cart items in OPEN cycle."""
    cust_token = _get_auth_token("+919999900001", db)  # Asha Sharma (Resident)
    admin_token = _get_auth_token("+919999900099", db)  # Platform Admin
    retailer_token = _get_auth_token("+919999900021", db)  # Ravi Mohan (Primary Retailer)

    set_clock_override(datetime(2026, 11, 15, 10, 0, tzinfo=UTC))
    green_meadows = db.scalars(select(Community).where(Community.code == "GREEN_MEADOWS")).first()
    cycle = CycleRepository.get_or_create_current_cycle(db, green_meadows.id)
    cycle.status = "OPEN"
    db.commit()

    _clean_cycle_and_orders(db, cycle)

    # Add 2 distinct variants to cart
    variants = list(db.scalars(select(ProductVariant).limit(2)).all())
    client.put(
        f"/api/v1/cart/items/{variants[0].id}",
        json={"quantity": 4},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    client.put(
        f"/api/v1/cart/items/{variants[1].id}",
        json={"quantity": 3},
        headers={"Authorization": f"Bearer {cust_token}"},
    )

    # Consolidate bulk order
    cons_resp = client.post(
        f"/api/v1/cycles/{cycle.id}/consolidate",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert cons_resp.status_code == 200
    order_id = uuid.UUID(cons_resp.json()["id"])
    order = db.get(BulkOrder, order_id)

    return order, cust_token, admin_token, retailer_token


def test_retailer_orders_list_and_status_filter(db):
    """Verify retailer can list incoming orders and filter by status."""
    order, _, _, retailer_token = _setup_test_bulk_order(db)

    # 1. Fetch all orders
    resp = client.get(
        "/api/v1/retailer/orders?page=1&limit=10",
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "data" in data
    assert data["meta"]["total"] >= 1
    found = next((o for o in data["data"] if o["id"] == str(order.id)), None)
    assert found is not None
    assert found["status"] in ("PENDING", "pending")
    assert found["participating_households_count"] >= 1
    assert found["total_requested_items"] == 7

    # 2. Filter by status=PENDING
    resp_pending = client.get(
        "/api/v1/retailer/orders?status=PENDING",
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert resp_pending.status_code == 200
    assert len(resp_pending.json()["data"]) >= 1

    # 3. Filter by non-matching status
    resp_empty = client.get(
        "/api/v1/retailer/orders?status=DISPATCHED",
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert resp_empty.status_code == 200
    dispatched_ids = [o["id"] for o in resp_empty.json()["data"]]
    assert str(order.id) not in dispatched_ids


def test_retailer_order_detail_demand_grouped(db):
    """Verify retailer can view order details grouped by variant with household counts."""
    order, _, _, retailer_token = _setup_test_bulk_order(db)

    resp = client.get(
        f"/api/v1/retailer/orders/{order.id}",
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["id"] == str(order.id)
    assert data["order_number"] == order.order_number
    assert data["participating_households_count"] >= 1
    assert len(data["items"]) == 2

    # Verify item fields
    for item in data["items"]:
        assert "variant_id" in item
        assert "product_title" in item
        assert "brand" in item
        assert "category_name" in item
        assert item["requested_qty"] > 0
        assert item["unit_price_paise"] > 0
        assert item["subtotal_paise"] >= 0


def test_accept_order_lifecycle(db):
    """Verify accepting an order transitions PENDING -> ACCEPTED."""
    order, _, _, retailer_token = _setup_test_bulk_order(db)

    resp = client.post(
        f"/api/v1/retailer/orders/{order.id}/accept",
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ACCEPTED"
    assert data["locked_at"] is not None

    # Verify DB state
    db.refresh(order)
    assert order.status == "ACCEPTED"

    # Attempting to accept again must fail with 409
    resp_again = client.post(
        f"/api/v1/retailer/orders/{order.id}/accept",
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert resp_again.status_code == 409
    assert resp_again.json()["error"]["code"] == "INVALID_ORDER_STATE_TRANSITION"


def test_reject_order_lifecycle(db):
    """Verify rejecting an order transitions PENDING -> REJECTED with reason recorded."""
    order, _, _, retailer_token = _setup_test_bulk_order(db)

    resp = client.post(
        f"/api/v1/retailer/orders/{order.id}/reject",
        json={"reason": "Store out of capacity for monthly bulk delivery."},
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "REJECTED"
    assert "capacity" in data["reason"]

    # Verify DB state
    db.refresh(order)
    assert order.status == "REJECTED"

    # Attempting to accept a rejected order must fail
    resp_accept = client.post(
        f"/api/v1/retailer/orders/{order.id}/accept",
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert resp_accept.status_code == 409


def test_packing_updates_and_constraints(db):
    """Verify packing updates, short-packs, unavailable items, and validation rules."""
    order, _, _, retailer_token = _setup_test_bulk_order(db)

    # 1. Accept first
    client.post(
        f"/api/v1/retailer/orders/{order.id}/accept",
        headers={"Authorization": f"Bearer {retailer_token}"},
    )

    items = order.items
    v1_id = items[0].variant_id
    v2_id = items[1].variant_id

    # 2. Test constraint: packed_qty > requested_qty must fail with 409
    resp_exceed = client.post(
        f"/api/v1/retailer/orders/{order.id}/packing",
        json={
            "items": [
                {"variant_id": str(v1_id), "packed_qty": items[0].requested_qty + 5}
            ]
        },
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert resp_exceed.status_code == 409
    assert resp_exceed.json()["error"]["code"] == "PACKED_EXCEEDS_REQUESTED"

    # 3. Test valid packing with 1 short-pack and 1 unavailable item
    # Item 1 requested 4 -> pack 3 (short pack of 1)
    # Item 2 requested 3 -> mark unavailable (packed 0)
    pack_payload = {
        "items": [
            {
                "variant_id": str(v1_id),
                "packed_qty": 3,
                "notes": "1 unit damaged in transit",
            },
            {
                "variant_id": str(v2_id),
                "packed_qty": 0,
                "is_unavailable": True,
                "notes": "Out of stock at distributor",
            },
        ]
    }
    resp_pack = client.post(
        f"/api/v1/retailer/orders/{order.id}/packing",
        json=pack_payload,
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert resp_pack.status_code == 200
    pack_data = resp_pack.json()
    assert pack_data["status"] == "PACKING"
    assert pack_data["total_packed_items"] == 3

    # Verify item-level details
    item1 = next(it for it in pack_data["items"] if it["variant_id"] == str(v1_id))
    item2 = next(it for it in pack_data["items"] if it["variant_id"] == str(v2_id))

    assert item1["packed_qty"] == 3
    assert item1["short_packed_qty"] == 1
    assert item1["is_unavailable"] is False
    assert len(item1["packing_records"]) >= 1

    assert item2["packed_qty"] == 0
    assert item2["short_packed_qty"] == 3
    assert item2["is_unavailable"] is True


def test_bill_preview(db):
    """Verify retailer can preview the final bill calculation before sending."""
    order, _, _, retailer_token = _setup_test_bulk_order(db)

    # Accept & pack
    client.post(
        f"/api/v1/retailer/orders/{order.id}/accept",
        headers={"Authorization": f"Bearer {retailer_token}"},
    )

    items = order.items
    client.post(
        f"/api/v1/retailer/orders/{order.id}/packing",
        json={
            "items": [
                {"variant_id": str(items[0].variant_id), "packed_qty": 2},
                {"variant_id": str(items[1].variant_id), "packed_qty": 2},
            ]
        },
        headers={"Authorization": f"Bearer {retailer_token}"},
    )

    resp_prev = client.get(
        f"/api/v1/retailer/orders/{order.id}/bill-preview?delivery_fee_paise=1200",
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert resp_prev.status_code == 200
    prev_data = resp_prev.json()

    assert prev_data["audit_log"]["zero_discrepancy_verified"] is True
    assert prev_data["audit_log"]["discrepancy_paise"] == 0
    assert prev_data["retailer_bill"]["delivery_amount_paise"] == 1200
    assert len(prev_data["resident_invoices"]) >= 1


def test_send_bill_and_dispatch_lifecycle(db):
    """
    End-to-end order finalization and dispatch:
    1. Accept order
    2. Pack items
    3. Send bill -> status BILLED, generates RetailerBill & Invoices with zero discrepancy
    4. Locking check: Packing updates rejected after billing
    5. Dispatch order -> status DISPATCHED with timestamp
    """
    order, _, _, retailer_token = _setup_test_bulk_order(db)

    # 1. Accept
    client.post(
        f"/api/v1/retailer/orders/{order.id}/accept",
        headers={"Authorization": f"Bearer {retailer_token}"},
    )

    # 2. Pack
    items = order.items
    client.post(
        f"/api/v1/retailer/orders/{order.id}/packing",
        json={
            "items": [
                {"variant_id": str(items[0].variant_id), "packed_qty": 3},
                {"variant_id": str(items[1].variant_id), "packed_qty": 2},
            ]
        },
        headers={"Authorization": f"Bearer {retailer_token}"},
    )

    # 3. Send Bill
    bill_resp = client.post(
        f"/api/v1/retailer/orders/{order.id}/send-bill",
        json={"delivery_fee_paise": 1500, "delivery_allocation_mode": "EQUAL"},
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert bill_resp.status_code == 200
    bill_data = bill_resp.json()
    assert bill_data["status"] == "BILLED"
    assert bill_data["zero_discrepancy_verified"] is True
    assert bill_data["total_invoices_generated"] >= 1
    assert bill_data["sum_invoices_paise"] == bill_data["retailer_bill"]["net_amount_paise"]

    # 4. Locking check: Once billed, packing cannot be modified
    pack_again = client.post(
        f"/api/v1/retailer/orders/{order.id}/packing",
        json={"items": [{"variant_id": str(items[0].variant_id), "packed_qty": 1}]},
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert pack_again.status_code == 409
    assert pack_again.json()["error"]["code"] == "ORDER_LOCKED_FOR_PACKING"

    # 5. Dispatch
    disp_resp = client.post(
        f"/api/v1/retailer/orders/{order.id}/dispatch",
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert disp_resp.status_code == 200
    disp_data = disp_resp.json()
    assert disp_data["status"] == "DISPATCHED"
    assert disp_data["dispatched_at"] is not None

    db.refresh(order)
    assert order.status == "DISPATCHED"
    assert order.dispatched_at is not None


def test_retailer_dashboard_metrics(db):
    """Verify retailer dashboard metrics aggregates orders, sales, and inventory alerts."""
    order, _, _, retailer_token = _setup_test_bulk_order(db)

    resp = client.get(
        "/api/v1/retailer/dashboard",
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert resp.status_code == 200
    metrics = resp.json()

    assert "total_orders" in metrics
    assert "pending_orders" in metrics
    assert "orders_being_packed" in metrics
    assert "monthly_sales_paise" in metrics
    assert "gross_order_value_paise" in metrics
    assert "outstanding_collections_paise" in metrics
    assert "inventory_alerts" in metrics

    assert metrics["total_orders"] >= 1
    assert metrics["retailer_name"] != ""


def test_retailer_tenant_isolation(db):
    """Verify that a customer cannot access retailer endpoints, and retailers cannot access another store's orders."""
    order, cust_token, _, retailer_token = _setup_test_bulk_order(db)

    # 1. Customer cannot access retailer order listing
    cust_resp = client.get(
        "/api/v1/retailer/orders",
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert cust_resp.status_code == 403
    assert cust_resp.json()["error"]["code"] == "FORBIDDEN"

    # 2. Customer cannot accept order
    cust_accept = client.post(
        f"/api/v1/retailer/orders/{order.id}/accept",
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert cust_accept.status_code == 403

    # 3. Create a second retailer user to verify cross-store boundary
    phone_other = "+919999900095"
    db.query(OtpVerification).filter(OtpVerification.phone == phone_other).delete()
    ret_role = db.scalars(select(Role).where(Role.name == "retailer")).first()

    # Clean prior user if exists
    existing_other = db.scalars(select(User).where(User.phone == phone_other)).first()
    if existing_other:
        if existing_other.retailer_profile:
            db.delete(existing_other.retailer_profile)
        db.delete(existing_other)
        db.commit()

    other_user = User(
        phone=phone_other,
        full_name="Second Retailer",
        role_id=ret_role.id,
        is_active=True,
    )
    db.add(other_user)
    db.flush()

    other_retailer = Retailer(
        user_id=other_user.id,
        store_name="Second Store",
        business_address="456 Other Road, Bangalore",
        phone=phone_other,
        status="active",
    )
    db.add(other_retailer)
    db.commit()

    other_token = _get_auth_token(phone_other, db)

    # Other retailer attempts to view order belonging to Sri Lakshmi Provisions
    other_resp = client.get(
        f"/api/v1/retailer/orders/{order.id}",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert other_resp.status_code == 403
    assert other_resp.json()["error"]["code"] == "RETAILER_ACCESS_DENIED"

    # Other retailer attempts to accept
    other_accept = client.post(
        f"/api/v1/retailer/orders/{order.id}/accept",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert other_accept.status_code == 403
    assert other_accept.json()["error"]["code"] == "RETAILER_ACCESS_DENIED"
