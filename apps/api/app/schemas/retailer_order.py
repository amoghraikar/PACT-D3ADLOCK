import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.billing import RetailerBillResponse


class PackingRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    bulk_order_item_id: uuid.UUID
    batch_id: uuid.UUID | None = None
    packed_qty: int
    notes: str | None = None
    packed_at: datetime


class RetailerOrderItemDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    variant_id: uuid.UUID
    product_id: uuid.UUID
    product_title: str
    brand: str
    variant_title: str
    variant_sku: str
    variant_unit: str
    category_name: str
    requested_qty: int
    packed_qty: int
    short_packed_qty: int
    is_unavailable: bool
    unit_price_paise: int
    subtotal_paise: int
    packing_records: list[PackingRecordResponse] = []


class RetailerOrderSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_number: str
    cycle_id: uuid.UUID
    cycle_month: str
    community_id: uuid.UUID
    community_name: str
    retailer_id: uuid.UUID
    status: str
    total_requested_items: int
    total_packed_items: int
    subtotal_paise: int
    discount_paise: int
    delivery_fee_paise: int
    total_paise: int
    placed_at: datetime
    locked_at: datetime | None = None
    dispatched_at: datetime | None = None
    delivered_at: datetime | None = None
    participating_households_count: int


class RetailerOrderDetail(RetailerOrderSummary):
    items: list[RetailerOrderItemDetail] = []
    retailer_bill: RetailerBillResponse | None = None


class AcceptOrderResponse(BaseModel):
    order_id: uuid.UUID
    status: str
    message: str
    locked_at: datetime


class RejectOrderRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=255, description="Reason for rejection")


class RejectOrderResponse(BaseModel):
    order_id: uuid.UUID
    status: str
    reason: str
    message: str


class PackingItemUpdate(BaseModel):
    variant_id: uuid.UUID
    packed_qty: int = Field(..., ge=0, description="Packed count (must not exceed requested)")
    batch_id: uuid.UUID | None = Field(default=None, description="Optional inventory batch ID")
    notes: str | None = Field(default=None, max_length=255, description="Packing or shortage notes")
    is_unavailable: bool = Field(
        default=False, description="Set True if product is completely unavailable (sets packed_qty=0)"
    )


class UpdatePackingRequest(BaseModel):
    items: list[PackingItemUpdate] = Field(..., min_length=1)


class UpdatePackingResponse(BaseModel):
    order_id: uuid.UUID
    status: str
    total_requested_items: int
    total_packed_items: int
    items: list[RetailerOrderItemDetail]


class SendBillRequest(BaseModel):
    delivery_fee_paise: int | None = Field(
        default=None, ge=0, description="Optional delivery fee override in paise"
    )
    order_discount_paise: int = Field(
        default=0, ge=0, description="Optional bulk discount in paise"
    )
    delivery_allocation_mode: Literal["EQUAL", "PRO_RATA"] = Field(
        default="EQUAL", description="Delivery fee allocation mode among active residents"
    )


class SendBillResponse(BaseModel):
    order_id: uuid.UUID
    status: str
    retailer_bill: RetailerBillResponse
    total_invoices_generated: int
    sum_invoices_paise: int
    zero_discrepancy_verified: bool
    audit_log: dict


class DispatchOrderResponse(BaseModel):
    order_id: uuid.UUID
    status: str
    dispatched_at: datetime
    message: str


class RetailerDashboardMetrics(BaseModel):
    retailer_id: uuid.UUID
    retailer_name: str
    total_orders: int
    pending_orders: int
    orders_being_packed: int
    monthly_sales_paise: int
    gross_order_value_paise: int
    outstanding_collections_paise: int
    inventory_alerts: int
