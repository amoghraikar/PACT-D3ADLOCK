"""
Kafka Consumer Background Worker.
Subscribes to Kafka / EventTransport topics, deduplicates messages using IdempotencyRecord,
and dispatches events to the notification service and analytics.
Supports both daemon execution and single-batch testing/cron execution.
"""

import argparse
import hashlib
import json
import logging
import signal
import sys
import time
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.clock import now_utc
from app.core.config import settings
from app.core.db import SessionLocal
from app.models.system import IdempotencyRecord
from app.modules.events.transport import EventTransport, get_event_transport
from app.modules.notifications.service import NotificationService

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] [kafka_consumer] %(message)s",
)
logger = logging.getLogger("pact.workers.kafka_consumer")

_stop_requested = False

DEFAULT_CONSUMER_TOPICS = ["pact.events", "pact.payments"]


def _signal_handler(signum, frame):
    global _stop_requested
    logger.info("Signal %d received, requesting consumer shutdown...", signum)
    _stop_requested = True


def consume_and_dispatch(
    db: Session,
    topics: list[str] | None = None,
    group_id: str | None = None,
    max_records: int = 10,
    transport: EventTransport | None = None,
) -> int:
    """
    Consumes a batch of events from given topics, deduplicates via IdempotencyRecord,
    and dispatches to notification and business handlers.
    Returns the count of successfully processed events.
    """
    active_transport = transport or get_event_transport()
    active_topics = topics or DEFAULT_CONSUMER_TOPICS
    active_group = group_id or settings.KAFKA_CONSUMER_GROUP

    processed_count = 0

    for topic in active_topics:
        records = active_transport.consume(
            topic=topic,
            group_id=active_group,
            max_records=max_records,
            timeout_ms=1000,
        )

        for rec in records:
            payload_wrapper = rec.get("payload", {})
            event_id = payload_wrapper.get("event_id") or rec.get("key") or ""
            event_type = payload_wrapper.get("event_type", "")
            data = payload_wrapper.get("data", {})

            # Deduplication key
            idempotency_key = f"kafka_{topic}_{event_id}"
            existing = db.scalars(
                select(IdempotencyRecord).where(
                    IdempotencyRecord.idempotency_key == idempotency_key
                )
            ).first()

            if existing:
                logger.debug("Skipping already processed event %s on topic %s", event_id, topic)
                continue

            try:
                # Dispatch to notification handler
                NotificationService.handle_domain_event(
                    db=db,
                    event_type=event_type,
                    payload=data,
                )

                # Record idempotency to guarantee exactly-once processing
                idemp = IdempotencyRecord(
                    idempotency_key=idempotency_key,
                    request_path=f"kafka://{topic}",
                    request_params_hash=hashlib.sha256(json.dumps(payload_wrapper).encode()).hexdigest(),
                    response_code=200,
                    response_body=json.dumps({"status": "processed", "event_type": event_type}),
                    created_at=now_utc(),
                    expires_at=now_utc() + timedelta(days=14),
                )
                db.add(idemp)
                db.commit()
                processed_count += 1
                logger.info("Processed event %s (%s) from topic %s", event_id, event_type, topic)

            except Exception as exc:
                db.rollback()
                logger.error("Failed to process event %s: %s", event_id, exc, exc_info=True)

    return processed_count


def run_kafka_consumer(
    topics: list[str] | None = None,
    poll_interval: float = 2.0,
    once: bool = False,
    max_records: int = 10,
    transport: EventTransport | None = None,
) -> int:
    """
    Runs the Kafka consumer loop or single batch execution.
    """
    signal.signal(signal.SIGINT, _signal_handler)
    signal.signal(signal.SIGTERM, _signal_handler)

    active_transport = transport or get_event_transport()
    logger.info(
        "Starting Kafka Consumer (topics=%s, once=%s, interval=%.1fs)...",
        topics or DEFAULT_CONSUMER_TOPICS,
        once,
        poll_interval,
    )

    total_processed = 0

    while not _stop_requested:
        db: Session = SessionLocal()
        try:
            count = consume_and_dispatch(
                db=db,
                topics=topics,
                max_records=max_records,
                transport=active_transport,
            )
            total_processed += count
        except Exception as exc:
            logger.error("Consumer loop exception: %s", exc, exc_info=True)
        finally:
            db.close()

        if once:
            break

        time.sleep(poll_interval)

    logger.info("Kafka Consumer stopped. Total processed: %d.", total_processed)
    return total_processed


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PACT Kafka Consumer Worker")
    parser.add_argument("--once", action="store_true", help="Consume a single batch and exit")
    parser.add_argument("--interval", type=float, default=2.0, help="Polling interval in seconds")
    parser.add_argument("--max-records", type=int, default=10, help="Max records per topic per poll")
    args = parser.parse_args()

    count = run_kafka_consumer(
        poll_interval=args.interval,
        once=args.once,
        max_records=args.max_records,
    )
    sys.exit(0)
