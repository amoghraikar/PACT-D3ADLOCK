"""
Comprehensive test suite for Milestone 7: Administration Modules.

Covers:
A. Apartment Admin (/api/v1/admin/*):
   - Community overview (buildings, apartments, registered households)
   - Dashboard metrics (participating households, billing, collections, %, deliveries)
   - Current monthly cycle status and cutoff timer
   - Resident collection status (paid and unpaid invoices)
   - Payment reminders with 1-hour rate limiting per recipient
   - Multi-channel provider adapters (in-app, SMS, WhatsApp; never claiming sent if unconfirmed)
   - Delivery readiness tracking and doorstep handover confirmation
B. Platform Admin (/api/v1/platform/*):
   - View all communities and register new community
   - View all retailers, register new retailer, and map retailer to community
   - Global transaction and GMV summaries across communities
   - Platform health monitoring and active resource counts
   - Centralized audit log inspection and action/entity filtering
   - Platform configuration management (cutoff day/time, rate limits)
C. Strict Security & Tenant Isolation:
   - Apartment Admin of Community A cannot inspect or manage Community B (HTTP 403)
   - Regular customers and retailers rejected with HTTP 403 from admin endpoints
   - Apartment Admin rejected from platform-level administrative endpoints (HTTP 403)
   - Platform Admin has explicitly authorized global access
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
from app.models.billing import (
    DiscountAllocation,
    Invoice,
    InvoiceItem,
    PaymentRecord,
    Refund,
    RetailerBill,
)
from app.models.catalogue import ProductVariant
from app.models.commerce import BulkOrder, CommunityCartItem, RetailerPackingItem, ShoppingCycle
from app.models.delivery import Delivery, DeliveryHandover
from app.models.identity import OtpVerification
from app.models.organization import Community
from app.models.system import AuditLog
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
        deliveries = list(db.scalars(select(Delivery).where(Delivery.bulk_order_id == bo.id)).all())
        for d in deliveries:
            db.query(DeliveryHandover).filter(DeliveryHandover.delivery_id == d.id).delete()
            db.delete(d)
        db.delete(bo)
    db.query(CommunityCartItem).filter(CommunityCartItem.cycle_id == cycle.id).delete()
    db.query(AuditLog).filter(AuditLog.action == "PAYMENT_REMINDER_SENT").delete()
    db.commit()


def _setup_community_order_with_invoices(db) -> tuple[BulkOrder, Invoice, str, str]:
    """Helper to prepare an active bulk order with generated invoices for Green Meadows."""
    cust_token = _get_auth_token("+919999900001", db)  # Asha Sharma (Resident)
    admin_token = _get_auth_token("+919999900031", db)  # Meera Iyer (Apartment Admin)
    plat_token = _get_auth_token("+919999900099", db)  # Platform Admin
    retailer_token = _get_auth_token("+919999900021", db)  # Ravi Mohan (Retailer)

    set_clock_override(datetime(2026, 11, 15, 10, 0, tzinfo=UTC))
    green_meadows = db.scalars(select(Community).where(Community.code == "GREEN_MEADOWS")).first()
    cycle = CycleRepository.get_or_create_current_cycle(db, green_meadows.id)
    cycle.status = "OPEN"
    db.commit()

    _clean_cycle_and_orders(db, cycle)

    # 1. Add item to cart
    variant = db.scalars(select(ProductVariant)).first()
    client.put(
        f"/api/v1/cart/items/{variant.id}",
        json={"quantity": 3},
        headers={"Authorization": f"Bearer {cust_token}"},
    )

    # 2. Consolidate bulk order
    cons_resp = client.post(
        f"/api/v1/cycles/{cycle.id}/consolidate",
        headers={"Authorization": f"Bearer {plat_token}"},
    )
    assert cons_resp.status_code == 200
    bulk_order_id = uuid.UUID(cons_resp.json()["id"])

    # 3. Accept & Pack & Send Bill via retailer
    client.post(
        f"/api/v1/retailer/orders/{bulk_order_id}/accept",
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    client.post(
        f"/api/v1/retailer/orders/{bulk_order_id}/packing",
        json={"items": [{"variant_id": str(variant.id), "packed_qty": 3}]},
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    bill_resp = client.post(
        f"/api/v1/retailer/orders/{bulk_order_id}/send-bill",
        json={"delivery_fee_paise": 1500},
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert bill_resp.status_code == 200

    order = db.get(BulkOrder, bulk_order_id)
    invoice = db.scalars(select(Invoice).where(Invoice.bulk_order_id == bulk_order_id)).first()

    return order, invoice, admin_token, cust_token


# ===========================================================================
# A. APARTMENT ADMIN TESTS
# ===========================================================================


def test_apartment_admin_community_overview(db):
    """Verify apartment admin can view community buildings, apartments, and households."""
    admin_token = _get_auth_token("+919999900031", db)  # Meera Iyer (Community Admin)

    resp = client.get(
        "/api/v1/admin/community",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["name"] == "Green Meadows Apartment"
    assert data["code"] == "GREEN_MEADOWS"
    assert data["total_buildings"] >= 1
    assert data["total_apartments"] >= 1
    assert data["total_registered_households"] >= 1


def test_apartment_admin_dashboard_metrics(db):
    """Verify apartment admin dashboard metrics returns orders, billing, and deliveries."""
    _setup_community_order_with_invoices(db)
    admin_token = _get_auth_token("+919999900031", db)

    resp = client.get(
        "/api/v1/admin/dashboard",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    metrics = resp.json()

    assert metrics["community_name"] == "Green Meadows Apartment"
    assert metrics["total_households"] >= 1
    assert metrics["participating_households"] >= 1
    assert metrics["total_billing_amount_paise"] > 0
    assert metrics["outstanding_amount_paise"] >= 0
    assert "collection_percentage" in metrics
    assert "deliveries_pending" in metrics
    assert "deliveries_completed" in metrics


def test_apartment_admin_current_cycle(db):
    """Verify apartment admin can inspect current monthly cycle countdown and demand."""
    _setup_community_order_with_invoices(db)
    admin_token = _get_auth_token("+919999900031", db)

    resp = client.get(
        "/api/v1/admin/cycle",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    cycle_data = resp.json()

    assert "cycle_month" in cycle_data
    assert "cutoff_at" in cycle_data
    assert cycle_data["total_requested_units"] >= 1
    assert cycle_data["participating_households_count"] >= 1


def test_apartment_admin_resident_collections_and_filter(db):
    """Verify apartment admin can list resident invoices and filter by paid/unpaid status."""
    _, invoice, admin_token, _ = _setup_community_order_with_invoices(db)

    # 1. Fetch all collections
    resp = client.get(
        "/api/v1/admin/invoices",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_invoices"] >= 1
    assert data["total_billed_paise"] > 0

    found_inv = next((i for i in data["items"] if i["invoice_id"] == str(invoice.id)), None)
    assert found_inv is not None
    assert found_inv["outstanding_amount_paise"] > 0

    # 2. Filter by unpaid
    resp_unpaid = client.get(
        "/api/v1/admin/invoices?status=unpaid",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp_unpaid.status_code == 200
    assert len(resp_unpaid.json()["items"]) >= 1

    # 3. Filter by paid (none paid yet)
    resp_paid = client.get(
        "/api/v1/admin/invoices?status=paid",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp_paid.status_code == 200
    paid_ids = [i["invoice_id"] for i in resp_paid.json()["items"]]
    assert str(invoice.id) not in paid_ids


def test_trigger_payment_reminder_and_rate_limiting(db):
    """
    Verify payment reminder:
    1. First reminder succeeds and returns confirmed channels.
    2. Second reminder within 1 hour is rate limited with HTTP 429.
    3. Multi-channel adapters never pretend a message was sent if unconfirmed.
    """
    _, invoice, admin_token, _ = _setup_community_order_with_invoices(db)

    # 1. First reminder dispatch
    payload = {
        "channels": ["in_app", "sms", "whatsapp"],
        "custom_message": "Friendly reminder: your monthly grocery bill is ready.",
    }
    resp1 = client.post(
        f"/api/v1/admin/invoices/{invoice.id}/remind",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp1.status_code == 200
    rem_data = resp1.json()

    assert rem_data["invoice_id"] == str(invoice.id)
    assert "in_app" in rem_data["channels_confirmed"]
    assert len(rem_data["details"]) == 3

    # Every detail report must have valid provider status
    for detail in rem_data["details"]:
        assert detail["status"] in ("sent", "unconfigured", "failed")
        if detail["status"] == "sent":
            assert detail["provider_message_id"] is not None

    # 2. Immediate second reminder within 1 hour must fail with HTTP 429 RATE_LIMITED
    resp2 = client.post(
        f"/api/v1/admin/invoices/{invoice.id}/remind",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp2.status_code == 429
    assert resp2.json()["error"]["code"] == "REMINDER_RATE_LIMITED"


def test_delivery_readiness_and_handover_confirmation(db):
    """Verify delivery tracking and doorstep handover confirmation."""
    order, _, admin_token, _ = _setup_community_order_with_invoices(db)

    # 1. Track deliveries
    del_resp = client.get(
        "/api/v1/admin/deliveries",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_resp.status_code == 200
    del_data = del_resp.json()

    assert del_data["bulk_order_id"] == str(order.id)
    assert del_data["total_handovers"] >= 1
    assert del_data["pending_handovers"] >= 1

    handover = del_data["handovers"][0]
    handover_id = handover["handover_id"]
    assert handover["status"] == "pending"

    # 2. Confirm doorstep handover
    conf_resp = client.post(
        f"/api/v1/admin/deliveries/handovers/{handover_id}/confirm",
        json={"notes": "Handed over directly to resident at door."},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert conf_resp.status_code == 200
    conf_data = conf_resp.json()
    assert conf_data["status"] == "handed_over"
    assert conf_data["handover_timestamp"] is not None

    # 3. Verify handover status updated in delivery tracking
    del_resp2 = client.get(
        "/api/v1/admin/deliveries",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_resp2.status_code == 200
    assert del_resp2.json()["completed_handovers"] >= 1


# ===========================================================================
# B. PLATFORM ADMIN TESTS
# ===========================================================================


def test_platform_admin_communities_crud(db):
    """Verify platform admin can list all communities and register new ones."""
    plat_token = _get_auth_token("+919999900099", db)  # Platform Admin

    # 1. List communities
    list_resp = client.get(
        "/api/v1/platform/communities",
        headers={"Authorization": f"Bearer {plat_token}"},
    )
    assert list_resp.status_code == 200
    comms = list_resp.json()
    assert len(comms) >= 1

    # 2. Create new community
    code = f"NEW_COMM_{uuid.uuid4().hex[:4].upper()}"
    create_payload = {
        "name": "Oakwood Heights",
        "code": code,
        "address": "789 Sarjapur Main Road",
        "city": "Bengaluru",
        "postal_code": "560035",
    }
    create_resp = client.post(
        "/api/v1/platform/communities",
        json=create_payload,
        headers={"Authorization": f"Bearer {plat_token}"},
    )
    assert create_resp.status_code == 201
    created = create_resp.json()
    assert created["name"] == "Oakwood Heights"
    assert created["code"] == code

    # 3. Duplicate code fails with 409
    dup_resp = client.post(
        "/api/v1/platform/communities",
        json=create_payload,
        headers={"Authorization": f"Bearer {plat_token}"},
    )
    assert dup_resp.status_code == 409
    assert dup_resp.json()["error"]["code"] == "COMMUNITY_CODE_TAKEN"


def test_platform_admin_retailers_and_mapping(db):
    """Verify platform admin can list, create, and map retailers to communities."""
    plat_token = _get_auth_token("+919999900099", db)

    # 1. List retailers
    ret_resp = client.get(
        "/api/v1/platform/retailers",
        headers={"Authorization": f"Bearer {plat_token}"},
    )
    assert ret_resp.status_code == 200
    rets = ret_resp.json()
    assert len(rets) >= 1

    # 2. Create a new merchant retailer
    phone = f"+9199999{uuid.uuid4().int % 90000 + 10000}"
    create_ret_payload = {
        "phone": phone,
        "full_name": "Karthik Verma",
        "store_name": "Verma Daily Needs",
        "business_address": "12 Commercial Street",
        "gstin": "29AABCV1234F1Z5",
    }
    create_ret_resp = client.post(
        "/api/v1/platform/retailers",
        json=create_ret_payload,
        headers={"Authorization": f"Bearer {plat_token}"},
    )
    assert create_ret_resp.status_code == 201
    new_ret = create_ret_resp.json()
    assert new_ret["store_name"] == "Verma Daily Needs"

    # 3. Map retailer to Green Meadows community
    comm = db.scalars(select(Community).where(Community.code == "GREEN_MEADOWS")).first()
    map_payload = {
        "retailer_id": new_ret["id"],
        "community_id": str(comm.id),
        "delivery_fee_paise": 2000,
        "is_primary": False,
        "is_active": True,
    }
    map_resp = client.post(
        "/api/v1/platform/retailer-mappings",
        json=map_payload,
        headers={"Authorization": f"Bearer {plat_token}"},
    )
    assert map_resp.status_code == 200
    mapped = map_resp.json()
    assert mapped["retailer_store_name"] == "Verma Daily Needs"
    assert mapped["delivery_fee_paise"] == 2000


def test_platform_admin_global_transactions(db):
    """Verify platform admin can view cross-community transaction summaries and GMV."""
    plat_token = _get_auth_token("+919999900099", db)

    resp = client.get(
        "/api/v1/platform/transactions",
        headers={"Authorization": f"Bearer {plat_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert "total_orders" in data
    assert "total_gross_paise" in data
    assert "total_net_paise" in data
    assert "total_collected_paise" in data
    assert "total_outstanding_paise" in data


def test_platform_admin_health_and_audit_logs(db):
    """Verify platform admin can inspect system health and centralized audit logs."""
    plat_token = _get_auth_token("+919999900099", db)

    # 1. Health metrics
    health_resp = client.get(
        "/api/v1/platform/health",
        headers={"Authorization": f"Bearer {plat_token}"},
    )
    assert health_resp.status_code == 200
    health_data = health_resp.json()
    assert health_data["status"] == "healthy"
    assert health_data["database"] == "connected"
    assert health_data["active_communities_count"] >= 1
    assert health_data["active_retailers_count"] >= 1

    # 2. Audit logs
    audit_resp = client.get(
        "/api/v1/platform/audit-logs?page=1&limit=20",
        headers={"Authorization": f"Bearer {plat_token}"},
    )
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    assert isinstance(logs, list)
    assert len(logs) >= 1
    assert "action" in logs[0]
    assert "entity_type" in logs[0]


def test_platform_admin_config_management(db):
    """Verify platform admin can view and update runtime platform settings."""
    plat_token = _get_auth_token("+919999900099", db)

    # 1. Get config
    cfg_resp = client.get(
        "/api/v1/platform/config",
        headers={"Authorization": f"Bearer {plat_token}"},
    )
    assert cfg_resp.status_code == 200
    cfg = cfg_resp.json()
    assert cfg["cutoff_day"] == 22
    assert cfg["cutoff_time"] == "17:27"

    # 2. Update config
    patch_resp = client.patch(
        "/api/v1/platform/config",
        json={"cutoff_day": 25, "cutoff_time": "18:00"},
        headers={"Authorization": f"Bearer {plat_token}"},
    )
    assert patch_resp.status_code == 200
    updated_cfg = patch_resp.json()
    assert updated_cfg["cutoff_day"] == 25
    assert updated_cfg["cutoff_time"] == "18:00"

    # Reset back to default
    client.patch(
        "/api/v1/platform/config",
        json={"cutoff_day": 22, "cutoff_time": "17:27"},
        headers={"Authorization": f"Bearer {plat_token}"},
    )


# ===========================================================================
# C. SECURITY & TENANT ISOLATION TESTS
# ===========================================================================


def test_admin_tenant_isolation_and_rbac(db):
    """
    Verify security & tenant boundary:
    1. Customer cannot access /admin or /platform (403).
    2. Retailer cannot access /admin or /platform (403).
    3. Apartment Admin cannot access /platform (403).
    4. Apartment Admin cannot access another community's /admin endpoints (403).
    """
    cust_token = _get_auth_token("+919999900001", db)
    retailer_token = _get_auth_token("+919999900021", db)
    admin_token = _get_auth_token("+919999900031", db)  # Meera (Green Meadows Admin)

    # 1. Customer blocked from /admin and /platform
    assert client.get(
        "/api/v1/admin/community",
        headers={"Authorization": f"Bearer {cust_token}"},
    ).status_code == 403

    assert client.get(
        "/api/v1/platform/communities",
        headers={"Authorization": f"Bearer {cust_token}"},
    ).status_code == 403

    # 2. Retailer blocked from /admin and /platform
    assert client.get(
        "/api/v1/admin/dashboard",
        headers={"Authorization": f"Bearer {retailer_token}"},
    ).status_code == 403

    assert client.get(
        "/api/v1/platform/communities",
        headers={"Authorization": f"Bearer {retailer_token}"},
    ).status_code == 403

    # 3. Apartment Admin blocked from /platform
    assert client.get(
        "/api/v1/platform/communities",
        headers={"Authorization": f"Bearer {admin_token}"},
    ).status_code == 403

    # 4. Apartment Admin blocked from cross-community access
    random_comm_id = uuid.uuid4()
    assert client.get(
        f"/api/v1/admin/community?community_id={random_comm_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    ).status_code == 403
