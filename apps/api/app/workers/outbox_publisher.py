"""
Outbox Publisher Background Worker.
Polls unpublished events from the PostgreSQL outbox_events table and publishes them
to the configured event transport (Apache Kafka / Aiven / InMemory).
Supports both daemon execution and single-batch execution for cron jobs.
"""

import argparse
import logging
import signal
import sys
import time

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import SessionLocal
from app.modules.events.outbox import OutboxService
from app.modules.events.transport import EventTransport, get_event_transport

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] [outbox_publisher] %(message)s",
)
logger = logging.getLogger("pact.workers.outbox_publisher")

_stop_requested = False


def _signal_handler(signum, frame):
    global _stop_requested
    logger.info("Signal %d received, requesting graceful shutdown...", signum)
    _stop_requested = True


def publish_outbox_batch(
    db: Session,
    batch_size: int = 50,
    transport: EventTransport | None = None,
) -> int:
    """
    Publishes a single batch of pending outbox events.
    Returns the count of successfully published events.
    """
    return OutboxService.publish_pending_events(
        db=db,
        batch_size=batch_size,
        transport=transport,
    )


def run_outbox_publisher(
    poll_interval: float = 2.0,
    once: bool = False,
    batch_size: int = 50,
    transport: EventTransport | None = None,
) -> int:
    """
    Runs the outbox publisher loop or single-shot run.
    """
    signal.signal(signal.SIGINT, _signal_handler)
    signal.signal(signal.SIGTERM, _signal_handler)

    active_transport = transport or get_event_transport()
    logger.info(
        "Starting Outbox Publisher (once=%s, interval=%.1fs, batch_size=%d)...",
        once,
        poll_interval,
        batch_size,
    )

    total_published = 0

    while not _stop_requested:
        db: Session = SessionLocal()
        try:
            count = publish_outbox_batch(
                db=db,
                batch_size=batch_size,
                transport=active_transport,
            )
            total_published += count
            if count > 0:
                logger.info("Published %d outbox events (total=%d).", count, total_published)
        except Exception as exc:
            logger.error("Error during outbox publication pass: %s", exc, exc_info=True)
        finally:
            db.close()

        if once:
            break

        time.sleep(poll_interval)

    logger.info("Outbox Publisher stopped. Total published: %d.", total_published)
    return total_published


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PACT Outbox Publisher Background Worker")
    parser.add_argument("--once", action="store_true", help="Run a single pass and exit")
    parser.add_argument("--interval", type=float, default=2.0, help="Polling interval in seconds")
    parser.add_argument("--batch-size", type=int, default=50, help="Max events to publish per pass")
    args = parser.parse_args()

    count = run_outbox_publisher(
        poll_interval=args.interval,
        once=args.once,
        batch_size=args.batch_size,
    )
    sys.exit(0)
