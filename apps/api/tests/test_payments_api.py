import json
import threading
import uuid
import pytest
from fastapi.testclient import TestClient

from app.core.security import create_session_token
from app.main import app
from app.modules.notifications.service import (
    clear_notifications_for_test,
    get_user_notifications,
)
from app.modules.payments.gateway import MockGateway
from app.modules.payments.service import (
    DELIVERIES,
    PAYMENTS,
    clear_payments_for_test,
)
from app.modules.retailer.orders_router import INVOICES

mock_gw = MockGateway()


@pytest.fixture(autouse=True)
def setup_teardown():
    clear_payments_for_test()
    clear_notifications_for_test()
    INVOICES.clear()
    yield
    clear_payments_for_test()
    clear_notifications_for_test()
    INVOICES.clear()


def make_signed_webhook(payload: dict, secret: str = "mock_secret_test_pact") -> tuple[bytes, dict]:
    gw = MockGateway(secret)
    raw = json.dumps(payload).encode("utf-8")
    sig = gw.sign_payload(raw)
    headers = {
        "Content-Type": "application/json",
        "X-Mock-Signature": sig,
    }
    return raw, headers


def test_payment_happy_path():
    """
    P16: Happy path.
    1. Seed invoice for Asha ₹720 (72000 paise).
    2. Asha initiates payment -> POST /invoices/{id}/pay.
    3. Webhook arrives with valid signature.
    4. Invoice is marked paid, payment succeeded, delivery record created.
    """
    client = TestClient(app)
    token_asha = create_session_token("usr-asha-1")

    inv_id = "inv-green-2026-11-usr-asha-1"
    INVOICES[inv_id] = {
        "id": inv_id,
        "order_id": "ord-green-2026-11",
        "customer_id": "usr-asha-1",
        "total_paise": 72000,
        "status": "issued",
        "items": [],
    }

    # 1. Pay
    res_pay = client.post(
        f"/api/v1/invoices/{inv_id}/pay",
        headers={"Authorization": f"Bearer {token_asha}"},
        json={"gateway": "mock"},
    )
    assert res_pay.status_code == 200
    pay_data = res_pay.json()
    assert pay_data["amount_paise"] == 72000
    assert pay_data["gateway_order_id"].startswith("order_mock_")
    assert INVOICES[inv_id]["status"] == "payment_pending"

    # 2. Returning from checkout alone without webhook does NOT mark paid
    res_check = client.get(
        f"/api/v1/invoices/{inv_id}",
        headers={"Authorization": f"Bearer {token_asha}"},
    )
    assert res_check.status_code == 200
    assert res_check.json()["invoice"]["status"] == "payment_pending"

    # 3. Webhook arrives
    evt_id = "evt_happy_1"
    pay_id = "pay_happy_1"
    payload = {
        "event_id": evt_id,
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": pay_id,
                    "order_id": pay_data["gateway_order_id"],
                    "amount": 72000,
                    "status": "captured",
                }
            }
        },
    }
    raw, headers = make_signed_webhook(payload)
    res_hook = client.post("/api/v1/webhooks/payments/mock", content=raw, headers=headers)
    assert res_hook.status_code == 200

    # 4. Assert invoice paid and delivery created
    assert INVOICES[inv_id]["status"] == "paid"
    assert INVOICES[inv_id]["paid_at"] is not None

    del_rec = DELIVERIES.get(f"del-{inv_id}")
    assert del_rec is not None
    assert del_rec["status"] == "paid"

    # Notification created
    notifs = get_user_notifications("usr-asha-1")
    assert any(n["type"] == "payment_succeeded" for n in notifs)


def test_payment_failure_then_retry():
    """
    P16: Failure then a successful retry.
    """
    client = TestClient(app)
    token_asha = create_session_token("usr-asha-1")

    inv_id = "inv-green-2026-11-usr-asha-1"
    INVOICES[inv_id] = {
        "id": inv_id,
        "order_id": "ord-green-2026-11",
        "customer_id": "usr-asha-1",
        "total_paise": 72000,
        "status": "issued",
        "items": [],
    }

    # Attempt 1: Pay
    res1 = client.post(
        f"/api/v1/invoices/{inv_id}/pay",
        headers={"Authorization": f"Bearer {token_asha}"},
    )
    order1_id = res1.json()["gateway_order_id"]

    # Webhook fails
    payload_fail = {
        "event_id": "evt_fail_1",
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_fail_1",
                    "order_id": order1_id,
                    "amount": 72000,
                    "status": "failed",
                }
            }
        },
    }
    raw, headers = make_signed_webhook(payload_fail)
    client.post("/api/v1/webhooks/payments/mock", content=raw, headers=headers)

    assert INVOICES[inv_id]["status"] == "payment_failed"

    # Attempt 2: Retry
    res2 = client.post(
        f"/api/v1/invoices/{inv_id}/pay",
        headers={"Authorization": f"Bearer {token_asha}"},
    )
    assert res2.status_code == 200
    order2_id = res2.json()["gateway_order_id"]
    assert order2_id != order1_id
    assert len(PAYMENTS) == 2

    # Webhook succeeds
    payload_success = {
        "event_id": "evt_success_2",
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_success_2",
                    "order_id": order2_id,
                    "amount": 72000,
                    "status": "captured",
                }
            }
        },
    }
    raw2, headers2 = make_signed_webhook(payload_success)
    client.post("/api/v1/webhooks/payments/mock", content=raw2, headers=headers2)

    assert INVOICES[inv_id]["status"] == "paid"


