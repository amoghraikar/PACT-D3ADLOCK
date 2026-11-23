"""
Development Clock API Router:
Allows manual simulation of past and future cutoff times.
"""

from datetime import datetime

from fastapi import APIRouter

from app.core.clock import is_clock_override_active, now_business, now_utc, set_clock_override
from app.core.errors import ValidationError
from app.schemas.cart import ClockOverrideRequest, ClockStatusResponse

router = APIRouter()


@router.get(
    "/clock",
    response_model=ClockStatusResponse,
    summary="Get current clock time (UTC and Asia/Kolkata) and override status",
)
def get_clock_status() -> ClockStatusResponse:
    return ClockStatusResponse(
        current_time_utc=now_utc(),
        current_time_business=now_business(),
        is_override_active=is_clock_override_active(),
    )


@router.post(
    "/clock",
    response_model=ClockStatusResponse,
    summary="Override system clock for testing past/future cutoffs",
)
def set_clock(payload: ClockOverrideRequest) -> ClockStatusResponse:
    if payload.timestamp_iso is None:
        set_clock_override(None)
    else:
        try:
            dt = datetime.fromisoformat(payload.timestamp_iso)
            set_clock_override(dt)
        except Exception as exc:
            raise ValidationError(
                f"Invalid ISO timestamp format: {payload.timestamp_iso}. Error: {exc}",
                code="INVALID_TIMESTAMP",
            ) from exc

    return ClockStatusResponse(
        current_time_utc=now_utc(),
        current_time_business=now_business(),
        is_override_active=is_clock_override_active(),
    )


@router.delete(
    "/clock",
    response_model=ClockStatusResponse,
    summary="Reset system clock override back to live wall time",
)
def reset_clock() -> ClockStatusResponse:
    set_clock_override(None)
    return ClockStatusResponse(
        current_time_utc=now_utc(),
        current_time_business=now_business(),
        is_override_active=False,
    )
