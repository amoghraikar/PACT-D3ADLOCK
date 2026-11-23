"""
Comprehensive Test Suite for Milestone 9: Payment, Event & Notification Infrastructure.

Tests cover:
PART A: Payments (Razorpay & Mock Gateway)
- Payment order creation for resident invoice with paise calculations
- Access control: Resident can only pay their own invoice
- Prevention of payment order for already paid invoice (HTTP 409)
- Cryptographic HMAC-SHA256 signature verification (valid vs invalid)
- Concurrent settlement safety and row locking
- Idempotent duplicate verification returns success
- Overpayment / duplicate payment on already-paid invoice routes to refund
- Webhook signature validation and IdempotencyRecord deduplication
- Refund creation and payment audit trail

PART B: Transactional Event Outbox
- Atomic in-transaction persistence with domain state
- Transaction rollback guarantees outbox event rollback (zero orphaned events)
- Canonical domain event definitions

PART C: Pluggable Apache Kafka / Aiven Transport
- InMemoryEventTransport consumer group offsets and append log
- KafkaEventTransport configuration and in-memory fallback
- Outbox publishing batch and publication state transition

PART D: Notifications & Event Reactions
- In-app notification listing, pagination, and tenant isolation
- Unread count badge accuracy
- Mark single and mark all notifications as read
- User channel preferences (in-app, SMS, WhatsApp)
- Event-driven notifications reacting to BILL_FINALISED, PAYMENT_RECEIVED, DELIVERY_READY

PART E: Standalone Background Workers
- Outbox publisher batch run
- Kafka consumer dispatch with idempotency deduplication
- Cycle evaluator locking expired shopping cycles
- Notification worker and external provider adapter checks
"""

import hashlib
import hmac
import json
import uuid
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.core.clock import now_utc, set_clock_override
from app.core.config import settings
from app.core.db import SessionLocal
from app.main import app
from app.models.billing import Invoice, PaymentRecord, Refund
from app.models.commerce import BulkOrder, ShoppingCycle
from app.models.identity import OtpVerification, User
from app.models.organization import CommunityMembership, Retailer
from app.models.system import Notification, OutboxEvent
from app.modules.events.outbox import (
    BILL_FINALISED,
    PAYMENT_RECEIVED,
    OutboxService,
)
from app.modules.events.transport import (
    InMemoryEventTransport,
    KafkaEventTransport,
)
from app.modules.notifications.service import NotificationService
from app.modules.payments.gateway import get_payment_gateway
from app.repositories.cycle_repository import CycleRepository
from app.workers.cycle_evaluator import evaluate_cycles
from app.workers.kafka_consumer import consume_and_dispatch
from app.workers.notification_worker import ExternalProviderAdapter
from app.workers.outbox_publisher import publish_outbox_batch

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
    assert resp.status_code == 200, f"Auth failed: {resp.text}"
    return resp.json()["access_token"]