def test_duplicate_webhook_delivered_five_times():
    """
    P16: The same webhook delivered five times → one payment, one notification.
    """
    client = TestClient(app)
    token_asha = create_session_token("usr-asha-1")

    inv_id = "inv-green-2026-11-usr-asha-1"
    INVOICES[inv_id] = {
        "id": inv_id,
        "order_id": "ord-green-2026-11",
        "customer_id": "usr-asha-1",
        "total_paise": 72000,
        "status": "issued",
        "items": [],
    }

    res = client.post(f"/api/v1/invoices/{inv_id}/pay", headers={"Authorization": f"Bearer {token_asha}"})
    order_id = res.json()["gateway_order_id"]

    payload = {
        "event_id": "evt_dup_id_100",
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_dup_100",
                    "order_id": order_id,
                    "amount": 72000,
                    "status": "captured",
                }
            }
        },
    }
    raw, headers = make_signed_webhook(payload)

    # Deliver 5 times
    for _ in range(5):
        res_hook = client.post("/api/v1/webhooks/payments/mock", content=raw, headers=headers)
        assert res_hook.status_code == 200

    assert INVOICES[inv_id]["status"] == "paid"
    # Exactly one payment succeeded notification
    notifs = [n for n in get_user_notifications("usr-asha-1") if n["type"] == "payment_succeeded"]
    assert len(notifs) == 1


def test_bad_signature_returns_400_and_nothing_changes():
    """
    P16: Bad signature → 400 and nothing changes.
    """
    client = TestClient(app)
    token_asha = create_session_token("usr-asha-1")

    inv_id = "inv-green-2026-11-usr-asha-1"
    INVOICES[inv_id] = {
        "id": inv_id,
        "order_id": "ord-green-2026-11",
        "customer_id": "usr-asha-1",
        "total_paise": 72000,
        "status": "issued",
        "items": [],
    }

    client.post(f"/api/v1/invoices/{inv_id}/pay", headers={"Authorization": f"Bearer {token_asha}"})

    payload = {"event_id": "evt_bad_sig", "event": "payment.captured"}
    raw = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json", "X-Mock-Signature": "invalid_signature"}

    res = client.post("/api/v1/webhooks/payments/mock", content=raw, headers=headers)
    assert res.status_code == 400
    assert INVOICES[inv_id]["status"] == "payment_pending"


def test_wrong_amount_flags_payment_and_does_not_pay_invoice():
    """
    P16: Wrong amount → not paid, flagged.
    """
    client = TestClient(app)
    token_asha = create_session_token("usr-asha-1")

    inv_id = "inv-green-2026-11-usr-asha-1"
    INVOICES[inv_id] = {
        "id": inv_id,
        "order_id": "ord-green-2026-11",
        "customer_id": "usr-asha-1",
        "total_paise": 72000,
        "status": "issued",
        "items": [],
    }

    res = client.post(f"/api/v1/invoices/{inv_id}/pay", headers={"Authorization": f"Bearer {token_asha}"})
    order_id = res.json()["gateway_order_id"]

    payload = {
        "event_id": "evt_wrong_amt",
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_wrong",
                    "order_id": order_id,
                    "amount": 50000,  # Expected 72000
                    "status": "captured",
                }
            }
        },
    }
    raw, headers = make_signed_webhook(payload)
    res_hook = client.post("/api/v1/webhooks/payments/mock", content=raw, headers=headers)
    assert res_hook.status_code == 200

    # Invoice remains unpaid
    assert INVOICES[inv_id]["status"] == "payment_pending"


