"""
Background worker utilities for cleaning up stale OTPs and expired sessions.
"""

import logging

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.clock import now_utc
from app.models.identity import OtpVerification, UserSession

logger = logging.getLogger("pact.workers.cleanup")


def cleanup_stale_otps(db: Session) -> int:
    """Delete OTP verifications that have expired or are older than 24 hours."""
    cutoff = now_utc()
    stmt = delete(OtpVerification).where(OtpVerification.expires_at < cutoff)
    result = db.execute(stmt)
    db.commit()
    deleted_count = result.rowcount
    if deleted_count > 0:
        logger.info("Purged %d expired OTP verifications", deleted_count)
    return deleted_count


def cleanup_expired_sessions(db: Session) -> int:
    """Delete sessions that are revoked or expired past 30 days."""
    cutoff = now_utc()
    stmt = delete(UserSession).where(
        (UserSession.expires_at < cutoff) | (UserSession.is_revoked.is_(True))
    )
    result = db.execute(stmt)
    db.commit()
    deleted_count = result.rowcount
    if deleted_count > 0:
        logger.info("Purged %d expired/revoked user sessions", deleted_count)
    return deleted_count
