import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NotificationItem(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    message: str
    kind: str
    is_read: bool
    read_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    items: list[NotificationItem]
    total: int
    unread_count: int
    page: int
    limit: int


class UnreadCountResponse(BaseModel):
    unread_count: int


class NotificationPreferenceItem(BaseModel):
    channel: str = Field(..., description="in_app, sms, whatsapp, or email")
    enabled: bool


class UpdatePreferencesRequest(BaseModel):
    preferences: list[NotificationPreferenceItem]


class MarkNotificationsReadRequest(BaseModel):
    notification_ids: list[uuid.UUID] | None = Field(
        None, description="Optional list of notification IDs. If omitted, marks all as read."
    )


class MarkReadResponse(BaseModel):
    marked_read: int