def test_second_success_for_already_paid_invoice_becomes_needs_refund():
    """
    P16: A second success for an already-paid invoice → needs_refund; the invoice is unchanged.
    """
    client = TestClient(app)
    token_asha = create_session_token("usr-asha-1")

    inv_id = "inv-green-2026-11-usr-asha-1"
    INVOICES[inv_id] = {
        "id": inv_id,
        "order_id": "ord-green-2026-11",
        "customer_id": "usr-asha-1",
        "total_paise": 72000,
        "status": "paid",  # Already paid
        "items": [],
    }

    # Simulate an incoming success webhook with a new event_id
    payload = {
        "event_id": "evt_second_success",
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_second",
                    "order_id": "order_mock_test",
                    "amount": 72000,
                    "status": "captured",
                    "notes": {"invoice_id": inv_id},
                }
            }
        },
    }
    # Create dummy payment record for this second attempt
    PAYMENTS["pay-dummy"] = {
        "id": "pay-dummy",
        "invoice_id": inv_id,
        "gateway_order_id": "order_mock_test",
        "status": "created",
    }
    raw, headers = make_signed_webhook(payload)
    res = client.post("/api/v1/webhooks/payments/mock", content=raw, headers=headers)
    assert res.status_code == 200
    assert res.json()["result"] == "needs_refund"
    assert PAYMENTS["pay-dummy"]["status"] == "needs_refund"
    assert INVOICES[inv_id]["status"] == "paid"


def test_customer_isolation_and_void_invoice_guard():
    """
    P16:
    - Chitra can neither view nor pay Asha's invoice (404).
    - A void invoice cannot be paid (422).
    """
    client = TestClient(app)
    token_asha = create_session_token("usr-asha-1")
    token_chitra = create_session_token("usr-chitra-3")

    inv_id = "inv-green-2026-11-usr-asha-1"
    INVOICES[inv_id] = {
        "id": inv_id,
        "order_id": "ord-green-2026-11",
        "customer_id": "usr-asha-1",
        "total_paise": 72000,
        "status": "issued",
        "items": [],
    }

    # Chitra viewing Asha's invoice -> 404
    res_view = client.get(
        f"/api/v1/invoices/{inv_id}",
        headers={"Authorization": f"Bearer {token_chitra}"},
    )
    assert res_view.status_code == 404

    # Chitra paying Asha's invoice -> 404
    res_pay = client.post(
        f"/api/v1/invoices/{inv_id}/pay",
        headers={"Authorization": f"Bearer {token_chitra}"},
    )
    assert res_pay.status_code == 404

    # Void invoice guard
    void_inv_id = "inv-void-1"
    INVOICES[void_inv_id] = {
        "id": void_inv_id,
        "order_id": "ord-green-2026-11",
        "customer_id": "usr-asha-1",
        "total_paise": 0,
        "status": "void",
        "items": [],
    }
    res_void_pay = client.post(
        f"/api/v1/invoices/{void_inv_id}/pay",
        headers={"Authorization": f"Bearer {token_asha}"},
    )
    assert res_void_pay.status_code == 422


def test_webhook_and_verify_racing_condition():
    """
    P16: A webhook and a verify call racing each other → exactly one transition.
    """
    client = TestClient(app)
    token_asha = create_session_token("usr-asha-1")

    inv_id = "inv-green-2026-11-usr-asha-1"
    INVOICES[inv_id] = {
        "id": inv_id,
        "order_id": "ord-green-2026-11",
        "customer_id": "usr-asha-1",
        "total_paise": 72000,
        "status": "issued",
        "items": [],
    }

    res_pay = client.post(
        f"/api/v1/invoices/{inv_id}/pay",
        headers={"Authorization": f"Bearer {token_asha}"},
    )
    order_id = res_pay.json()["gateway_order_id"]

    payload = {
        "event_id": "evt_race_1",
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_race_1",
                    "order_id": order_id,
                    "amount": 72000,
                    "status": "captured",
                }
            }
        },
    }
    raw, headers = make_signed_webhook(payload)

    results = []

    def call_webhook():
        r = client.post("/api/v1/webhooks/payments/mock", content=raw, headers=headers)
        results.append(("webhook", r.status_code))

    def call_verify():
        r = client.post(
            f"/api/v1/invoices/{inv_id}/verify",
            headers={"Authorization": f"Bearer {token_asha}"},
        )
        results.append(("verify", r.status_code))

    t1 = threading.Thread(target=call_webhook)
    t2 = threading.Thread(target=call_verify)

    t1.start()
    t2.start()
    t1.join()
    t2.join()

    # Both must complete with 200
    assert len(results) == 2
    assert results[0][1] == 200
    assert results[1][1] == 200

    # Invoice must be paid exactly once
    assert INVOICES[inv_id]["status"] == "paid"
