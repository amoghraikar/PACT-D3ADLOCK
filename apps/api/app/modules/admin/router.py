import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import require_admin
from app.models.identity import User
from app.schemas.apartment_admin import (
    AdminCycleOverview,
    AdminDashboardMetrics,
    CommunityOverviewResponse,
    ConfirmHandoverRequest,
    ConfirmHandoverResponse,
    DeliveryStatusResponse,
    ResidentCollectionResponse,
    TriggerReminderRequest,
    TriggerReminderResponse,
)
from app.services.apartment_admin_service import ApartmentAdminService

router = APIRouter()


@router.get(
    "/community",
    response_model=CommunityOverviewResponse,
    summary="Get overview of the administrator's assigned community",
)
def get_community_overview(
    community_id: uuid.UUID | None = Query(
        default=None, description="Community ID (platform admin override only)"
    ),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> CommunityOverviewResponse:
    """
    Returns registered buildings, apartments, and households for the assigned community.
    """
    return ApartmentAdminService.get_community_overview(
        db=db,
        current_user=current_user,
        community_id=community_id,
    )


@router.get(
    "/dashboard",
    response_model=AdminDashboardMetrics,
    summary="Get apartment admin dashboard metrics",
)
def get_admin_dashboard(
    community_id: uuid.UUID | None = Query(
        default=None, description="Community ID (platform admin override only)"
    ),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminDashboardMetrics:
    """
    Returns KPIs:
    - Total households & active ordering households
    - Total billing amount, collected amount, outstanding amount
    - Collection percentage
    - Delivery handovers pending & completed
    """
    return ApartmentAdminService.get_dashboard_metrics(
        db=db,
        current_user=current_user,
        community_id=community_id,
    )


@router.get(
    "/cycle",
    response_model=AdminCycleOverview,
    summary="View status and demand totals for current shopping cycle",
)
def get_cycle_overview(
    community_id: uuid.UUID | None = Query(
        default=None, description="Community ID (platform admin override only)"
    ),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminCycleOverview:
    """
    Returns cycle cutoff timer, demand units, and order status.
    """
    return ApartmentAdminService.get_current_cycle(
        db=db,
        current_user=current_user,
        community_id=community_id,
    )


@router.get(
    "/invoices",
    response_model=ResidentCollectionResponse,
    summary="View resident-level collection status and unpaid invoices",
)
def get_resident_collections(
    status: str | None = Query(
        default=None, description="Filter by status: paid or unpaid/pending"
    ),
    community_id: uuid.UUID | None = Query(
        default=None, description="Community ID (platform admin override only)"
    ),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ResidentCollectionResponse:
    """
    Returns itemized resident collection records for the current billing cycle.
    """
    return ApartmentAdminService.get_resident_collections(
        db=db,
        current_user=current_user,
        community_id=community_id,
        status_filter=status,
    )


@router.post(
    "/invoices/{invoice_id}/remind",
    response_model=TriggerReminderResponse,
    status_code=status.HTTP_200_OK,
    summary="Trigger rate-limited payment reminder to a resident",
)
def trigger_payment_reminder(
    invoice_id: uuid.UUID,
    payload: TriggerReminderRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> TriggerReminderResponse:
    """
    Triggers a payment reminder to the resident via configured adapters (in-app, SMS, WhatsApp).
    Enforces 1-hour rate limit per intended recipient.
    Never claims a message was sent if the provider did not confirm it.
    """
    return ApartmentAdminService.trigger_payment_reminder(
        db=db,
        invoice_id=invoice_id,
        payload=payload,
        current_user=current_user,
    )


@router.get(
    "/deliveries",
    response_model=DeliveryStatusResponse,
    summary="Track delivery readiness and doorstep handover checklist",
)
def get_delivery_status(
    community_id: uuid.UUID | None = Query(
        default=None, description="Community ID (platform admin override only)"
    ),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DeliveryStatusResponse:
    """
    Returns gate arrival status, total delivery units, and per-resident doorstep handover checklist.
    """
    return ApartmentAdminService.get_delivery_status(
        db=db,
        current_user=current_user,
        community_id=community_id,
    )


@router.post(
    "/deliveries/handovers/{handover_id}/confirm",
    response_model=ConfirmHandoverResponse,
    status_code=status.HTTP_200_OK,
    summary="Confirm doorstep delivery handover to a resident",
)
def confirm_handover(
    handover_id: uuid.UUID,
    payload: ConfirmHandoverRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ConfirmHandoverResponse:
    """
    Marks a doorstep delivery handover as completed, recording handover timestamp and admin identity.
    """
    return ApartmentAdminService.confirm_handover(
        db=db,
        handover_id=handover_id,
        payload=payload,
        current_user=current_user,
    )
