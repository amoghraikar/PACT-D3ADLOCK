import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CommunityOverviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    community_id: uuid.UUID
    name: str
    code: str
    address: str
    city: str
    postal_code: str
    total_buildings: int
    total_apartments: int
    total_registered_households: int


class AdminDashboardMetrics(BaseModel):
    community_id: uuid.UUID
    community_name: str
    cycle_month: str
    total_households: int
    participating_households: int
    total_billing_amount_paise: int
    amount_collected_paise: int
    outstanding_amount_paise: int
    collection_percentage: float
    deliveries_pending: int
    deliveries_completed: int


class AdminCycleOverview(BaseModel):
    cycle_id: uuid.UUID
    cycle_month: str
    cutoff_at: datetime
    status: str
    seconds_until_cutoff: int
    is_cutoff_passed: bool
    total_requested_units: int
    total_packed_units: int
    total_order_amount_paise: int
    participating_households_count: int


class ResidentCollectionItem(BaseModel):
    invoice_id: uuid.UUID
    invoice_number: str
    user_id: uuid.UUID
    resident_name: str
    phone: str
    apartment_unit: str | None = None
    building_name: str | None = None
    total_amount_paise: int
    paid_amount_paise: int
    outstanding_amount_paise: int
    status: str
    last_reminder_at: datetime | None = None


class ResidentCollectionResponse(BaseModel):
    items: list[ResidentCollectionItem]
    total_invoices: int
    total_billed_paise: int
    total_collected_paise: int
    total_outstanding_paise: int


class TriggerReminderRequest(BaseModel):
    channels: list[Literal["in_app", "sms", "whatsapp"]] = Field(
        default=["in_app", "sms", "whatsapp"],
        description="Notification channels to dispatch reminder to",
    )
    custom_message: str | None = Field(
        default=None, max_length=255, description="Optional custom reminder text"
    )


class ChannelDeliveryReport(BaseModel):
    channel: str
    status: Literal["sent", "failed", "unconfigured"]
    provider_message_id: str | None = None
    error: str | None = None


class TriggerReminderResponse(BaseModel):
    invoice_id: uuid.UUID
    recipient_user_id: uuid.UUID
    recipient_name: str
    channels_attempted: list[str]
    channels_confirmed: list[str]
    channels_failed: list[str]
    details: list[ChannelDeliveryReport]
    message: str


class DeliveryHandoverItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    handover_id: uuid.UUID
    delivery_id: uuid.UUID
    invoice_id: uuid.UUID
    invoice_number: str
    recipient_user_id: uuid.UUID
    recipient_name: str
    phone: str
    apartment_unit: str | None = None
    building_name: str | None = None
    status: str  # pending, handed_over
    handover_timestamp: datetime | None = None
    handed_over_by_id: uuid.UUID | None = None
    handed_over_by_name: str | None = None
    notes: str | None = None


class DeliveryStatusResponse(BaseModel):
    delivery_id: uuid.UUID
    bulk_order_id: uuid.UUID
    order_number: str
    status: str  # scheduled, in_transit, at_gate, delivered
    dispatched_at: datetime | None = None
    arrived_at_gate: datetime | None = None
    completed_at: datetime | None = None
    total_handovers: int
    pending_handovers: int
    completed_handovers: int
    handovers: list[DeliveryHandoverItem] = []


class ConfirmHandoverRequest(BaseModel):
    notes: str | None = Field(default=None, max_length=255)


class ConfirmHandoverResponse(BaseModel):
    handover_id: uuid.UUID
    status: str
    handover_timestamp: datetime
    handed_over_by_id: uuid.UUID
    message: str
