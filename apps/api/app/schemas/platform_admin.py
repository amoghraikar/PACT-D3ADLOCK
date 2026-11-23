import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PlatformCommunityItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    code: str
    address: str
    city: str
    postal_code: str
    is_active: bool
    total_members: int
    total_apartments: int
    created_at: datetime


class CreateCommunityRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    code: str = Field(..., min_length=2, max_length=30)
    address: str = Field(..., min_length=5)
    city: str = Field(default="Bengaluru", max_length=80)
    postal_code: str = Field(..., min_length=4, max_length=20)


class PlatformRetailerItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    store_name: str
    business_address: str
    gstin: str | None = None
    phone: str
    status: str
    associated_communities_count: int


class CreateRetailerRequest(BaseModel):
    phone: str = Field(..., description="E.164 phone number, e.g. +919999900010")
    full_name: str = Field(..., min_length=2, max_length=120)
    store_name: str = Field(..., min_length=2, max_length=120)
    business_address: str = Field(..., min_length=5)
    gstin: str | None = Field(default=None, max_length=30)


class MapRetailerCommunityRequest(BaseModel):
    retailer_id: uuid.UUID
    community_id: uuid.UUID
    delivery_fee_paise: int = Field(default=0, ge=0)
    is_primary: bool = Field(default=True)
    is_active: bool = Field(default=True)


class MapRetailerCommunityResponse(BaseModel):
    id: uuid.UUID
    retailer_id: uuid.UUID
    retailer_store_name: str
    community_id: uuid.UUID
    community_name: str
    delivery_fee_paise: int
    is_primary: bool
    is_active: bool


class GlobalTransactionSummary(BaseModel):
    total_orders: int
    total_gross_paise: int
    total_discount_paise: int
    total_delivery_fee_paise: int
    total_net_paise: int
    total_collected_paise: int
    total_outstanding_paise: int


class PlatformHealthMetrics(BaseModel):
    status: str
    database: str
    active_communities_count: int
    active_retailers_count: int
    total_users_count: int
    time_utc: datetime
    environment: str


class AuditLogItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID | None = None
    user_phone: str | None = None
    action: str
    entity_type: str
    entity_id: str
    payload_before: str | None = None
    payload_after: str | None = None
    created_at: datetime


class PlatformConfigResponse(BaseModel):
    environment: str
    cutoff_day: int
    cutoff_time: str
    session_max_age_days: int
    dev_otp_mode: bool
    reminder_rate_limit_minutes: int


class UpdatePlatformConfigRequest(BaseModel):
    cutoff_day: int | None = Field(default=None, ge=1, le=31)
    cutoff_time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    reminder_rate_limit_minutes: int | None = Field(default=None, ge=1, le=1440)
