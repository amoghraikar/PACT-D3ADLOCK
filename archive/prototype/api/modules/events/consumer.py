import logging
from typing import Any
from app.modules.events.dispatch import dispatch_event

logger = logging.getLogger("pact.consumer")

# (consumer_name, event_id) -> processed
PROCESSED_EVENTS: set[tuple[str, str]] = set()


def is_event_processed(consumer_name: str, event_id: str) -> bool:
    return (consumer_name, event_id) in PROCESSED_EVENTS


def mark_event_processed(consumer_name: str, event_id: str):
    PROCESSED_EVENTS.add((consumer_name, event_id))


def process_event_idempotent(consumer_name: str, event_envelope: dict[str, Any]) -> bool:
    """
    P23: Idempotent event processing.
    Uses processed_events registry/table to make redelivery harmless.
    """
    event_id = event_envelope.get("id")
    if not event_id:
        return False

    if is_event_processed(consumer_name, event_id):
        logger.info(f"Duplicate event {event_id} skipped for consumer {consumer_name}")
        return False

    dispatch_event(event_envelope)
    mark_event_processed(consumer_name, event_id)
    return True


def clear_processed_events():
    PROCESSED_EVENTS.clear()
