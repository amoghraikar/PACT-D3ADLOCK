import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.identity import User
from app.modules.payments.service import PaymentService
from app.schemas.payment import (
    CreatePaymentOrderRequest,
    PaymentHistoryItem,
    PaymentOrderResponse,
    PaymentVerificationResponse,
    RefundRequest,
    RefundResponse,
    VerifyPaymentRequest,
)

logger = logging.getLogger("pact.payments.router")

router = APIRouter()


@router.post(
    "/orders/create",
    response_model=PaymentOrderResponse,
    summary="Create Payment Gateway Order",
    description="Creates an order with Razorpay/Mock gateway for settling an invoice.",
)
def create_payment_order(
    payload: CreatePaymentOrderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaymentOrderResponse:
    return PaymentService.create_order(
        db=db,
        user=current_user,
        invoice_id=payload.invoice_id,
    )


@router.post(
    "/verify",
    response_model=PaymentVerificationResponse,
    summary="Verify Payment and Settle Invoice",
    description="Verifies the payment gateway cryptographic signature (HMAC-SHA256) and settles the invoice.",
)
def verify_payment(
    payload: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaymentVerificationResponse:
    return PaymentService.verify_payment(
        db=db,
        user=current_user,
        payload=payload,
    )


@router.post(
    "/webhook",
    summary="Razorpay Webhook Handler",
    description="Receives server-to-server webhook events from Razorpay, validates HMAC-SHA256 signature and settles payments idempotently.",
)
async def payment_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_razorpay_signature: str | None = Header(None, alias="X-Razorpay-Signature"),
) -> dict[str, Any]:
    raw_body = await request.body()
    return PaymentService.process_webhook(
        db=db,
        raw_body=raw_body,
        signature=x_razorpay_signature or "",
    )


@router.post(
    "/refunds",
    response_model=RefundResponse,
    summary="Issue Invoice Refund",
    description="Issues a full or partial refund for a settled invoice payment.",
)
def issue_refund(
    payload: RefundRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RefundResponse:
    return PaymentService.create_refund(
        db=db,
        user=current_user,
        payload=payload,
    )


@router.get(
    "/invoices/{invoice_id}/history",
    response_model=list[PaymentHistoryItem],
    summary="Get Payment and Refund History",
    description="Fetches full audit trail of payments and refunds for an invoice.",
)
def get_payment_history(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PaymentHistoryItem]:
    return PaymentService.get_history(
        db=db,
        user=current_user,
        invoice_id=invoice_id,
    )
