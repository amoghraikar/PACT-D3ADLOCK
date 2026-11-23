import logging
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.identity import User
from app.modules.notifications.service import NotificationService
from app.schemas.notification import (
    MarkNotificationsReadRequest,
    MarkReadResponse,
    NotificationItem,
    NotificationListResponse,
    NotificationPreferenceItem,
    UnreadCountResponse,
    UpdatePreferencesRequest,
)

logger = logging.getLogger("pact.notifications.router")

router = APIRouter()


@router.get(
    "",
    response_model=NotificationListResponse,
    summary="List In-App Notifications",
    description="Retrieves a paginated list of notifications for the authenticated user.",
)
def list_notifications(
    unread_only: bool = Query(False, description="Filter to only unread notifications"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationListResponse:
    return NotificationService.get_user_notifications(
        db=db,
        user_id=current_user.id,
        unread_only=unread_only,
        page=page,
        limit=limit,
    )


@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    summary="Get Unread Notification Count",
    description="Returns the total count of unread notifications for the badge indicator.",
)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UnreadCountResponse:
    count = NotificationService.get_unread_count(db=db, user_id=current_user.id)
    return UnreadCountResponse(unread_count=count)


@router.post(
    "/{notification_id}/read",
    response_model=NotificationItem,
    summary="Mark Notification as Read",
    description="Marks a specific notification as read.",
)
def mark_notification_as_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationItem:
    return NotificationService.mark_as_read(
        db=db,
        user_id=current_user.id,
        notification_id=notification_id,
    )


@router.post(
    "/read-all",
    response_model=MarkReadResponse,
    summary="Mark All Notifications as Read",
    description="Marks all unread notifications (or a specific subset) as read.",
)
def mark_all_notifications_as_read(
    payload: MarkNotificationsReadRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MarkReadResponse:
    notif_ids = payload.notification_ids if payload else None
    count = NotificationService.mark_all_read(
        db=db,
        user_id=current_user.id,
        notification_ids=notif_ids,
    )
    return MarkReadResponse(marked_read=count)


@router.get(
    "/preferences",
    response_model=list[NotificationPreferenceItem],
    summary="Get Notification Channel Preferences",
    description="Returns the resident's communication channel preferences.",
)
def get_notification_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[NotificationPreferenceItem]:
    return NotificationService.get_preferences(db=db, user_id=current_user.id)


@router.put(
    "/preferences",
    response_model=list[NotificationPreferenceItem],
    summary="Update Notification Channel Preferences",
    description="Updates the resident's communication channel preferences.",
)
def update_notification_preferences(
    payload: UpdatePreferencesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[NotificationPreferenceItem]:
    return NotificationService.update_preferences(
        db=db,
        user_id=current_user.id,
        preferences=payload.preferences,
    )
