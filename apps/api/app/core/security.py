import base64
import hashlib
import hmac
import json
import time
from typing import Any

from app.core.config import settings


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64decode(data: str) -> bytes:
    padding = 4 - (len(data) % 4)
    if padding and padding < 4:
        data += "=" * padding
    return base64.urlsafe_b64decode(data)


def create_session_token(user_id: str, extra: dict[str, Any] | None = None) -> str:
    """
    Creates a tamper-proof HMAC-SHA256 signed session token.
    Valid for SESSION_MAX_AGE_DAYS.
    """
    expires_at = int(time.time()) + (settings.SESSION_MAX_AGE_DAYS * 24 * 3600)
    payload = {
        "sub": user_id,
        "exp": expires_at,
        **(extra or {}),
    }
    payload_bytes = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_b64 = _b64encode(payload_bytes)

    signature = hmac.new(
        settings.APP_SECRET.encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    sig_b64 = _b64encode(signature)

    return f"{payload_b64}.{sig_b64}"


def verify_session_token(token: str) -> dict[str, Any] | None:
    """
    Verifies the HMAC-SHA256 signature and expiration.
    Returns the payload dictionary or None if invalid/expired.
    """
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload_b64, sig_b64 = parts

        expected_sig = hmac.new(
            settings.APP_SECRET.encode("utf-8"),
            payload_b64.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        actual_sig = _b64decode(sig_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        payload_bytes = _b64decode(payload_b64)
        payload = json.loads(payload_bytes.decode("utf-8"))

        if payload.get("exp", 0) < time.time():
            return None

        return payload
    except Exception:
        return None
