"""
Cycle Evaluator Background Worker.
Periodically evaluates active shopping cycles in Asia/Kolkata timezone against
their cutoff configuration (default 22nd at 17:27 IST).
Automatically transitions expired OPEN cycles to LOCKED and emits ORDER_CYCLE_LOCKED outbox events.
"""

import argparse
import logging
import signal
import sys
import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.clock import now_utc
from app.core.config import settings
from app.core.db import SessionLocal
from app.models.commerce import ShoppingCycle
from app.modules.events.outbox import OutboxService

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] [cycle_evaluator] %(message)s",
)
logger = logging.getLogger("pact.workers.cycle_evaluator")

_stop_requested = False


def _signal_handler(signum, frame):
    global _stop_requested
    logger.info("Signal %d received, requesting cycle evaluator shutdown...", signum)
    _stop_requested = True


def evaluate_cycles(db: Session) -> int:
    """
    Evaluates all OPEN shopping cycles against current UTC / Asia/Kolkata time.
    Locks any cycles whose cutoff has passed and records ORDER_CYCLE_LOCKED outbox events.
    Returns the count of newly locked cycles.
    """
    current_time = now_utc()
    stmt = (
        select(ShoppingCycle)
        .where(
            ShoppingCycle.status == "OPEN",
            ShoppingCycle.cutoff_at <= current_time,
        )
    )
    cycles_to_lock = list(db.scalars(stmt).all())
    locked_count = 0

    for cycle in cycles_to_lock:
        cycle.status = "LOCKED"
        locked_count += 1

        OutboxService.record_event(
            db=db,
            event_type="ORDER_CYCLE_LOCKED",
            topic="pact.events",
            payload={
                "cycle_id": str(cycle.id),
                "community_id": str(cycle.community_id),
                "cycle_month": cycle.cycle_month,
                "cutoff_at": cycle.cutoff_at.isoformat(),
                "locked_at": current_time.isoformat(),
            },
        )
        logger.info(
            "Cycle %s for community %s locked (cutoff: %s).",
            cycle.id,
            cycle.community_id,
            cycle.cutoff_at.isoformat(),
        )

    if locked_count > 0:
        db.commit()

    return locked_count


def run_cycle_evaluator(
    poll_interval: float = 30.0,
    once: bool = False,
) -> int:
    """
    Runs cycle evaluator in a daemon loop or single pass.
    """
    signal.signal(signal.SIGINT, _signal_handler)
    signal.signal(signal.SIGTERM, _signal_handler)

    logger.info("Starting Cycle Evaluator (once=%s, interval=%.1fs)...", once, poll_interval)
    total_locked = 0

    while not _stop_requested:
        db: Session = SessionLocal()
        try:
            count = evaluate_cycles(db)
            total_locked += count
        except Exception as exc:
            db.rollback()
            logger.error("Cycle evaluator exception: %s", exc, exc_info=True)
        finally:
            db.close()

        if once:
            break

        time.sleep(poll_interval)

    logger.info("Cycle Evaluator stopped. Total cycles locked: %d.", total_locked)
    return total_locked


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PACT Cycle Evaluator Worker")
    parser.add_argument("--once", action="store_true", help="Run evaluation once and exit")
    parser.add_argument("--interval", type=float, default=30.0, help="Polling interval in seconds")
    args = parser.parse_args()

    count = run_cycle_evaluator(poll_interval=args.interval, once=args.once)
    sys.exit(0)
