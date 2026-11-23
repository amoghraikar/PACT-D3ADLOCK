from typing import Annotated

from fastapi import APIRouter, Cookie, Header, Query
from app.core.errors import AppError
from app.modules.auth.router import get_user_from_token
from app.modules.notifications.service import (
    get_user_notifications,
    mark_all_read,
    mark_notification_read,
)

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


def get_current_user_id(
    authorization: str | None = None,
    pact_token: str | None = None,
) -> str:
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    elif pact_token:
        token = pact_token

    if not token:
        raise AppError(code="UNAUTHORIZED", message="Authentication required.", status_code=401)

    user = get_user_from_token(token)
    if not user:
        raise AppError(code="UNAUTHORIZED", message="Invalid session token.", status_code=401)

    return user["id"] if isinstance(user, dict) else user.id


@router.get("")
def list_notifications(
    unread: bool = False,
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    F9: GET /notifications?unread=
    Returns caller's own notifications. Nobody can read another person's notifications.
    """
    user_id = get_current_user_id(authorization, pact_token)
    notifs = get_user_notifications(user_id, unread_only=unread)
    unread_count = len([n for n in notifs if not n["is_read"]])
    return {
        "notifications": notifs,
        "unread_count": unread_count,
        "total_count": len(notifs),
    }


@router.post("/{notification_id}/read")
def read_notification(
    notification_id: str,
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    F9: POST /notifications/{id}/read
    Marks caller's notification as read.
    """
    user_id = get_current_user_id(authorization, pact_token)
    updated = mark_notification_read(user_id, notification_id)
    if not updated:
        raise AppError(code="NOTIFICATION_NOT_FOUND", message="Notification not found.", status_code=404)
    return {"status": "success", "notification": updated}


@router.post("/read-all")
def read_all_notifications(
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    F9: POST /notifications/read-all
    Marks all notifications for caller as read.
    """
    user_id = get_current_user_id(authorization, pact_token)
    count = mark_all_read(user_id)
    return {"status": "success", "marked_read_count": count}
