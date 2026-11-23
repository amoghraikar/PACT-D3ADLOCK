import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# ---------------------------------------------------------------------------
# Core Engine Calculation Schemas (Pure Standalone Input / Output)
# ---------------------------------------------------------------------------


class ResidentItemRequest(BaseModel):
    """A resident household's requested quantity for a product variant."""

    user_id: uuid.UUID | str = Field(
        ..., description="Unique resident household identifier (UUID or string)."
    )
    variant_id: uuid.UUID | str = Field(
        ..., description="Product variant identifier (UUID or string)."
    )
    requested_qty: int = Field(..., ge=0, description="Requested unit count (integer >= 0).")


class VariantPackInfo(BaseModel):
    """Retailer packing details, pricing, and variant-level discounts."""

    variant_id: uuid.UUID | str = Field(..., description="Product variant identifier.")
    packed_qty: int = Field(
        ..., ge=0, description="Actual retailer packed quantity (integer >= 0)."
    )
    unit_price_paise: int = Field(
        ..., ge=0, description="Unit price in integer paise (100 paise = ₹1)."
    )
    discount_paise: int = Field(
        default=0,
        ge=0,
        description="Total bulk/variant discount amount in paise for this variant.",
    )


class BillingCalculationInput(BaseModel):
    """Pure functional inputs for the F7 deterministic billing engine."""

    resident_requests: list[ResidentItemRequest] = Field(
        ..., description="List of all resident item requests in the collective order."
    )
    variant_packs: list[VariantPackInfo] = Field(
        ..., description="Retailer packing, price, and variant discount data."
    )
    delivery_fee_paise: int = Field(
        default=0, ge=0, description="Total delivery fee in integer paise."
    )
    order_discount_paise: int = Field(
        default=0, ge=0, description="Additional order-wide discount in integer paise."
    )
    platform_fee_paise: int = Field(
        default=0, ge=0, description="Platform fee in integer paise (if applicable)."
    )
    delivery_allocation_mode: Literal["EQUAL", "PRO_RATA"] = Field(
        default="EQUAL",
        description="Delivery fee split strategy among active participating households.",
    )


class AllocatedItem(BaseModel):
    """Allocated item details for a specific resident household."""

    variant_id: str
    requested_qty: int
    packed_qty: int
    unit_price_paise: int
    base_cost_paise: int
    discount_paise: int
    net_cost_paise: int


class ResidentInvoiceBreakdown(BaseModel):
    """Complete financial breakdown for an individual resident household."""

    user_id: str
    items: list[AllocatedItem]
    base_amount_paise: int
    discount_amount_paise: int
    delivery_fee_paise: int
    platform_fee_paise: int
    total_amount_paise: int


class RetailerBillSummary(BaseModel):
    """Summary of the consolidated retailer bill."""

    gross_amount_paise: int
    discount_amount_paise: int
    delivery_amount_paise: int
    platform_fee_paise: int
    net_amount_paise: int


class MathematicalAuditLog(BaseModel):
    """Zero-discrepancy mathematical verification audit log."""

    total_requested_units: int
    total_packed_units: int
    active_households_count: int
    sum_resident_invoices_paise: int
    retailer_net_paise: int
    discrepancy_paise: int
    zero_discrepancy_verified: bool
    delivery_remainder_paise: int
    variant_discount_remainders: dict[str, int]
    order_discount_remainder_paise: int


class BillingCalculationResult(BaseModel):
    """Full deterministic calculation result from the F7 engine."""

    resident_invoices: list[ResidentInvoiceBreakdown]
    retailer_bill: RetailerBillSummary
    audit_log: MathematicalAuditLog


# ---------------------------------------------------------------------------
# Database API Request & Response Schemas
# ---------------------------------------------------------------------------


class VariantPackingUpdate(BaseModel):
    """Retailer packed quantity update for a bulk order item."""

    variant_id: uuid.UUID
    packed_qty: int = Field(..., ge=0)
    discount_paise: int = Field(default=0, ge=0)


class FinalizeBillingRequest(BaseModel):
    """Payload to finalize billing for a bulk order."""

    delivery_fee_paise: int | None = Field(
        default=None, ge=0, description="Optional override for delivery fee in paise."
    )
    order_discount_paise: int = Field(
        default=0, ge=0, description="Optional order-level discount in paise."
    )
    platform_fee_paise: int = Field(
        default=0, ge=0, description="Platform fee in paise (default 0)."
    )
    delivery_allocation_mode: Literal["EQUAL", "PRO_RATA"] = Field(
        default="EQUAL", description="Allocation mode for delivery fee."
    )
    packing_updates: list[VariantPackingUpdate] | None = Field(
        default=None,
        description="Optional list of retailer packing overrides (packed_qty, discount).",
    )


class InvoiceItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    variant_id: uuid.UUID
    requested_qty: int
    packed_qty: int
    unit_price_paise: int
    line_total_paise: int


class DiscountAllocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    discount_type: str
    amount_paise: int
    description: str | None = None


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    bulk_order_id: uuid.UUID
    user_id: uuid.UUID
    community_id: uuid.UUID
    invoice_number: str
    base_amount_paise: int
    discount_amount_paise: int
    delivery_fee_paise: int
    total_amount_paise: int
    paid_amount_paise: int
    status: str
    created_at: datetime
    paid_at: datetime | None = None
    items: list[InvoiceItemResponse] = []
    discounts: list[DiscountAllocationResponse] = []


class RetailerBillResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    bulk_order_id: uuid.UUID
    retailer_id: uuid.UUID
    community_id: uuid.UUID
    bill_number: str
    gross_amount_paise: int
    discount_amount_paise: int
    delivery_amount_paise: int
    net_amount_paise: int
    status: str
    issued_at: datetime
    finalized_at: datetime | None = None
