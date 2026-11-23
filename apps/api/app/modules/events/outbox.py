import json
import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.clock import now_utc
from app.models.system import OutboxEvent
from app.modules.events.transport import EventTransport, get_event_transport

logger = logging.getLogger("pact.events.outbox")

# Canonical Event Types
ORDER_CREATED = "ORDER_CREATED"
ORDER_ACCEPTED = "ORDER_ACCEPTED"
ORDER_PACKED = "ORDER_PACKED"
BILL_FINALISED = "BILL_FINALISED"
PAYMENT_RECEIVED = "PAYMENT_RECEIVED"
DELIVERY_READY = "DELIVERY_READY"
DELIVERY_COMPLETED = "DELIVERY_COMPLETED"
REFUND_PROCESSED = "REFUND_PROCESSED"


class OutboxService:
    """
    Transactional Outbox Service.
    Guarantees at-least-once event delivery by persisting domain events into PostgreSQL
    within the exact same database transaction as the business operation.
    """

    @staticmethod
    def record_event(
        db: Session,
        event_type: str,
        topic: str,
        payload: dict[str, Any],
    ) -> OutboxEvent:
        """
        Persists a domain event in the outbox table within the caller's active database transaction.
        Does not commit; caller commits atomically with their business entities.
        """
        event = OutboxEvent(
            event_type=event_type,
            topic=topic,
            payload=json.dumps(payload, default=str),
            is_published=False,
            created_at=now_utc(),
        )
        db.add(event)
        db.flush()
        logger.debug("Recorded outbox event %s for topic %s", event_type, topic)
        return event

    @staticmethod
    def publish_pending_events(
        db: Session,
        batch_size: int = 50,
        transport: EventTransport | None = None,
    ) -> int:
        """
        Polls un-published outbox events and pushes them to the event transport.
        Marks events published upon successful delivery.
        """
        active_transport = transport or get_event_transport()

        stmt = (
            select(OutboxEvent)
            .where(OutboxEvent.is_published.is_(False))
            .order_by(OutboxEvent.created_at.asc())
            .limit(batch_size)
        )
        events = list(db.scalars(stmt).all())
        published_count = 0

        for ev in events:
            try:
                payload_dict = json.loads(ev.payload)
                success = active_transport.publish(
                    topic=ev.topic,
                    key=str(ev.id),
                    payload={
                        "event_id": str(ev.id),
                        "event_type": ev.event_type,
                        "created_at": ev.created_at.isoformat(),
                        "data": payload_dict,
                    },
                )
                if success:
                    ev.is_published = True
                    ev.published_at = now_utc()
                    published_count += 1
            except Exception as exc:
                logger.error("Failed to publish outbox event %s: %s", ev.id, exc)

        if published_count > 0:
            db.commit()

        return published_count
