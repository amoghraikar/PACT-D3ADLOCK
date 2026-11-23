import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import require_retailer
from app.core.pagination import PaginatedResponse
from app.models.identity import User
from app.schemas.billing import BillingCalculationResult
from app.schemas.retailer_order import (
    AcceptOrderResponse,
    DispatchOrderResponse,
    RejectOrderRequest,
    RejectOrderResponse,
    RetailerDashboardMetrics,
    RetailerOrderDetail,
    RetailerOrderSummary,
    SendBillRequest,
    SendBillResponse,
    UpdatePackingRequest,
    UpdatePackingResponse,
)
from app.services.retailer_order_service import RetailerOrderService

router = APIRouter()


@router.get(
    "/orders",
    response_model=PaginatedResponse[RetailerOrderSummary],
    summary="List incoming community bulk orders for retailer",
)
def get_retailer_orders(
    status: str | None = Query(
        default=None,
        description="Filter by order state: PENDING, ACCEPTED, PACKING, BILLED, DISPATCHED, COMPLETED, REJECTED",
    ),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=20, ge=1, le=100, description="Items per page"),
    retailer_id: uuid.UUID | None = Query(
        default=None, description="Retailer ID (platform admin override only)"
    ),
    current_user: User = Depends(require_retailer),
    db: Session = Depends(get_db),
) -> PaginatedResponse[RetailerOrderSummary]:
    """
    Retrieve incoming consolidated community bulk orders.
    Enforces strict retailer-tenant boundary.
    """
    return RetailerOrderService.get_orders(
        db=db,
        current_user=current_user,
        status=status,
        page=page,
        limit=limit,
        explicit_retailer_id=retailer_id,
    )


@router.get(
    "/orders/{order_id}",
    response_model=RetailerOrderDetail,
    summary="Get full order details with variant demand and packing records",
)
def get_retailer_order_detail(
    order_id: uuid.UUID,
    retailer_id: uuid.UUID | None = Query(
        default=None, description="Retailer ID (platform admin override only)"
    ),
    current_user: User = Depends(require_retailer),
    db: Session = Depends(get_db),
) -> RetailerOrderDetail:
    """
    Retrieve complete bulk order details including total demand grouped by variant,
    participating household count, packing history, and bill snapshots.
    """
    return RetailerOrderService.get_order_detail(
        db=db,
        order_id=order_id,
        current_user=current_user,
        explicit_retailer_id=retailer_id,
    )


@router.post(
    "/orders/{order_id}/accept",
    response_model=AcceptOrderResponse,
    status_code=status.HTTP_200_OK,
    summary="Accept an incoming community bulk order",
)
def accept_order(
    order_id: uuid.UUID,
    current_user: User = Depends(require_retailer),
    db: Session = Depends(get_db),
) -> AcceptOrderResponse:
    """
    Transitions order state from PENDING -> ACCEPTED.
    Locks the order and prepares for inventory packing.
    """
    return RetailerOrderService.accept_order(
        db=db,
        order_id=order_id,
        current_user=current_user,
    )


@router.post(
    "/orders/{order_id}/reject",
    response_model=RejectOrderResponse,
    status_code=status.HTTP_200_OK,
    summary="Reject an incoming community bulk order",
)
def reject_order(
    order_id: uuid.UUID,
    payload: RejectOrderRequest,
    current_user: User = Depends(require_retailer),
    db: Session = Depends(get_db),
) -> RejectOrderResponse:
    """
    Transitions order state from PENDING -> REJECTED with reason recorded in audit log.
    """
    return RetailerOrderService.reject_order(
        db=db,
        order_id=order_id,
        payload=payload,
        current_user=current_user,
    )


