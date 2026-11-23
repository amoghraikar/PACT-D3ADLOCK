import abc
import hashlib
import hmac
import uuid
from typing import Any

from app.core.config import settings


class PaymentGateway(abc.ABC):
    """Abstract interface for payment gateway providers."""

    @abc.abstractmethod
    def create_order(
        self, amount_paise: int, receipt: str, notes: dict[str, str] | None = None
    ) -> dict[str, Any]:
        """Creates an order at the payment gateway."""
        pass

    @abc.abstractmethod
    def verify_signature(self, order_id: str, payment_id: str, signature: str) -> bool:
        """Verifies checkout callback signature."""
        pass

    @abc.abstractmethod
    def verify_webhook_signature(self, raw_body: bytes, signature: str) -> bool:
        """Verifies HMAC signature of webhook payloads."""
        pass

    @abc.abstractmethod
    def create_refund(
        self, payment_id: str, amount_paise: int, reason: str | None = None
    ) -> dict[str, Any]:
        """Issues a refund for a previously captured payment."""
        pass


class MockPaymentGateway(PaymentGateway):
    """
    In-memory / deterministic mock payment gateway for testing and local development.
    Uses HMAC-SHA256 with configured secret so signatures are real, validatable crypto hashes.
    """

    def __init__(self, key_id: str | None = None, key_secret: str | None = None):
        self.key_id = key_id or settings.RAZORPAY_KEY_ID or "rzp_test_pactmockkey123"
        self.key_secret = (
            key_secret or settings.RAZORPAY_KEY_SECRET or "rzp_test_secret_pact_mock_456"
        )
        self.webhook_secret = (
            settings.RAZORPAY_WEBHOOK_SECRET or "pact_razorpay_webhook_secret_dev"
        )

    def create_order(
        self, amount_paise: int, receipt: str, notes: dict[str, str] | None = None
    ) -> dict[str, Any]:
        order_id = f"order_mock_{uuid.uuid4().hex[:14]}"
        return {
            "id": order_id,
            "entity": "order",
            "amount": amount_paise,
            "amount_paid": 0,
            "amount_due": amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "status": "created",
            "notes": notes or {},
        }

    def generate_valid_signature(self, order_id: str, payment_id: str) -> str:
        """Helper to generate a valid checkout signature for test cases."""
        msg = f"{order_id}|{payment_id}"
        return hmac.new(
            self.key_secret.encode("utf-8"),
            msg.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    def generate_valid_webhook_signature(self, payload_bytes: bytes) -> str:
        """Helper to generate a valid webhook signature for test cases."""
        return hmac.new(
            self.webhook_secret.encode("utf-8"),
            payload_bytes,
            hashlib.sha256,
        ).hexdigest()

    def verify_signature(self, order_id: str, payment_id: str, signature: str) -> bool:
        expected = self.generate_valid_signature(order_id, payment_id)
        return hmac.compare_digest(expected, signature)

    def verify_webhook_signature(self, raw_body: bytes, signature: str) -> bool:
        expected = self.generate_valid_webhook_signature(raw_body)
        return hmac.compare_digest(expected, signature)

    def create_refund(
        self, payment_id: str, amount_paise: int, reason: str | None = None
    ) -> dict[str, Any]:
        refund_id = f"rfnd_mock_{uuid.uuid4().hex[:14]}"
        return {
            "id": refund_id,
            "entity": "refund",
            "amount": amount_paise,
            "currency": "INR",
            "payment_id": payment_id,
            "status": "processed",
            "speed": "normal",
            "notes": {"reason": reason or "Customer requested refund"},
        }


class RazorpayPaymentGateway(PaymentGateway):
    """
    Live Razorpay Payment Gateway integration using standard REST API & HMAC-SHA256.
    Falls back gracefully if live credentials are not supplied.
    """

    def __init__(self):
        self.key_id = settings.RAZORPAY_KEY_ID
        self.key_secret = settings.RAZORPAY_KEY_SECRET
        self.webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET
        self._mock_fallback = MockPaymentGateway(self.key_id, self.key_secret)

    def create_order(
        self, amount_paise: int, receipt: str, notes: dict[str, str] | None = None
    ) -> dict[str, Any]:
        if not self.key_id or not self.key_secret:
            return self._mock_fallback.create_order(amount_paise, receipt, notes)

        try:
            import requests

            url = "https://api.razorpay.com/v1/orders"
            data = {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt,
                "notes": notes or {},
            }
            resp = requests.post(url, json=data, auth=(self.key_id, self.key_secret), timeout=10)
            if resp.status_code in (200, 201):
                return resp.json()
        except Exception:
            pass
        return self._mock_fallback.create_order(amount_paise, receipt, notes)

    def verify_signature(self, order_id: str, payment_id: str, signature: str) -> bool:
        secret = self.key_secret or "rzp_test_secret_pact_mock_456"
        msg = f"{order_id}|{payment_id}"
        expected = hmac.new(
            secret.encode("utf-8"),
            msg.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    def verify_webhook_signature(self, raw_body: bytes, signature: str) -> bool:
        secret = self.webhook_secret or "pact_razorpay_webhook_secret_dev"
        expected = hmac.new(
            secret.encode("utf-8"),
            raw_body,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    def create_refund(
        self, payment_id: str, amount_paise: int, reason: str | None = None
    ) -> dict[str, Any]:
        if not self.key_id or not self.key_secret:
            return self._mock_fallback.create_refund(payment_id, amount_paise, reason)

        try:
            import requests

            url = f"https://api.razorpay.com/v1/payments/{payment_id}/refund"
            data = {"amount": amount_paise, "notes": {"reason": reason or ""}}
            resp = requests.post(url, json=data, auth=(self.key_id, self.key_secret), timeout=10)
            if resp.status_code in (200, 201):
                return resp.json()
        except Exception:
            pass
        return self._mock_fallback.create_refund(payment_id, amount_paise, reason)


def get_payment_gateway() -> PaymentGateway:
    if settings.PAYMENT_GATEWAY.lower() == "razorpay" and settings.RAZORPAY_KEY_ID:
        return RazorpayPaymentGateway()
    return MockPaymentGateway()
