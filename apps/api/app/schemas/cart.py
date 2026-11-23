import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CartItemRequest(BaseModel):
    quantity: int = Field(..., ge=0, description="Quantity to set. If 0, removes item from cart.")
    notes: str | None = Field(default=None, max_length=255)


class BatchCartItem(BaseModel):
    variant_id: uuid.UUID
    quantity: int = Field(..., ge=0, description="Quantity to set")
    notes: str | None = Field(default=None, max_length=255)


class BatchCartRequest(BaseModel):
    items: list[BatchCartItem] = Field(..., min_length=1)


class PersonalCartItem(BaseModel):
    id: uuid.UUID
    variant_id: uuid.UUID
    product_id: uuid.UUID
    product_title: str
    product_brand: str | None = None
    variant_title: str
    variant_sku: str
    variant_unit: str
    unit_price_paise: int
    quantity: int
    subtotal_paise: int
    primary_image_url: str | None = None
    community_aggregate_qty: int = 0


class CommunityDemandAggregate(BaseModel):
    total_distinct_items: int = 0
    total_units_count: int = 0
    participating_households_count: int = 0
    estimated_total_paise: int = 0


class CycleSummary(BaseModel):
    id: uuid.UUID
    community_id: uuid.UUID
    community_name: str
    cycle_month: str
    cutoff_at: datetime
    status: str  # OPEN, LOCKED, PROCESSING, COMPLETED
    time_remaining_seconds: int
    is_cutoff_passed: bool
    participating_households_count: int = 0


class CartResponse(BaseModel):
    cycle: CycleSummary
    items: list[PersonalCartItem]
    personal_total_paise: int
    community_summary: CommunityDemandAggregate


class BulkOrderItemResponse(BaseModel):
    id: uuid.UUID
    variant_id: uuid.UUID
    variant_title: str
    variant_sku: str
    requested_qty: int
    packed_qty: int
    unit_price_paise: int
    subtotal_paise: int


class BulkOrderResponse(BaseModel):
    id: uuid.UUID
    cycle_id: uuid.UUID
    community_id: uuid.UUID
    retailer_id: uuid.UUID
    order_number: str
    status: str
    total_requested_items: int
    subtotal_paise: int
    delivery_fee_paise: int
    total_paise: int
    placed_at: datetime
    items: list[BulkOrderItemResponse] = []


class ClockOverrideRequest(BaseModel):
    timestamp_iso: str | None = Field(
        default=None,
        description="ISO 8601 formatted timestamp string to freeze time to. Set to null to restore real system time.",
    )


class ClockStatusResponse(BaseModel):
    current_time_utc: datetime
    current_time_business: datetime
    is_override_active: bool
