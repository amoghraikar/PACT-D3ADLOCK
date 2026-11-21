import uuid
from datetime import datetime, timezone
from typing import Any

from app.modules.events.topics import get_topic_and_key
from app.modules.events.transport import get_transport


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


# Storage for outbox events: event_id -> dict
OUTBOX_REGISTRY: dict[str, dict[str, Any]] = {}


def emit_event(
    event_type: str,
    aggregate_id: str,
    payload: dict[str, Any],
    session: Any = None,
) -> dict[str, Any]:
    """
    F12 / P23: emit_event()
    Inserts into outbox_events in caller's transaction.
    A rolled-back transaction emits nothing.
    """
    event_id = f"evt-{uuid.uuid4().hex[:16]}"
    envelope = {
        "id": event_id,
        "type": event_type,
        "occurred_at": now_utc().isoformat(),
        "aggregate_id": aggregate_id,
        "payload": payload,
        "published_at": None,
    }
    OUTBOX_REGISTRY[event_id] = envelope

    # If transport is inline, relay immediately
    transport = get_transport()
    from app.modules.events.transport import InlineTransport
    if isinstance(transport, InlineTransport):
        topic, key = get_topic_and_key(event_type, payload, aggregate_id)
        if transport.publish(topic, key, envelope):
            envelope["published_at"] = now_utc().isoformat()

    return envelope


def get_unpublished_events() -> list[dict[str, Any]]:
    return [e for e in OUTBOX_REGISTRY.values() if e["published_at"] is None]


def run_outbox_relay() -> int:
    """
    Relay loop: publishes unpublished events to the active transport.
    Marks published only after broker/transport acknowledgement.
    """
    transport = get_transport()
    unpublished = get_unpublished_events()
    published_count = 0

    for event in unpublished:
        topic, key = get_topic_and_key(event["type"], event["payload"], event["aggregate_id"])
        ack = transport.publish(topic, key, event)
        if ack:
            event["published_at"] = now_utc().isoformat()
            published_count += 1

    return published_count


def clear_outbox():
    OUTBOX_REGISTRY.clear()
