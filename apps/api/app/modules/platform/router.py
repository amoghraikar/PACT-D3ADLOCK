from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import require_platform_admin
from app.models.identity import User
from app.schemas.platform_admin import (
    AuditLogItem,
    CreateCommunityRequest,
    CreateRetailerRequest,
    GlobalTransactionSummary,
    MapRetailerCommunityRequest,
    MapRetailerCommunityResponse,
    PlatformCommunityItem,
    PlatformConfigResponse,
    PlatformHealthMetrics,
    PlatformRetailerItem,
    UpdatePlatformConfigRequest,
)
from app.services.platform_admin_service import PlatformAdminService

router = APIRouter()


@router.get(
    "/communities",
    response_model=list[PlatformCommunityItem],
    summary="List all communities on the platform",
)
def get_all_communities(
    current_user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
) -> list[PlatformCommunityItem]:
    """
    Returns all registered apartment communities across the platform.
    """
    return PlatformAdminService.get_all_communities(db)


@router.post(
    "/communities",
    response_model=PlatformCommunityItem,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new community on the platform",
)
def create_community(
    payload: CreateCommunityRequest,
    current_user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
) -> PlatformCommunityItem:
    """
    Creates a new community tenant and audits the operation.
    """
    return PlatformAdminService.create_community(db, payload, current_user)


@router.get(
    "/retailers",
    response_model=list[PlatformRetailerItem],
    summary="List all registered retailers on the platform",
)
def get_all_retailers(
    current_user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
) -> list[PlatformRetailerItem]:
    """
    Returns all active and suspended retailer merchants.
    """
    return PlatformAdminService.get_all_retailers(db)


@router.post(
    "/retailers",
    response_model=PlatformRetailerItem,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new merchant retailer",
)
def create_retailer(
    payload: CreateRetailerRequest,
    current_user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
) -> PlatformRetailerItem:
    """
    Registers a new merchant retailer, links merchant user, and audits the operation.
    """
    return PlatformAdminService.create_retailer(db, payload, current_user)


@router.post(
    "/retailer-mappings",
    response_model=MapRetailerCommunityResponse,
    status_code=status.HTTP_200_OK,
    summary="Map a retailer to a community for order fulfillment",
)
def map_retailer_to_community(
    payload: MapRetailerCommunityRequest,
    current_user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
) -> MapRetailerCommunityResponse:
    """
    Creates or updates the association between a retailer merchant and a community.
    """
    return PlatformAdminService.map_retailer_community(db, payload, current_user)


@router.get(
    "/transactions",
    response_model=GlobalTransactionSummary,
    summary="View platform-wide global transaction and GMV totals",
)
def get_global_transactions(
    current_user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
) -> GlobalTransactionSummary:
    """
    Aggregates GMV, discounts, delivery fees, and collection status across all communities.
    """
    return PlatformAdminService.get_global_transactions(db)


@router.get(
    "/health",
    response_model=PlatformHealthMetrics,
    summary="Monitor platform health and active resource counts",
)
def get_platform_health(
    current_user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
) -> PlatformHealthMetrics:
    """
    Checks database health and reports active community, retailer, and user statistics.
    """
    return PlatformAdminService.get_platform_health(db)


@router.get(
    "/audit-logs",
    response_model=list[AuditLogItem],
    summary="View centralized system audit logs",
)
def get_audit_logs(
    entity_type: str | None = Query(default=None, description="Filter by entity type"),
    action: str | None = Query(default=None, description="Filter by action name"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
) -> list[AuditLogItem]:
    """
    Chronological inspection of security and business events across the platform.
    """
    return PlatformAdminService.get_audit_logs(
        db=db,
        entity_type=entity_type,
        action=action,
        page=page,
        limit=limit,
    )


@router.get(
    "/config",
    response_model=PlatformConfigResponse,
    summary="View platform-level global configuration parameters",
)
def get_platform_config(
    current_user: User = Depends(require_platform_admin),
) -> PlatformConfigResponse:
    """
    Returns runtime configuration parameters (cutoff day/time, rate limits, session max age).
    """
    return PlatformAdminService.get_config()


@router.patch(
    "/config",
    response_model=PlatformConfigResponse,
    summary="Update platform-level configuration parameters",
)
def update_platform_config(
    payload: UpdatePlatformConfigRequest,
    current_user: User = Depends(require_platform_admin),
    db: Session = Depends(get_db),
) -> PlatformConfigResponse:
    """
    Dynamically updates runtime platform parameters and creates an audit log entry.
    """
    return PlatformAdminService.update_config(payload, current_user, db)
