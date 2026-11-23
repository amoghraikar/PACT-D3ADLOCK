"""
Retailer Inventory Module Router:
- Stock tracking and low-stock detection
- Batch inwarding
- Stock quantity adjustment with audit logging
- Stock movement history
"""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import require_retailer
from app.core.errors import ForbiddenError
from app.core.pagination import PaginatedResponse
from app.models.identity import User
from app.schemas.inventory import (
    InventoryAdjustmentRequest,
    InventoryAdjustmentResponse,
    InventoryItemResponse,
    InventoryMovementResponse,
    StockInwardRequest,
    StockInwardResponse,
)
from app.services.inventory_service import InventoryService

router = APIRouter()


def _resolve_retailer_id(
    current_user: User, explicit_retailer_id: uuid.UUID | None = None
) -> uuid.UUID:
    """
    Resolve the retailer ID for the current request.
    Platform admins can inspect any retailer if explicit_retailer_id is supplied.
    Retailers are strictly locked to their own store.
    """
    if current_user.role and current_user.role.name == "platform_admin":
        if explicit_retailer_id:
            return explicit_retailer_id
        if current_user.retailer_profile:
            return current_user.retailer_profile.id
        raise ForbiddenError(
            "Retailer ID required for platform admin.", code="RETAILER_ID_REQUIRED"
        )

    if not current_user.retailer_profile:
        raise ForbiddenError(
            "User is not associated with an active retailer profile.",
            code="RETAILER_PROFILE_MISSING",
        )

    return current_user.retailer_profile.id


@router.get(
    "/inventory",
    response_model=PaginatedResponse[InventoryItemResponse],
    summary="List retailer inventory items with stock levels and low-stock filter",
)
def get_retailer_inventory(
    low_stock: bool = Query(
        default=False, description="Filter items at or below reorder threshold"
    ),
    search: str | None = Query(default=None, description="Search product title, brand, or SKU"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=20, ge=1, le=100, description="Items per page"),
    retailer_id: uuid.UUID | None = Query(
        default=None, description="Retailer ID (platform admin only)"
    ),
    current_user: User = Depends(require_retailer),
    db: Session = Depends(get_db),
) -> PaginatedResponse[InventoryItemResponse]:
    """Retrieve retailer stock items with reserved, available, and threshold status."""
    resolved_id = _resolve_retailer_id(current_user, retailer_id)
    return InventoryService.get_inventory(
        db=db,
        retailer_id=resolved_id,
        low_stock_only=low_stock,
        search=search,
        page=page,
        limit=limit,
    )


@router.post(
    "/inventory/inward",
    response_model=StockInwardResponse,
    summary="Inward stock batch for a product variant",
)
def inward_stock_batch(
    payload: StockInwardRequest,
    retailer_id: uuid.UUID | None = Query(
        default=None, description="Retailer ID (platform admin only)"
    ),
    current_user: User = Depends(require_retailer),
    db: Session = Depends(get_db),
) -> StockInwardResponse:
    """Inward a new supplier batch of stock, update current stock, and record movement."""
    resolved_id = _resolve_retailer_id(current_user, retailer_id)
    return InventoryService.inward_stock(
        db=db,
        retailer_id=resolved_id,
        payload=payload,
    )


@router.patch(
    "/inventory/{id}",
    response_model=InventoryAdjustmentResponse,
    summary="Adjust inventory stock quantity with audit logging",
)
def adjust_inventory_stock(
    id: uuid.UUID,
    payload: InventoryAdjustmentRequest,
    retailer_id: uuid.UUID | None = Query(
        default=None, description="Retailer ID (platform admin only)"
    ),
    current_user: User = Depends(require_retailer),
    db: Session = Depends(get_db),
) -> InventoryAdjustmentResponse:
    """
    Adjust stock level (e.g. spoilage, damage, recount).
    Strictly verifies item belongs to the authenticated retailer.
    Creates an audit log and inventory movement.
    """
    resolved_id = _resolve_retailer_id(current_user, retailer_id)
    return InventoryService.adjust_stock(
        db=db,
        retailer_id=resolved_id,
        inventory_id=id,
        payload=payload,
        user_id=current_user.id,
    )


@router.get(
    "/inventory/movements",
    response_model=PaginatedResponse[InventoryMovementResponse],
    summary="List stock movement history for the retailer",
)
def get_inventory_movements(
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=20, ge=1, le=100, description="Items per page"),
    retailer_id: uuid.UUID | None = Query(
        default=None, description="Retailer ID (platform admin only)"
    ),
    current_user: User = Depends(require_retailer),
    db: Session = Depends(get_db),
) -> PaginatedResponse[InventoryMovementResponse]:
    """Retrieve chronological stock movement log (inward, adjustments, packaging)."""
    resolved_id = _resolve_retailer_id(current_user, retailer_id)
    return InventoryService.get_movements(
        db=db,
        retailer_id=resolved_id,
        page=page,
        limit=limit,
    )
