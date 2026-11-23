"""
Shopping Cycles API Router:
- View current monthly cycle and live countdown
- View cycle details by UUID
- Trigger idempotent consolidated bulk order generation
"""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.clock import now_utc
from app.core.db import get_db
from app.core.deps import get_current_user, require_customer
from app.core.errors import NotFoundError
from app.models.identity import User
from app.repositories.cycle_repository import CycleRepository
from app.schemas.cart import BulkOrderResponse, CycleSummary
from app.services.cart_service import CartService

router = APIRouter()


@router.get(
    "/current",
    response_model=CycleSummary,
    summary="Get current active shopping cycle for the user's community",
)
def get_current_cycle(
    community_id: uuid.UUID | None = Query(default=None, description="Community ID context"),
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CycleSummary:
    """
    Retrieves the current active monthly shopping cycle with cutoff time in Asia/Kolkata,
    live seconds countdown, and participation statistics.
    """
    comm_id = CartService.resolve_community_id(current_user, community_id)
    cycle = CycleRepository.get_or_create_current_cycle(db, comm_id)
    stats = CycleRepository.get_community_cycle_stats(db, cycle.id)

    seconds_left = max(0, int((cycle.cutoff_at - now_utc()).total_seconds()))
    is_passed = now_utc() >= cycle.cutoff_at or cycle.status != "OPEN"

    return CycleSummary(
        id=cycle.id,
        community_id=cycle.community_id,
        community_name=cycle.community.name if cycle.community else "My Community",
        cycle_month=cycle.cycle_month,
        cutoff_at=cycle.cutoff_at,
        status=cycle.status,
        time_remaining_seconds=seconds_left,
        is_cutoff_passed=is_passed,
        participating_households_count=stats["participating_households_count"],
    )


@router.get(
    "/{id}",
    response_model=CycleSummary,
    summary="Get shopping cycle by ID",
)
def get_cycle_by_id(
    id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CycleSummary:
    """Retrieve details for a specific shopping cycle."""
    cycle = CycleRepository.get_cycle_by_id(db, id)
    if not cycle:
        raise NotFoundError(f"Shopping cycle {id} not found.")

    stats = CycleRepository.get_community_cycle_stats(db, cycle.id)
    seconds_left = max(0, int((cycle.cutoff_at - now_utc()).total_seconds()))
    is_passed = now_utc() >= cycle.cutoff_at or cycle.status != "OPEN"

    return CycleSummary(
        id=cycle.id,
        community_id=cycle.community_id,
        community_name=cycle.community.name if cycle.community else "My Community",
        cycle_month=cycle.cycle_month,
        cutoff_at=cycle.cutoff_at,
        status=cycle.status,
        time_remaining_seconds=seconds_left,
        is_cutoff_passed=is_passed,
        participating_households_count=stats["participating_households_count"],
    )


@router.post(
    "/{id}/consolidate",
    response_model=BulkOrderResponse,
    summary="Trigger consolidated bulk order creation for a locked cycle (Idempotent)",
)
def consolidate_cycle_order(
    id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BulkOrderResponse:
    """
    Consolidates all community cart items into a single retailer bulk order.
    Strictly idempotent: returns existing bulk order if already created.
    """
    return CartService.consolidate_cycle_order(db=db, cycle_id=id)
