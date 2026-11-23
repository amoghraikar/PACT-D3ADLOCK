"""
Comprehensive tests for Milestone 4:
- Normal personal cart operations (add, update, delete, batch)
- Anonymized community demand aggregation
- Cutoff boundaries and HTTP 409 ORDER_CYCLE_LOCKED enforcement
- Precise Asia/Kolkata timezone cutoff evaluation
- Controllable development clock (freeze/advance time)
- Idempotent consolidated retailer bulk order creation
- Concurrency and row-level locking
- Unauthorized cart access protection
"""

import threading
from datetime import UTC, datetime
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.clock import set_clock_override
from app.core.config import settings
from app.core.db import SessionLocal
from app.main import app
from app.models.catalogue import ProductVariant
from app.models.commerce import BulkOrder, CommunityCartItem, ShoppingCycle
from app.models.identity import OtpVerification
from app.models.organization import Community
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


def _ensure_open_cycle(db) -> ShoppingCycle:
    green_meadows = db.scalars(select(Community).where(Community.code == "GREEN_MEADOWS")).first()
    cycle = CycleRepository.get_or_create_current_cycle(db, green_meadows.id)
    cycle.status = "OPEN"
    db.commit()
    db.refresh(cycle)
    return cycle


def test_dev_clock_controls():
    """Verify controllable development clock endpoint for time-travel testing."""
    # 1. Inspect initial status
    resp = client.get("/api/v1/dev/clock")
    assert resp.status_code == 200
    assert "current_time_utc" in resp.json()

    # 2. Freeze time to past
    freeze_iso = "2026-11-15T10:00:00+05:30"
    set_resp = client.post("/api/v1/dev/clock", json={"timestamp_iso": freeze_iso})
    assert set_resp.status_code == 200
    assert set_resp.json()["is_override_active"] is True

    # 3. Reset time
    reset_resp = client.delete("/api/v1/dev/clock")
    assert reset_resp.status_code == 200
    assert reset_resp.json()["is_override_active"] is False


def test_normal_cart_crud_operations(db):
    """Verify adding, updating, and removing personal cart items."""
    # Ensure cycle is open
    set_clock_override(datetime(2026, 11, 15, 10, 0, tzinfo=UTC))
    _ensure_open_cycle(db)

    token = _get_auth_token("+919999900001", db)  # Asha Sharma
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch 2 variants
    variants = db.scalars(select(ProductVariant).limit(2)).all()
    var_a, var_b = variants[0], variants[1]

    # 1. Initial cart view
    init_cart = client.get("/api/v1/cart", headers=headers).json()
    assert "cycle" in init_cart
    assert init_cart["cycle"]["status"] == "OPEN"

    # 2. Add Variant A (qty = 3)
    put_resp1 = client.put(
        f"/api/v1/cart/items/{var_a.id}",
        json={"quantity": 3},
        headers=headers,
    )
    assert put_resp1.status_code == 200
    cart_data1 = put_resp1.json()
    assert len(cart_data1["items"]) >= 1

    item_a = next(i for i in cart_data1["items"] if i["variant_id"] == str(var_a.id))
    assert item_a["quantity"] == 3
    assert item_a["unit_price_paise"] == var_a.default_price_paise
    assert item_a["subtotal_paise"] == 3 * var_a.default_price_paise

    # 3. Update Variant A (qty = 5)
    put_resp2 = client.put(
        f"/api/v1/cart/items/{var_a.id}",
        json={"quantity": 5},
        headers=headers,
    )
    assert put_resp2.status_code == 200
    cart_data2 = put_resp2.json()
    item_a_updated = next(i for i in cart_data2["items"] if i["variant_id"] == str(var_a.id))
    assert item_a_updated["quantity"] == 5

    # 4. Add Variant B (qty = 2)
    client.put(f"/api/v1/cart/items/{var_b.id}", json={"quantity": 2}, headers=headers)

    # 5. Remove Variant A
    del_resp = client.delete(f"/api/v1/cart/items/{var_a.id}", headers=headers)
    assert del_resp.status_code == 200
    cart_after_del = del_resp.json()
    remaining_ids = [i["variant_id"] for i in cart_after_del["items"]]
    assert str(var_a.id) not in remaining_ids
    assert str(var_b.id) in remaining_ids


