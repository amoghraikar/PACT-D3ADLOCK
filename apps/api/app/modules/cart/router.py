"""
Collective Cart API Router:
- View personal items with anonymized community demand aggregates
- Update item quantity (thread-safe row locking)
- Remove item from personal cart
- Batch update multiple items
"""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import require_customer
from app.models.identity import User
from app.schemas.cart import BatchCartRequest, CartItemRequest, CartResponse
from app.services.cart_service import CartService

router = APIRouter()


@router.get(
    "",
    response_model=CartResponse,
    summary="Retrieve personal cart items and aggregated community demand",
)
def get_cart(
    community_id: uuid.UUID | None = Query(
        default=None, description="Community ID context (platform admin only)"
    ),
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CartResponse:
    """
    Returns personal cart items with units and prices in integer paise,
    along with anonymized total community demand aggregates and cycle countdown.
    """
    return CartService.get_user_cart(
        db=db,
        user=current_user,
        community_id=community_id,
    )


@router.put(
    "/items/{variant_id}",
    response_model=CartResponse,
    summary="Update or set item quantity in personal cart",
)
def update_cart_item(
    variant_id: uuid.UUID,
    payload: CartItemRequest,
    community_id: uuid.UUID | None = Query(default=None, description="Community ID context"),
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CartResponse:
    """
    Sets quantity for the specified variant. Setting quantity=0 removes the item.
    Enforces cutoff boundary: returns HTTP 409 ORDER_CYCLE_LOCKED if cutoff has passed.
    """
    return CartService.update_cart_item(
        db=db,
        user=current_user,
        variant_id=variant_id,
        quantity=payload.quantity,
        notes=payload.notes,
        community_id=community_id,
    )


@router.delete(
    "/items/{variant_id}",
    response_model=CartResponse,
    summary="Remove an item from personal cart",
)
def remove_cart_item(
    variant_id: uuid.UUID,
    community_id: uuid.UUID | None = Query(default=None, description="Community ID context"),
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CartResponse:
    """
    Removes the specified variant from user's personal cart.
    Returns 409 ORDER_CYCLE_LOCKED if cutoff has passed.
    """
    return CartService.remove_cart_item(
        db=db,
        user=current_user,
        variant_id=variant_id,
        community_id=community_id,
    )


@router.post(
    "/items:batch",
    response_model=CartResponse,
    summary="Batch update multiple items in personal cart",
)
def batch_update_cart(
    payload: BatchCartRequest,
    community_id: uuid.UUID | None = Query(default=None, description="Community ID context"),
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CartResponse:
    """
    Atomically updates multiple items in the personal cart.
    Returns 409 ORDER_CYCLE_LOCKED if cutoff has passed.
    """
    return CartService.batch_update_cart(
        db=db,
        user=current_user,
        items=payload.items,
        community_id=community_id,
    )
