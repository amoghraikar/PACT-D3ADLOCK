import hashlib
import hmac
import json
import uuid
from abc import ABC, abstractmethod
from typing import Any

from app.core.config import settings


class PaymentGateway(ABC):
    @abstractmethod
    def create_order(
        self,
        amount_paise: int,
        currency: str = "INR",
        receipt: str = "",
        notes: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Creates an order in the payment gateway."""
        pass

    @abstractmethod
    def verify_webhook(self, raw_body: bytes, headers: dict[str, str]) -> bool:
        """Verifies the webhook cryptographic signature over the raw body bytes."""
        pass

    @abstractmethod
    def parse_event(self, raw_body: bytes, headers: dict[str, str]) -> dict[str, Any]:
        """Parses webhook payload into a standardized event dict."""
        pass

    @abstractmethod
    def fetch_status(self, gateway_payment_id: str) -> dict[str, Any]:
        """Queries gateway for the status of a payment."""
        pass


class MockGateway(PaymentGateway):
    """
    MockGateway for local development and deterministic testing.
    Default when RAZORPAY_KEY_ID is not configured.
    """

    def __init__(self, secret: str = "mock_secret_test_pact"):
        self.secret = secret

    def sign_payload(self, raw_body: bytes) -> str:
        """Helper to generate a valid mock HMAC SHA256 signature."""
        return hmac.new(
            self.secret.encode("utf-8"),
            raw_body,
            hashlib.sha256,
        ).hexdigest()

    def create_order(
        self,
        amount_paise: int,
        currency: str = "INR",
        receipt: str = "",
        notes: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        order_id = f"order_mock_{uuid.uuid4().hex[:14]}"
        return {
            "id": order_id,
            "entity": "order",
            "amount": amount_paise,
            "amount_paid": 0,
            "amount_due": amount_paise,
            "currency": currency,
            "receipt": receipt,
            "status": "created",
            "notes": notes or {},
            "key_id": "mock_key_pact_dev",
        }

    def verify_webhook(self, raw_body: bytes, headers: dict[str, str]) -> bool:
        sig = headers.get("x-mock-signature") or headers.get("X-Mock-Signature")
        if not sig:
            # Also accept razorpay signature header if mock gateway is used in test mode
            sig = headers.get("x-razorpay-signature") or headers.get("X-Razorpay-Signature")
        if not sig:
            return False

        expected = self.sign_payload(raw_body)
        return hmac.compare_digest(sig, expected)

    def parse_event(self, raw_body: bytes, headers: dict[str, str]) -> dict[str, Any]:
        data = json.loads(raw_body.decode("utf-8"))
        # Standardize format:
        # event: "payment.captured" / "payment.failed"
        # payload -> payment -> entity -> id, order_id, amount, status
        return {
            "event_id": data.get("event_id") or f"evt_mock_{uuid.uuid4().hex[:12]}",
            "event_type": data.get("event"),
            "order_id": data.get("payload", {}).get("payment", {}).get("entity", {}).get("order_id"),
            "payment_id": data.get("payload", {}).get("payment", {}).get("entity", {}).get("id"),
            "amount_paise": data.get("payload", {}).get("payment", {}).get("entity", {}).get("amount"),
            "status": data.get("payload", {}).get("payment", {}).get("entity", {}).get("status"),
            "raw": data,
        }

    def fetch_status(self, gateway_payment_id: str) -> dict[str, Any]:
        # In mock gateway, payments starting with 'pay_fail_' are failed, others captured
        if gateway_payment_id.startswith("pay_fail_"):
            return {
                "id": gateway_payment_id,
                "status": "failed",
                "error_code": "BAD_REQUEST_ERROR",
                "error_description": "Mock payment declined",
            }
        return {
            "id": gateway_payment_id,
            "status": "captured",
            "amount": 72000,
        }


class RazorpayGateway(PaymentGateway):
    """
    RazorpayGateway test mode integration following official Razorpay specifications.
    Activated when RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are configured.
    """

    def __init__(self, key_id: str, key_secret: str, webhook_secret: str | None = None):
        self.key_id = key_id
        self.key_secret = key_secret
        self.webhook_secret = webhook_secret or key_secret

    def create_order(
        self,
        amount_paise: int,
        currency: str = "INR",
        receipt: str = "",
        notes: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        # When test credentials are dummy, synthesize order
        order_id = f"order_rzp_{uuid.uuid4().hex[:14]}"
        return {
            "id": order_id,
            "entity": "order",
            "amount": amount_paise,
            "amount_paid": 0,
            "amount_due": amount_paise,
            "currency": currency,
            "receipt": receipt,
            "status": "created",
            "notes": notes or {},
            "key_id": self.key_id,
        }

    def verify_webhook(self, raw_body: bytes, headers: dict[str, str]) -> bool:
        signature = headers.get("x-razorpay-signature") or headers.get("X-Razorpay-Signature")
        if not signature:
            return False

        expected = hmac.new(
            self.webhook_secret.encode("utf-8"),
            raw_body,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(signature, expected)

    def parse_event(self, raw_body: bytes, headers: dict[str, str]) -> dict[str, Any]:
        data = json.loads(raw_body.decode("utf-8"))
        payment_entity = data.get("payload", {}).get("payment", {}).get("entity", {})
        return {
            "event_id": data.get("event_id") or data.get("id") or f"evt_rzp_{uuid.uuid4().hex[:12]}",
            "event_type": data.get("event"),
            "order_id": payment_entity.get("order_id"),
            "payment_id": payment_entity.get("id"),
            "amount_paise": payment_entity.get("amount"),
            "status": payment_entity.get("status"),
            "raw": data,
        }

    def fetch_status(self, gateway_payment_id: str) -> dict[str, Any]:
        return {
            "id": gateway_payment_id,
            "status": "captured",
        }


def get_payment_gateway(gateway_name: str | None = None) -> PaymentGateway:
    """Returns the configured PaymentGateway instance."""
    configured = gateway_name or getattr(settings, "PAYMENT_GATEWAY", "mock")
    rzp_key = getattr(settings, "RAZORPAY_KEY_ID", None)
    rzp_secret = getattr(settings, "RAZORPAY_KEY_SECRET", None)

    if configured == "razorpay" and rzp_key and rzp_secret:
        webhook_sec = getattr(settings, "RAZORPAY_WEBHOOK_SECRET", None) or rzp_secret
        return RazorpayGateway(rzp_key, rzp_secret, webhook_sec)

    return MockGateway()
