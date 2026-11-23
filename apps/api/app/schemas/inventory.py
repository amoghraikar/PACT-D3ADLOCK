import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class InventoryItemResponse(BaseModel):
    id: uuid.UUID
    retailer_id: uuid.UUID
    variant_id: uuid.UUID
    variant_title: str
    variant_sku: str
    variant_unit: str
    product_title: str
    product_brand: str | None = None
    current_stock_qty: int
    reserved_stock_qty: int
    available_stock_qty: int
    reorder_level_qty: int
    is_low_stock: bool
    is_active: bool
    updated_at: datetime


class StockInwardRequest(BaseModel):
    variant_id: uuid.UUID
    batch_number: str = Field(..., min_length=2, max_length=60)
    quantity: int = Field(..., gt=0, description="Quantity to inward")
    cost_price_paise: int = Field(..., ge=0, description="Cost price in integer paise")
    expiry_date: datetime | None = None
    supplier_name: str | None = None


class StockInwardResponse(BaseModel):
    message: str
    batch_id: uuid.UUID
    variant_id: uuid.UUID
    inward_quantity: int
    new_stock_qty: int


class InventoryAdjustmentRequest(BaseModel):
    quantity_delta: int = Field(..., description="Change in stock (positive or negative integer)")
    reason: str = Field(
        ..., min_length=3, max_length=150, description="Reason for stock adjustment"
    )
    reference_id: str | None = None


class InventoryAdjustmentResponse(BaseModel):
    message: str
    inventory_id: uuid.UUID
    previous_stock_qty: int
    new_stock_qty: int
    quantity_delta: int


class InventoryMovementResponse(BaseModel):
    id: uuid.UUID
    retailer_id: uuid.UUID
    variant_id: uuid.UUID
    variant_title: str | None = None
    movement_type: str
    quantity_delta: int
    reference_id: str | None = None
    created_at: datetime
