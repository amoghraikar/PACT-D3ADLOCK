from datetime import UTC, datetime
from zoneinfo import ZoneInfo

BUSINESS_TZ = ZoneInfo("Asia/Kolkata")

_clock_override: datetime | None = None


def set_clock_override(dt: datetime | None) -> None:
    """Override the current clock for testing purposes. Pass None to reset."""
    global _clock_override
    _clock_override = dt


def now_utc() -> datetime:
    """Return the current time in UTC, overridable in tests."""
    if _clock_override is not None:
        if _clock_override.tzinfo is None:
            return _clock_override.replace(tzinfo=UTC)
        return _clock_override.astimezone(UTC)
    return datetime.now(UTC)


def now_business() -> datetime:
    """Return the current time in the business timezone (Asia/Kolkata)."""
    return now_utc().astimezone(BUSINESS_TZ)
