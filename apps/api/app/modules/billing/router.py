import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.identity import User
from app.schemas.billing import (
    BillingCalculationInput,
    BillingCalculationResult,
    FinalizeBillingRequest,
    InvoiceResponse,
    RetailerBillResponse,
)
from app.services.billing_service import BillingService

router = APIRouter()


@router.post(
    "/calculate",
    response_model=BillingCalculationResult,
    status_code=status.HTTP_200_OK,
    summary="Preview F7 deterministic billing calculation without persisting",
)
def calculate_billing_preview(
    payload: BillingCalculationInput,
) -> BillingCalculationResult:
    """
    Pure functional simulation of the F7 deterministic fair bill-splitting engine.
    Computes consumed quantities, base costs, discount allocations, delivery split,
    and guarantees zero discrepancy between total resident invoices and the retailer bill.
    """
    return BillingService.calculate_preview(payload)


@router.post(
    "/bulk-orders/{order_id}/finalize",
    status_code=status.HTTP_200_OK,
    summary="Finalize bulk order billing and generate resident invoices",
)
def finalize_order_billing(
    order_id: uuid.UUID,
    payload: FinalizeBillingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Finalizes billing for a consolidated bulk order.
    Executes the F7 algorithm on all member cart items, saves the RetailerBill,
    and generates individual Invoices for each participating resident household.
    Idempotent: Subsequent calls return the already finalized bill.
    """
    return BillingService.finalize_bulk_order_billing(
        db=db,
        bulk_order_id=order_id,
        payload=payload,
        current_user=current_user,
    )


@router.get(
    "/invoices/me",
    response_model=list[InvoiceResponse],
    summary="Get current resident household invoices",
)
def get_my_invoices(
    community_id: uuid.UUID | None = Query(None, description="Optional community filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[InvoiceResponse]:
    """
    Returns all finalized invoices belonging to the authenticated resident.
    """
    return BillingService.get_user_invoices(db, current_user, community_id)


@router.get(
    "/invoices/{invoice_id}",
    response_model=InvoiceResponse,
    summary="Get invoice breakdown by ID",
)
def get_invoice_detail(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvoiceResponse:
    """
    Returns itemized invoice details. Enforces resident privacy:
    customers can only access their own invoice.
    """
    return BillingService.get_invoice_detail(db, invoice_id, current_user)


@router.get(
    "/bills/{bill_id}",
    response_model=RetailerBillResponse,
    summary="Get retailer bill by ID",
)
def get_retailer_bill(
    bill_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RetailerBillResponse:
    """
    Returns the retailer bill details. Accessible by retailer or admin.
    """
    return BillingService.get_retailer_bill_detail(db, bill_id, current_user)


@router.get(
    "/bulk-orders/{order_id}/bill",
    response_model=RetailerBillResponse,
    summary="Get retailer bill by bulk order ID",
)
def get_bill_for_bulk_order(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RetailerBillResponse:
    """
    Returns the retailer bill associated with a bulk order.
    """
    return BillingService.get_bill_by_order_id(db, order_id, current_user)