@router.post(
    "/orders/{order_id}/packing",
    response_model=UpdatePackingResponse,
    status_code=status.HTTP_200_OK,
    summary="Update packed quantities, short-packs, and unavailable items",
)
def update_order_packing(
    order_id: uuid.UUID,
    payload: UpdatePackingRequest,
    current_user: User = Depends(require_retailer),
    db: Session = Depends(get_db),
) -> UpdatePackingResponse:
    """
    Transitions order to PACKING state and updates packed quantities.
    Enforces rules:
    - Packed quantity cannot exceed requested quantity.
    - Unavailable items explicitly marked with packed_qty = 0.
    - Every change recorded in audit log and packing item history.
    """
    return RetailerOrderService.update_packing(
        db=db,
        order_id=order_id,
        payload=payload,
        current_user=current_user,
    )


@router.get(
    "/orders/{order_id}/bill-preview",
    response_model=BillingCalculationResult,
    summary="Preview final retailer bill and resident invoice breakdown",
)
def preview_order_bill(
    order_id: uuid.UUID,
    delivery_fee_paise: int | None = Query(
        default=None, description="Optional delivery fee override in paise"
    ),
    order_discount_paise: int = Query(
        default=0, description="Optional bulk discount in paise"
    ),
    delivery_allocation_mode: str = Query(
        default="EQUAL", description="EQUAL or PRO_RATA"
    ),
    current_user: User = Depends(require_retailer),
    db: Session = Depends(get_db),
) -> BillingCalculationResult:
    """
    Simulates the F7 deterministic fair bill-splitting engine for current packed items
    without committing financial records to the database.
    """
    return RetailerOrderService.preview_bill(
        db=db,
        order_id=order_id,
        current_user=current_user,
        delivery_fee_paise=delivery_fee_paise,
        order_discount_paise=order_discount_paise,
        delivery_allocation_mode=delivery_allocation_mode,
    )


@router.post(
    "/orders/{order_id}/send-bill",
    response_model=SendBillResponse,
    status_code=status.HTTP_200_OK,
    summary="Finalize retailer bill and trigger F7 invoice generation",
)
def send_order_bill(
    order_id: uuid.UUID,
    payload: SendBillRequest,
    current_user: User = Depends(require_retailer),
    db: Session = Depends(get_db),
) -> SendBillResponse:
    """
    Atomic finalization of the order:
    1. Executes F7 bill calculation.
    2. Persists RetailerBill and itemized Invoices for all participating households.
    3. Locks financials and sets order status to BILLED.
    4. Guarantees SUM(Invoices) == RetailerBill with zero discrepancy.
    """
    return RetailerOrderService.send_bill(
        db=db,
        order_id=order_id,
        payload=payload,
        current_user=current_user,
    )


@router.post(
    "/orders/{order_id}/dispatch",
    response_model=DispatchOrderResponse,
    status_code=status.HTTP_200_OK,
    summary="Dispatch the consolidated bulk order for delivery",
)
def dispatch_order(
    order_id: uuid.UUID,
    current_user: User = Depends(require_retailer),
    db: Session = Depends(get_db),
) -> DispatchOrderResponse:
    """
    Transitions order state from BILLED -> DISPATCHED.
    Records dispatch timestamp and audit log.
    """
    return RetailerOrderService.dispatch_order(
        db=db,
        order_id=order_id,
        current_user=current_user,
    )


@router.get(
    "/dashboard",
    response_model=RetailerDashboardMetrics,
    summary="Get operational and financial dashboard metrics for retailer",
)
def get_retailer_dashboard(
    retailer_id: uuid.UUID | None = Query(
        default=None, description="Retailer ID (platform admin override only)"
    ),
    current_user: User = Depends(require_retailer),
    db: Session = Depends(get_db),
) -> RetailerDashboardMetrics:
    """
    Returns high-level business intelligence metrics:
    - Total orders
    - Pending orders
    - Orders being packed
    - Monthly sales (paise)
    - Gross order value (paise)
    - Outstanding collections (paise)
    - Low-stock inventory alerts
    """
    return RetailerOrderService.get_dashboard_metrics(
        db=db,
        current_user=current_user,
        explicit_retailer_id=retailer_id,
    )
