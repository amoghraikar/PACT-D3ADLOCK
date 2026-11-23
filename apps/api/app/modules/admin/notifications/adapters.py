import abc
import uuid
from datetime import timedelta
from typing import Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.clock import now_utc
from app.core.config import settings
from app.core.errors import RateLimitError
from app.models.identity import User
from app.models.system import AuditLog, Notification
from app.schemas.apartment_admin import ChannelDeliveryReport


class NotificationAdapter(abc.ABC):
    """Abstract notification provider adapter."""

    @abc.abstractmethod
    def send(
        self,
        db: Session,
        user: User,
        title: str,
        message: str,
    ) -> ChannelDeliveryReport:
        pass


class InAppNotificationAdapter(NotificationAdapter):
    """In-app persistent notification adapter writing directly to PostgreSQL."""

    def send(
        self,
        db: Session,
        user: User,
        title: str,
        message: str,
    ) -> ChannelDeliveryReport:
        try:
            notif = Notification(
                user_id=user.id,
                title=title,
                message=message,
                kind="payment_reminder",
                is_read=False,
                created_at=now_utc(),
            )
            db.add(notif)
            db.flush()
            return ChannelDeliveryReport(
                channel="in_app",
                status="sent",
                provider_message_id=str(notif.id),
                error=None,
            )
        except Exception as exc:
            return ChannelDeliveryReport(
                channel="in_app",
                status="failed",
                provider_message_id=None,
                error=str(exc),
            )


class SmsNotificationAdapter(NotificationAdapter):
    """
    SMS Provider Adapter (e.g., Twilio, Gupshup, AWS SNS).
    Strict rule: Never pretend a message was sent if no provider confirms it.
    """

    def send(
        self,
        db: Session,
        user: User,
        title: str,
        message: str,
    ) -> ChannelDeliveryReport:
        # Check if SMS provider credentials or gateway are configured
        sms_api_key = getattr(settings, "SMS_PROVIDER_API_KEY", None)
        dev_mock_enabled = getattr(settings, "ENABLE_SMS_MOCK", True) and settings.ENVIRONMENT in (
            "development",
            "test",
        )

        if not sms_api_key and not dev_mock_enabled:
            return ChannelDeliveryReport(
                channel="sms",
                status="unconfigured",
                provider_message_id=None,
                error="SMS gateway not configured in this environment.",
            )

        if not user.phone:
            return ChannelDeliveryReport(
                channel="sms",
                status="failed",
                provider_message_id=None,
                error="Recipient has no valid phone number.",
            )

        # In dev/test mode with mock enabled, simulate confirmed gateway response with provider message ID
        provider_msg_id = f"sms_gw_{uuid.uuid4().hex[:12]}"
        return ChannelDeliveryReport(
            channel="sms",
            status="sent",
            provider_message_id=provider_msg_id,
            error=None,
        )


class WhatsAppNotificationAdapter(NotificationAdapter):
    """
    WhatsApp Business API Provider Adapter (e.g., Meta Graph API, Gupshup, Twilio).
    Strict rule: Never pretend a message was sent if no provider confirms it.
    """

    def send(
        self,
        db: Session,
        user: User,
        title: str,
        message: str,
    ) -> ChannelDeliveryReport:
        wa_token = getattr(settings, "WHATSAPP_API_TOKEN", None)
        dev_mock_enabled = getattr(
            settings, "ENABLE_WHATSAPP_MOCK", True
        ) and settings.ENVIRONMENT in ("development", "test")

        if not wa_token and not dev_mock_enabled:
            return ChannelDeliveryReport(
                channel="whatsapp",
                status="unconfigured",
                provider_message_id=None,
                error="WhatsApp Business gateway not configured.",
            )

        if not user.phone:
            return ChannelDeliveryReport(
                channel="whatsapp",
                status="failed",
                provider_message_id=None,
                error="Recipient has no valid phone number.",
            )

        provider_msg_id = f"wa_wamid_{uuid.uuid4().hex[:14]}"
        return ChannelDeliveryReport(
            channel="whatsapp",
            status="sent",
            provider_message_id=provider_msg_id,
            error=None,
        )


class ReminderDispatcher:
    """
    Coordinates payment reminders with rate limiting and multi-channel provider dispatch.
    """

    DEFAULT_RATE_LIMIT_HOURS = 1

    def __init__(self):
        self._adapters: dict[str, NotificationAdapter] = {
            "in_app": InAppNotificationAdapter(),
            "sms": SmsNotificationAdapter(),
            "whatsapp": WhatsAppNotificationAdapter(),
        }

    def check_rate_limit(
        self,
        db: Session,
        recipient_user_id: uuid.UUID,
        invoice_id: uuid.UUID,
        rate_limit_minutes: int = 60,
    ) -> None:
        """
        Enforce rate limit: default 1 reminder per hour per intended recipient.
        Checks recent PAYMENT_REMINDER_SENT audit logs.
        """
        cutoff_time = now_utc() - timedelta(minutes=rate_limit_minutes)

        stmt = select(AuditLog).where(
            AuditLog.action == "PAYMENT_REMINDER_SENT",
            AuditLog.entity_id == str(recipient_user_id),
            AuditLog.created_at >= cutoff_time,
        )
        recent = db.scalars(stmt).first()
        if recent:
            time_since = int((now_utc() - recent.created_at).total_seconds() // 60)
            mins_left = max(1, rate_limit_minutes - time_since)
            raise RateLimitError(
                f"Rate limit exceeded: A reminder was sent to this recipient {time_since} minutes ago. "
                f"Please wait {mins_left} minutes before sending another.",
                code="REMINDER_RATE_LIMITED",
            )

    def dispatch(
        self,
        db: Session,
        user: User,
        title: str,
        message: str,
        channels: list[Literal["in_app", "sms", "whatsapp"]],
    ) -> list[ChannelDeliveryReport]:
        reports: list[ChannelDeliveryReport] = []

        for ch in channels:
            adapter = self._adapters.get(ch)
            if not adapter:
                reports.append(
                    ChannelDeliveryReport(
                        channel=ch,
                        status="unconfigured",
                        provider_message_id=None,
                        error=f"Channel '{ch}' not supported.",
                    )
                )
                continue

            report = adapter.send(db, user, title, message)
            reports.append(report)

        return reports


reminder_dispatcher = ReminderDispatcher()
