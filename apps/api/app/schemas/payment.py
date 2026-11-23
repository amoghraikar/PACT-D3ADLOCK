import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CreatePaymentOrderRequest(BaseModel):
    invoice_id: uuid.UUID


class PaymentOrderResponse(BaseModel):
    order_id: str
    invoice_id: uuid.UUID
    amount_paise: int
    currency: str = "INR"
    key_id: str
    customer_phone: str
    customer_name: str


class VerifyPaymentRequest(BaseModel):
    invoice_id: uuid.UUID
    gateway_order_id: str
    gateway_payment_id: str
    gateway_signature: str


class PaymentVerificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    payment_record_id: uuid.UUID
    invoice_id: uuid.UUID
    amount_paise: int
    status: str
    transaction_id: str | None
    is_duplicate: bool = False
    invoice_status: str
    recorded_at: datetime


class RefundRequest(BaseModel):
    invoice_id: uuid.UUID
    amount_paise: int = Field(..., gt=0)
    reason: str = Field(..., min_length=3, max_length=255)


class RefundResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    refund_id: uuid.UUID
    payment_record_id: uuid.UUID
    amount_paise: int
    status: str
    reason: str
    initiated_at: datetime
    completed_at: datetime | None = None


class PaymentHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    payment_record_id: uuid.UUID
    amount_paise: int
    status: str
    gateway: str
    transaction_id: str | None
    gateway_order_id: str | None
    recorded_at: datetime
    refunds: list[RefundResponse] = []
