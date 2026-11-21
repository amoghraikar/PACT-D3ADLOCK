from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import Optional

BUSINESS_TZ = ZoneInfo("Asia/Kolkata")

_clock_override: Optional[datetime] = None


def set_clock_override(dt: Optional[datetime]) -> None:
    """Override the current clock for testing purposes. Pass None to reset."""
    global _clock_override
    _clock_override = dt


def now_utc() -> datetime:
    """Return the current time in UTC, overridable in tests."""
    if _clock_override is not None:
        if _clock_override.tzinfo is None:
            return _clock_override.replace(tzinfo=timezone.utc)
        return _clock_override.astimezone(timezone.utc)
    return datetime.now(timezone.utc)


def now_business() -> datetime:
    """Return the current time in the business timezone (Asia/Kolkata)."""
    return now_utc().astimezone(BUSINESS_TZ)