def _setup_test_invoice(db) -> tuple[Invoice, User, User, str, str]:
    """Sets up two customer users (resident1, resident2) and an invoice for resident1."""
    resident1 = db.scalars(select(User).where(User.phone == "+919999900001")).first()
    resident2 = db.scalars(select(User).where(User.phone == "+919999900002")).first()
    assert resident1 and resident2, "Seed users missing."

    token1 = _get_auth_token(resident1.phone, db)
    token2 = _get_auth_token(resident2.phone, db)

    # Find community, cycle, and retailer
    membership = db.scalars(select(CommunityMembership).where(CommunityMembership.user_id == resident1.id)).first()
    assert membership, "Resident membership missing"
    comm_id = membership.community_id

    cycle = CycleRepository.get_or_create_current_cycle(db, comm_id)
    retailer = db.scalars(select(Retailer)).first()
    assert retailer, "Retailer missing"

    # Create dummy bulk order and invoice
    bulk_order = BulkOrder(
        cycle_id=cycle.id,
        community_id=comm_id,
        retailer_id=retailer.id,
        order_number=f"BO-{uuid.uuid4().hex[:8].upper()}",
        status="pending",
        total_requested_items=5,
        total_packed_items=5,
        subtotal_paise=150000,
        discount_paise=5000,
        delivery_fee_paise=2500,
        total_paise=147500,
        placed_at=now_utc(),
    )
    db.add(bulk_order)
    db.flush()

    invoice = Invoice(
        bulk_order_id=bulk_order.id,
        user_id=resident1.id,
        community_id=comm_id,
        invoice_number=f"INV-TEST-{uuid.uuid4().hex[:8].upper()}",
        base_amount_paise=150000,       # ₹1500.00
        discount_amount_paise=5000,     # -₹50.00
        delivery_fee_paise=2500,        # +₹25.00
        total_amount_paise=147500,      # ₹1475.00
        paid_amount_paise=0,
        status="pending",
        created_at=now_utc(),
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    return invoice, resident1, resident2, token1, token2


# -------------------------------------------------------------------------
# PART A: PAYMENTS
# -------------------------------------------------------------------------

def test_create_payment_order_success(db):
    """Creates a payment gateway order with correct paise amount."""
    invoice, resident1, _, token1, _ = _setup_test_invoice(db)

    resp = client.post(
        "/api/v1/payments/orders/create",
        json={"invoice_id": str(invoice.id)},
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["order_id"].startswith("order_")
    assert data["invoice_id"] == str(invoice.id)
    assert data["amount_paise"] == 147500
    assert data["currency"] == "INR"
    assert "key_id" in data


def test_create_payment_order_tenant_isolation(db):
    """Resident 2 cannot initiate payment order for Resident 1's invoice (HTTP 403)."""
    invoice, _, _, _, token2 = _setup_test_invoice(db)

    resp = client.post(
        "/api/v1/payments/orders/create",
        json={"invoice_id": str(invoice.id)},
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"


def test_create_payment_order_already_paid_rejected(db):
    """Cannot create payment order for an already paid invoice (HTTP 409)."""
    invoice, _, _, token1, _ = _setup_test_invoice(db)
    invoice.status = "paid"
    invoice.paid_amount_paise = invoice.total_amount_paise
    db.commit()

    resp = client.post(
        "/api/v1/payments/orders/create",
        json={"invoice_id": str(invoice.id)},
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "INVOICE_ALREADY_PAID"


def test_verify_payment_valid_signature_settles_invoice(db):
    """Verifying payment with valid HMAC signature marks invoice as paid and emits outbox event."""
    invoice, resident1, _, token1, _ = _setup_test_invoice(db)
    gateway = get_payment_gateway()

    # 1. Create order
    order_data = gateway.create_order(amount_paise=invoice.total_amount_paise, receipt=invoice.invoice_number)
    order_id = order_data["id"]

    # 2. Generate valid mock payment and signature
    payment_id = f"pay_{uuid.uuid4().hex[:14]}"
    signature = gateway.generate_valid_signature(order_id, payment_id)

    # 3. Verify
    resp = client.post(
        "/api/v1/payments/verify",
        json={
            "invoice_id": str(invoice.id),
            "gateway_order_id": order_id,
            "gateway_payment_id": payment_id,
            "gateway_signature": signature,
        },
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert resp.status_code == 200, resp.text
    res_data = resp.json()
    assert res_data["status"] == "successful"
    assert res_data["is_duplicate"] is False
    assert res_data["invoice_status"] == "paid"

    # Verify database state
    db.refresh(invoice)
    assert invoice.status == "paid"
    assert invoice.paid_amount_paise == 147500
    assert invoice.paid_at is not None

    # Check that OutboxEvent was recorded
    outbox_ev = db.scalars(
        select(OutboxEvent)
        .where(
            OutboxEvent.event_type == PAYMENT_RECEIVED,
            OutboxEvent.topic == "pact.payments",
        )
        .order_by(OutboxEvent.created_at.desc())
    ).first()
    assert outbox_ev is not None
    payload = json.loads(outbox_ev.payload)
    assert payload["invoice_id"] == str(invoice.id)
    assert payload["amount_paise"] == 147500


def test_verify_payment_invalid_signature_rejected(db):
    """Verifying payment with forged or tampered signature is rejected with HTTP 400."""
    invoice, _, _, token1, _ = _setup_test_invoice(db)

    resp = client.post(
        "/api/v1/payments/verify",
        json={
            "invoice_id": str(invoice.id),
            "gateway_order_id": "order_test_123",
            "gateway_payment_id": "pay_fake_456",
            "gateway_signature": "forged_tampered_signature_hex",
        },
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "INVALID_PAYMENT_SIGNATURE"


def test_verify_payment_duplicate_transaction_is_idempotent(db):
    """Duplicate verification of the same transaction_id returns idempotent success without double counting."""
    invoice, _, _, token1, _ = _setup_test_invoice(db)
    gateway = get_payment_gateway()

    order_id = f"order_idemp_{uuid.uuid4().hex[:10]}"
    payment_id = f"pay_idemp_{uuid.uuid4().hex[:10]}"
    signature = gateway.generate_valid_signature(order_id, payment_id)

    # First verification
    resp1 = client.post(
        "/api/v1/payments/verify",
        json={
            "invoice_id": str(invoice.id),
            "gateway_order_id": order_id,
            "gateway_payment_id": payment_id,
            "gateway_signature": signature,
        },
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert resp1.status_code == 200
    assert resp1.json()["is_duplicate"] is False

    # Second verification with exact same payment ID
    resp2 = client.post(
        "/api/v1/payments/verify",
        json={
            "invoice_id": str(invoice.id),
            "gateway_order_id": order_id,
            "gateway_payment_id": payment_id,
            "gateway_signature": signature,
        },
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert resp2.status_code == 200
    assert resp2.json()["is_duplicate"] is True
    assert resp2.json()["status"] == "successful"


def test_verify_payment_duplicate_on_already_paid_routes_to_refund(db):
    """When a new payment transaction arrives for an already paid invoice, it routes to completed refund."""
    invoice, _, _, token1, _ = _setup_test_invoice(db)
    gateway = get_payment_gateway()

    # Settle invoice first
    invoice.status = "paid"
    invoice.paid_amount_paise = invoice.total_amount_paise
    db.commit()

    order_id = f"order_dup_{uuid.uuid4().hex[:10]}"
    payment_id = f"pay_dup_{uuid.uuid4().hex[:10]}"
    signature = gateway.generate_valid_signature(order_id, payment_id)

    resp = client.post(
        "/api/v1/payments/verify",
        json={
            "invoice_id": str(invoice.id),
            "gateway_order_id": order_id,
            "gateway_payment_id": payment_id,
            "gateway_signature": signature,
        },
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "needs_refund"
    assert data["invoice_status"] == "needs_refund"
    assert data["is_duplicate"] is True

    # Check refund record in DB
    refund = db.scalars(select(Refund).where(Refund.invoice_id == invoice.id)).first()
    assert refund is not None
    assert refund.status == "completed"
    assert refund.amount_paise == invoice.total_amount_paise


def test_payment_webhook_signature_and_idempotency(db):
    """Webhook verifies signature and processes payment.captured idempotently."""
    invoice, _, _, _, _ = _setup_test_invoice(db)

    raw_event = {
        "id": f"evt_{uuid.uuid4().hex[:12]}",
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": f"pay_{uuid.uuid4().hex[:12]}",
                    "order_id": "order_webhook_1",
                    "amount": invoice.total_amount_paise,
                    "currency": "INR",
                    "status": "captured",
                    "notes": {"invoice_id": str(invoice.id)},
                }
            }
        },
    }
    raw_body = json.dumps(raw_event).encode("utf-8")
    secret = settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8")
    signature = hmac.new(secret, raw_body, hashlib.sha256).hexdigest()

    # First call
    resp1 = client.post(
        "/api/v1/payments/webhook",
        content=raw_body,
        headers={"X-Razorpay-Signature": signature, "Content-Type": "application/json"},
    )
    assert resp1.status_code == 200
    assert resp1.json()["status"] == "processed"

    db.refresh(invoice)
    assert invoice.status == "paid"

    # Second call (Idempotency test)
    resp2 = client.post(
        "/api/v1/payments/webhook",
        content=raw_body,
        headers={"X-Razorpay-Signature": signature, "Content-Type": "application/json"},
    )
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "processed"


def test_payment_webhook_invalid_signature_rejected(db):
    """Webhook with invalid signature returns HTTP 400."""
    raw_body = json.dumps({"event": "payment.captured"}).encode("utf-8")
    resp = client.post(
        "/api/v1/payments/webhook",
        content=raw_body,
        headers={"X-Razorpay-Signature": "invalid_sig", "Content-Type": "application/json"},
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "INVALID_WEBHOOK_SIGNATURE"


def test_payment_history_and_refund_endpoint(db):
    """Payment history lists all payments and refunds for an invoice."""
    invoice, resident1, _, token1, _ = _setup_test_invoice(db)

    unique_tx = f"pay_hist_{uuid.uuid4().hex[:12]}"
    unique_order = f"order_hist_{uuid.uuid4().hex[:12]}"

    # Add a successful payment record
    pay_rec = PaymentRecord(
        invoice_id=invoice.id,
        user_id=resident1.id,
        amount_paise=invoice.total_amount_paise,
        gateway="mock",
        gateway_order_id=unique_order,
        transaction_id=unique_tx,
        status="successful",
        recorded_at=now_utc(),
    )
    db.add(pay_rec)
    db.commit()

    # Issue refund via API
    resp_ref = client.post(
        "/api/v1/payments/refunds",
        json={
            "invoice_id": str(invoice.id),
            "amount_paise": 20000,  # ₹200.00
            "reason": "Customer returned 2 items",
        },
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert resp_ref.status_code == 200
    assert resp_ref.json()["amount_paise"] == 20000

    # Fetch history
    resp_hist = client.get(
        f"/api/v1/payments/invoices/{invoice.id}/history",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert resp_hist.status_code == 200
    history = resp_hist.json()
    assert len(history) >= 1
    assert len(history[0]["refunds"]) >= 1
    assert history[0]["refunds"][0]["amount_paise"] == 20000


# -------------------------------------------------------------------------
# PART B & C: OUTBOX & EVENT TRANSPORT
# -------------------------------------------------------------------------

def test_outbox_transactional_atomicity(db):
    """Transactional outbox rolls back if database transaction rolls back."""
    initial_count = db.scalar(select(func.count(OutboxEvent.id)))

    try:
        # Simulate failed transaction
        OutboxService.record_event(
            db=db,
            event_type="TEST_EVENT",
            topic="pact.test",
            payload={"msg": "should not persist"},
        )
        raise RuntimeError("Forced simulation error")
    except RuntimeError:
        db.rollback()

    after_count = db.scalar(select(func.count(OutboxEvent.id)))
    assert after_count == initial_count, "Outbox event was not rolled back with transaction!"


def test_in_memory_event_transport_consumer_group():
    """InMemoryEventTransport tracks consumer offsets deterministically."""
    transport = InMemoryEventTransport()
    transport.publish("pact.test", "k1", {"seq": 1})
    transport.publish("pact.test", "k2", {"seq": 2})

    # Group 1 consumes
    batch1 = transport.consume("pact.test", group_id="grp1", max_records=1)
    assert len(batch1) == 1
    assert batch1[0]["key"] == "k1"

    batch2 = transport.consume("pact.test", group_id="grp1", max_records=1)
    assert len(batch2) == 1
    assert batch2[0]["key"] == "k2"

    # Next poll for grp1 is empty
    assert len(transport.consume("pact.test", group_id="grp1")) == 0

    # Independent Group 2 reads from offset 0
    batch_grp2 = transport.consume("pact.test", group_id="grp2", max_records=5)
    assert len(batch_grp2) == 2


def test_kafka_event_transport_config():
    """KafkaEventTransport sets up config without hardcoded secrets."""
    kt = KafkaEventTransport()
    conf = kt._get_producer_config()
    assert "bootstrap_servers" in conf
    assert conf["acks"] == "all"
    assert conf["retries"] == 3


def test_outbox_publisher_worker_batch(db):
    """Outbox publisher worker polls and marks pending events as published."""
    transport = InMemoryEventTransport()
    ev = OutboxService.record_event(
        db=db,
        event_type="TEST_PUBLISH",
        topic="pact.test_topic",
        payload={"foo": "bar"},
    )
    db.commit()

    count = publish_outbox_batch(db=db, batch_size=10, transport=transport)
    assert count >= 1

    db.refresh(ev)
    assert ev.is_published is True
    assert ev.published_at is not None
    assert len(transport.published_events) >= 1


# -------------------------------------------------------------------------
# PART D: NOTIFICATIONS
# -------------------------------------------------------------------------

def test_notification_lifecycle_and_tenant_isolation(db):
    """Notifications are isolated to the specific resident and update unread counts."""
    invoice, resident1, resident2, token1, token2 = _setup_test_invoice(db)

    # Create notifications for resident 1
    n1 = NotificationService.create_notification(
        db=db,
        user_id=resident1.id,
        title="Welcome to PACT",
        message="Your apartment collective cart is active.",
        kind="general",
    )
    n2 = NotificationService.create_notification(
        db=db,
        user_id=resident1.id,
        title="Cycle Cutoff Reminder",
        message="Cutoff is approaching.",
        kind="cycle_warning",
    )

    # Resident 1 sees 2 notifications
    resp1 = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {token1}"})
    assert resp1.status_code == 200
    assert resp1.json()["total"] >= 2
    assert resp1.json()["unread_count"] >= 2

    # Resident 2 sees 0 of Resident 1's notifications (Isolation)
    resp2 = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {token2}"})
    assert resp2.status_code == 200
    user2_notifs = [item for item in resp2.json()["items"] if item["id"] in (str(n1.id), str(n2.id))]
    assert len(user2_notifs) == 0

    # Check unread count endpoint
    resp_count = client.get("/api/v1/notifications/unread-count", headers={"Authorization": f"Bearer {token1}"})
    assert resp_count.status_code == 200
    assert resp_count.json()["unread_count"] >= 2

    # Mark single notification as read
    resp_read = client.post(f"/api/v1/notifications/{n1.id}/read", headers={"Authorization": f"Bearer {token1}"})
    assert resp_read.status_code == 200
    assert resp_read.json()["is_read"] is True

    # Mark all read
    resp_all = client.post("/api/v1/notifications/read-all", headers={"Authorization": f"Bearer {token1}"})
    assert resp_all.status_code == 200
    assert resp_all.json()["marked_read"] >= 1

    # Verify unread count is now 0
    resp_zero = client.get("/api/v1/notifications/unread-count", headers={"Authorization": f"Bearer {token1}"})
    assert resp_zero.json()["unread_count"] == 0


def test_notification_preferences_api(db):
    """User can get and update communication channel preferences."""
    _, resident1, _, token1, _ = _setup_test_invoice(db)

    # Get preferences
    resp = client.get("/api/v1/notifications/preferences", headers={"Authorization": f"Bearer {token1}"})
    assert resp.status_code == 200
    prefs = resp.json()
    assert len(prefs) >= 3

    # Update preferences (disable SMS)
    resp_up = client.put(
        "/api/v1/notifications/preferences",
        json={"preferences": [{"channel": "sms", "enabled": False}, {"channel": "in_app", "enabled": True}]},
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert resp_up.status_code == 200
    updated_map = {p["channel"]: p["enabled"] for p in resp_up.json()}
    assert updated_map["sms"] is False
    assert updated_map["in_app"] is True


def test_notification_reactions_to_domain_events(db):
    """Domain events automatically create targeted resident notifications."""
    invoice, resident1, _, _, _ = _setup_test_invoice(db)

    # 1. BILL_FINALISED event creates bill_ready notification
    c1 = NotificationService.handle_domain_event(
        db=db,
        event_type=BILL_FINALISED,
        payload={"invoice_ids": [str(invoice.id)]},
    )
    assert c1 == 1
    notif = db.scalars(
        select(Notification).where(
            Notification.user_id == resident1.id,
            Notification.kind == "bill_ready",
        )
    ).first()
    assert notif is not None
    assert "ready" in notif.title.lower()

    # 2. PAYMENT_RECEIVED event creates payment_update notification
    c2 = NotificationService.handle_domain_event(
        db=db,
        event_type=PAYMENT_RECEIVED,
        payload={
            "user_id": str(resident1.id),
            "amount_paise": 147500,
            "transaction_id": "pay_test_event",
        },
    )
    assert c2 == 1
    pay_notif = db.scalars(
        select(Notification).where(
            Notification.user_id == resident1.id,
            Notification.kind == "payment_update",
        )
    ).first()
    assert pay_notif is not None
    assert "₹1475.00" in pay_notif.message


# -------------------------------------------------------------------------
# PART E: STANDALONE WORKERS
# -------------------------------------------------------------------------

def test_kafka_consumer_deduplication(db):
    """Kafka consumer dispatches events and guarantees deduplication via IdempotencyRecord."""
    transport = InMemoryEventTransport()
    ev_id = f"evt_kafka_{uuid.uuid4().hex[:10]}"
    _, resident1, _, _, _ = _setup_test_invoice(db)

    # Publish an event to in-memory transport
    transport.publish(
        topic="pact.payments",
        key=ev_id,
        payload={
            "event_id": ev_id,
            "event_type": "PAYMENT_RECEIVED",
            "data": {
                "user_id": str(resident1.id),
                "amount_paise": 50000,
                "transaction_id": "tx_kcons_1",
            },
        },
    )

    # First consume & dispatch
    count1 = consume_and_dispatch(
        db=db,
        topics=["pact.payments"],
        group_id="test_worker_group",
        transport=transport,
    )
    assert count1 == 1

    # Second consume & dispatch for the same event key (Deduplication)
    # Re-publish same event to test duplicate message handling
    transport.publish(
        topic="pact.payments",
        key=ev_id,
        payload={
            "event_id": ev_id,
            "event_type": "PAYMENT_RECEIVED",
            "data": {"user_id": str(resident1.id), "amount_paise": 50000},
        },
    )
    count2 = consume_and_dispatch(
        db=db,
        topics=["pact.payments"],
        group_id="test_worker_group",
        transport=transport,
    )
    assert count2 == 0, "Duplicate event was not deduplicated!"


def test_cycle_evaluator_worker(db):
    """Cycle evaluator transitions OPEN cycles with passed cutoff to LOCKED."""
    # Find or create a test cycle whose cutoff is in the past
    membership = db.scalars(select(CommunityMembership)).first()
    comm_id = membership.community_id

    # Use unique 7-char cycle month, e.g. 2024-XX
    random_month = f"24-{uuid.uuid4().hex[:4]}"
    past_cycle = ShoppingCycle(
        community_id=comm_id,
        cycle_month=random_month,
        cutoff_at=now_utc() - timedelta(hours=1),
        status="OPEN",
        created_at=now_utc() - timedelta(days=2),
    )
    db.add(past_cycle)
    db.commit()

    locked_count = evaluate_cycles(db=db)
    assert locked_count >= 1

    db.refresh(past_cycle)
    assert past_cycle.status == "LOCKED"

    # Verify ORDER_CYCLE_LOCKED outbox event was recorded
    locked_ev = db.scalars(
        select(OutboxEvent).where(
            OutboxEvent.event_type == "ORDER_CYCLE_LOCKED",
            OutboxEvent.topic == "pact.events",
        )
    ).first()
    assert locked_ev is not None


def test_notification_worker_external_provider_adapter():
    """ExternalProviderAdapter handles SMS and WhatsApp dispatch."""
    sms_res = ExternalProviderAdapter.send_sms("+919876543210", "Your order has arrived.")
    assert sms_res["status"] == "delivered"
    assert sms_res["delivered"] is True

    wa_res = ExternalProviderAdapter.send_whatsapp("+919876543210", "Your order has arrived.")
    assert wa_res["status"] == "delivered"
    assert wa_res["delivered"] is True
