import json
import uuid
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.modules.payments.gateway import MockGateway
from app.modules.payments.service import handle_webhook_event

router = APIRouter(prefix="/api/v1/dev/mock-checkout", tags=["dev-mock-checkout"])

mock_gw = MockGateway()


class MockTriggerRequest(BaseModel):
    action: str  # "success" | "failure" | "duplicate" | "wrong_amount"
    invoice_id: str
    order_id: str
    amount_paise: int
    event_id: str | None = None


# Store the last event for duplicate simulation
LAST_MOCK_EVENT: dict[str, Any] = {}


@router.post("/trigger")
def trigger_mock_action(req: MockTriggerRequest):
    """
    Dev-only endpoint backing the 4 mock checkout buttons:
    1. success
    2. failure
    3. duplicate
    4. wrong_amount
    Each constructs a real signed webhook payload and invokes the real verification path.
    """
    event_id = req.event_id or f"evt_mock_{uuid.uuid4().hex[:12]}"
    payment_id = f"pay_mock_{uuid.uuid4().hex[:12]}"

    if req.action == "duplicate":
        if not LAST_MOCK_EVENT:
            event_id = f"evt_dup_{uuid.uuid4().hex[:12]}"
        else:
            event_id = LAST_MOCK_EVENT.get("event_id", event_id)

    amount = req.amount_paise
    if req.action == "wrong_amount":
        amount = req.amount_paise + 5000  # ₹50 discrepancy

    event_type = "payment.failed" if req.action == "failure" else "payment.captured"

    payload = {
        "event_id": event_id,
        "event": event_type,
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "order_id": req.order_id,
                    "amount": amount,
                    "status": "failed" if req.action == "failure" else "captured",
                    "notes": {
                        "invoice_id": req.invoice_id,
                    },
                }
            }
        },
    }

    raw_body = json.dumps(payload).encode("utf-8")
    signature = mock_gw.sign_payload(raw_body)
    headers = {
        "x-mock-signature": signature,
        "content-type": "application/json",
    }

    if req.action != "duplicate":
        LAST_MOCK_EVENT["event_id"] = event_id

    # Invoke the real verification path
    res = handle_webhook_event(raw_body, headers, "mock")
    return {
        "status": "triggered",
        "action": req.action,
        "event_id": event_id,
        "webhook_result": res,
    }
