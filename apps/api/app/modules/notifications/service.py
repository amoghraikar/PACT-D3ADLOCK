import uuid
from datetime import datetime, timezone
from typing import Any


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


# In-memory storage for notifications
# id -> notification dict
NOTIFICATIONS: dict[str, dict[str, Any]] = {}

# Deduplication key tracking: (event_type, event_id, recipient_id) -> notification_id
EVENT_NOTIFICATION_REGISTRY: set[tuple[str, str, str]] = set()


def create_notification(
    recipient_id: str,
    notification_type: str,
    title: str,
    message: str,
    data: dict[str, Any] | None = None,
    event_type: str | None = None,
    event_id: str | None = None,
) -> dict[str, Any] | None:
    """
    Creates an in-app notification.
    Enforces idempotency per (event_type, event_id, recipient_id) if event_id is supplied.
    """
    if event_type and event_id:
        dedup_key = (event_type, event_id, recipient_id)
        if dedup_key in EVENT_NOTIFICATION_REGISTRY:
            return None
        EVENT_NOTIFICATION_REGISTRY.add(dedup_key)

    notif_id = f"notif-{uuid.uuid4().hex[:12]}"
    record = {
        "id": notif_id,
        "recipient_id": recipient_id,
        "type": notification_type,
        "title": title,
        "message": message,
        "data": data or {},
        "is_read": False,
        "created_at": now_utc().isoformat(),
        "read_at": None,
    }
    NOTIFICATIONS[notif_id] = record
    return record


def get_user_notifications(user_id: str, unread_only: bool = False) -> list[dict[str, Any]]:
    """Returns caller's notifications sorted by created_at descending."""
    results = [
        n for n in NOTIFICATIONS.values()
        if n["recipient_id"] == user_id
    ]
    if unread_only:
        results = [n for n in results if not n["is_read"]]

    results.sort(key=lambda x: x["created_at"], reverse=True)
    return results


def mark_notification_read(user_id: str, notification_id: str) -> dict[str, Any] | None:
    """Marks a single notification as read, only if owned by user_id."""
    n = NOTIFICATIONS.get(notification_id)
    if not n or n["recipient_id"] != user_id:
        return None
    n["is_read"] = True
    n["read_at"] = now_utc().isoformat()
    return n


def mark_all_read(user_id: str) -> int:
    """Marks all notifications as read for user_id."""
    count = 0
    now_str = now_utc().isoformat()
    for n in NOTIFICATIONS.values():
        if n["recipient_id"] == user_id and not n["is_read"]:
            n["is_read"] = True
            n["read_at"] = now_str
            count += 1
    return count


def clear_notifications_for_test():
    NOTIFICATIONS.clear()
    EVENT_NOTIFICATION_REGISTRY.clear()