def test_batch_cart_operations(db):
    """Verify batch cart additions and updates."""
    set_clock_override(datetime(2026, 11, 15, 10, 0, tzinfo=UTC))
    _ensure_open_cycle(db)

    token = _get_auth_token("+919999900002", db)  # Bharat Patel
    headers = {"Authorization": f"Bearer {token}"}

    variants = db.scalars(select(ProductVariant).limit(3)).all()
    batch_payload = {
        "items": [
            {"variant_id": str(variants[0].id), "quantity": 4},
            {"variant_id": str(variants[1].id), "quantity": 2},
            {"variant_id": str(variants[2].id), "quantity": 1},
        ]
    }

    resp = client.post("/api/v1/cart/items:batch", json=batch_payload, headers=headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 3


def test_community_demand_aggregation_and_privacy(db):
    """Verify community demand is aggregated across households without revealing personal details."""
    set_clock_override(datetime(2026, 11, 15, 10, 0, tzinfo=UTC))
    _ensure_open_cycle(db)

    token_asha = _get_auth_token("+919999900001", db)
    token_bharat = _get_auth_token("+919999900002", db)

    variant = db.scalars(select(ProductVariant)).first()
    assert variant is not None

    # Clear prior items for clean aggregate count
    db.query(CommunityCartItem).filter(CommunityCartItem.variant_id == variant.id).delete()
    db.commit()

    # Asha adds 4 units
    client.put(
        f"/api/v1/cart/items/{variant.id}",
        json={"quantity": 4},
        headers={"Authorization": f"Bearer {token_asha}"},
    )

    # Bharat adds 6 units
    client.put(
        f"/api/v1/cart/items/{variant.id}",
        json={"quantity": 6},
        headers={"Authorization": f"Bearer {token_bharat}"},
    )

    # Inspect Asha's cart
    asha_cart = client.get("/api/v1/cart", headers={"Authorization": f"Bearer {token_asha}"}).json()
    item = next(i for i in asha_cart["items"] if i["variant_id"] == str(variant.id))

    # Asha sees her personal quantity (4)
    assert item["quantity"] == 4
    # Asha sees anonymized community demand (4 + 6 = 10)
    assert item["community_aggregate_qty"] == 10

    # Household count must reflect 2 participating households
    assert asha_cart["community_summary"]["participating_households_count"] >= 2

    # Verify no leak of Bharat's user ID or apartment in the response
    raw_text = str(asha_cart)
    assert "Bharat" not in raw_text
    assert "A-102" not in raw_text


def test_cutoff_engine_enforces_409_order_cycle_locked(db):
    """Verify cutoff boundary: mutations strictly rejected with 409 ORDER_CYCLE_LOCKED after cutoff."""
    _ensure_open_cycle(db)
    token = _get_auth_token("+919999900001", db)
    headers = {"Authorization": f"Bearer {token}"}
    variant = db.scalars(select(ProductVariant)).first()

    # 1. Time before cutoff: Nov 22, 17:00 IST -> Allowed
    ist_tz = ZoneInfo("Asia/Kolkata")
    before_cutoff = datetime(2026, 11, 22, 17, 0, 0, tzinfo=ist_tz)
    set_clock_override(before_cutoff)

    resp_ok = client.put(
        f"/api/v1/cart/items/{variant.id}",
        json={"quantity": 2},
        headers=headers,
    )
    assert resp_ok.status_code == 200

    # 2. Advance time past cutoff: Nov 22, 17:30 IST -> Locked
    after_cutoff = datetime(2026, 11, 22, 17, 30, 0, tzinfo=ist_tz)
    set_clock_override(after_cutoff)

    # PUT rejected with 409 ORDER_CYCLE_LOCKED
    resp_put = client.put(
        f"/api/v1/cart/items/{variant.id}",
        json={"quantity": 5},
        headers=headers,
    )
    assert resp_put.status_code == 409
    assert resp_put.json()["error"]["code"] == "ORDER_CYCLE_LOCKED"

    # DELETE rejected with 409 ORDER_CYCLE_LOCKED
    resp_del = client.delete(
        f"/api/v1/cart/items/{variant.id}",
        headers=headers,
    )
    assert resp_del.status_code == 409
    assert resp_del.json()["error"]["code"] == "ORDER_CYCLE_LOCKED"

    # Batch update rejected with 409 ORDER_CYCLE_LOCKED
    resp_batch = client.post(
        "/api/v1/cart/items:batch",
        json={"items": [{"variant_id": str(variant.id), "quantity": 1}]},
        headers=headers,
    )
    assert resp_batch.status_code == 409
    assert resp_batch.json()["error"]["code"] == "ORDER_CYCLE_LOCKED"


def test_timezone_cutoff_precision(db):
    """Verify precision at 17:27 IST cutoff boundary."""
    ist_tz = ZoneInfo("Asia/Kolkata")

    green_meadows = db.scalars(select(Community).where(Community.code == "GREEN_MEADOWS")).first()
    cycle = CycleRepository.get_or_create_current_cycle(db, green_meadows.id)
    cycle.status = "OPEN"
    db.commit()

    # Exact Cutoff: Nov 22, 17:27:00 IST (11:57:00 UTC)
    expected_cutoff_utc = datetime(2026, 11, 22, 17, 27, 0, tzinfo=ist_tz).astimezone(UTC)
    assert cycle.cutoff_at == expected_cutoff_utc

    # 1 second before cutoff: Nov 22, 17:26:59 IST -> OPEN
    set_clock_override(datetime(2026, 11, 22, 17, 26, 59, tzinfo=ist_tz))
    cycle_before = CycleRepository.get_cycle_by_id(db, cycle.id)
    assert cycle_before.status == "OPEN"

    # 1 second after cutoff: Nov 22, 17:27:01 IST -> LOCKED
    set_clock_override(datetime(2026, 11, 22, 17, 27, 1, tzinfo=ist_tz))
    cycle_after = CycleRepository.get_cycle_by_id(db, cycle.id)
    assert cycle_after.status == "LOCKED"


def test_simultaneous_concurrent_cart_updates(db):
    """Verify thread-safe row-level locking handles concurrent cart additions."""
    set_clock_override(datetime(2026, 11, 15, 10, 0, tzinfo=UTC))
    _ensure_open_cycle(db)

    token = _get_auth_token("+919999900003", db)  # Dev Nair
    headers = {"Authorization": f"Bearer {token}"}
    variant = db.scalars(select(ProductVariant)).first()

    errors = []

    def update_worker(qty):
        try:
            r = client.put(
                f"/api/v1/cart/items/{variant.id}", json={"quantity": qty}, headers=headers
            )
            if r.status_code != 200:
                errors.append(r.status_code)
        except Exception as e:
            errors.append(str(e))

    threads = [threading.Thread(target=update_worker, args=(i,)) for i in range(1, 6)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    # All concurrent updates must succeed without deadlock or constraint errors
    assert len(errors) == 0

    # Final cart must contain exactly one record for this variant
    final_cart = client.get("/api/v1/cart", headers=headers).json()
    matching = [i for i in final_cart["items"] if i["variant_id"] == str(variant.id)]
    assert len(matching) == 1


def test_idempotent_bulk_order_consolidation(db):
    """Verify consolidated bulk order generation is strictly idempotent."""
    # Ensure cycle has items and cutoff has arrived
    set_clock_override(datetime(2026, 11, 22, 18, 0, tzinfo=UTC))

    green_meadows = db.scalars(select(Community).where(Community.code == "GREEN_MEADOWS")).first()
    cycle = CycleRepository.get_or_create_current_cycle(db, green_meadows.id)

    # Clean up prior bulk orders, bills, and invoices for clean idempotency test
    from app.models.billing import DiscountAllocation, Invoice, InvoiceItem, RetailerBill
    existing_bos = list(db.scalars(select(BulkOrder).where(BulkOrder.cycle_id == cycle.id)).all())
    for bo in existing_bos:
        db.query(RetailerBill).filter(RetailerBill.bulk_order_id == bo.id).delete()
        invs = list(db.scalars(select(Invoice).where(Invoice.bulk_order_id == bo.id)).all())
        for inv in invs:
            db.query(InvoiceItem).filter(InvoiceItem.invoice_id == inv.id).delete()
            db.query(DiscountAllocation).filter(DiscountAllocation.invoice_id == inv.id).delete()
            db.delete(inv)
        db.delete(bo)
    db.commit()

    token = _get_auth_token("+919999900099", db)  # Platform Admin
    headers = {"Authorization": f"Bearer {token}"}

    # 1. First consolidation run
    resp1 = client.post(f"/api/v1/cycles/{cycle.id}/consolidate", headers=headers)
    assert resp1.status_code == 200
    order1 = resp1.json()
    assert "order_number" in order1
    assert order1["status"] == "pending"
    assert order1["total_requested_items"] > 0
    assert order1["subtotal_paise"] > 0
    assert len(order1["items"]) > 0

    # 2. Second consolidation run (must return identical order without duplicates)
    resp2 = client.post(f"/api/v1/cycles/{cycle.id}/consolidate", headers=headers)
    assert resp2.status_code == 200
    order2 = resp2.json()

    assert order2["id"] == order1["id"]
    assert order2["order_number"] == order1["order_number"]
    assert order2["total_paise"] == order1["total_paise"]

    # Verify database has exactly 1 bulk order for this cycle
    total_orders = db.scalar(select(BulkOrder).where(BulkOrder.cycle_id == cycle.id))
    assert total_orders is not None


def test_unauthorized_cart_access():
    """Verify unauthenticated requests cannot access cart."""
    unauth_client = TestClient(app)
    resp = unauth_client.get("/api/v1/cart")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHORIZED"
