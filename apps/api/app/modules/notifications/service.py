import logging
import uuid
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.clock import now_utc
from app.core.errors import NotFoundError
from app.models.billing import Invoice
from app.models.system import Notification, NotificationPreference
from app.schemas.notification import (
    NotificationItem,
    NotificationListResponse,
    NotificationPreferenceItem,
)

logger = logging.getLogger("pact.notifications.service")

DEFAULT_CHANNELS = ["in_app", "sms", "whatsapp"]


class NotificationService:
    @staticmethod
    def get_user_notifications(
        db: Session,
        user_id: uuid.UUID,
        unread_only: bool = False,
        page: int = 1,
        limit: int = 20,
    ) -> NotificationListResponse:
        """Fetch paginated notifications for a specific resident."""
        page = max(1, page)
        limit = max(1, min(100, limit))
        offset = (page - 1) * limit

        base_filter = [Notification.user_id == user_id]
        if unread_only:
            base_filter.append(Notification.is_read.is_(False))

        # Total matching filter
        total = db.scalar(
            select(func.count(Notification.id)).where(*base_filter)
        ) or 0

        # Unread count (total unread across all user's notifications)
        unread_count = db.scalar(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
        ) or 0

        # Paginated items
        items_db = list(
            db.scalars(
                select(Notification)
                .where(*base_filter)
                .order_by(Notification.created_at.desc())
                .offset(offset)
                .limit(limit)
            ).all()
        )

        return NotificationListResponse(
            items=[NotificationItem.model_validate(n) for n in items_db],
            total=total,
            unread_count=unread_count,
            page=page,
            limit=limit,
        )

    @staticmethod
    def get_unread_count(db: Session, user_id: uuid.UUID) -> int:
        """Returns the number of unread in-app notifications for the user."""
        return db.scalar(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
        ) or 0

    @staticmethod
    def mark_as_read(db: Session, user_id: uuid.UUID, notification_id: uuid.UUID) -> NotificationItem:
        """Marks a single notification as read."""
        item = db.scalars(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        ).first()

        if not item:
            raise NotFoundError(f"Notification {notification_id} not found.")

        if not item.is_read:
            item.is_read = True
            item.read_at = now_utc()
            db.commit()
            db.refresh(item)

        return NotificationItem.model_validate(item)

    @staticmethod
    def mark_all_read(
        db: Session,
        user_id: uuid.UUID,
        notification_ids: list[uuid.UUID] | None = None,
    ) -> int:
        """Marks all unread notifications for a user as read."""
        stmt = (
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
            .values(is_read=True, read_at=now_utc())
        )
        if notification_ids:
            stmt = stmt.where(Notification.id.in_(notification_ids))

        result = db.execute(stmt)
        db.commit()
        return result.rowcount

    @staticmethod
    def create_notification(
        db: Session,
        user_id: uuid.UUID,
        title: str,
        message: str,
        kind: str = "general",
    ) -> Notification:
        """Creates and stores a single in-app notification."""
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            kind=kind,
            is_read=False,
            created_at=now_utc(),
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif

    @staticmethod
    def get_preferences(db: Session, user_id: uuid.UUID) -> list[NotificationPreferenceItem]:
        """Fetches channel preferences for a user, filling in defaults if unconfigured."""
        prefs = list(
            db.scalars(
                select(NotificationPreference).where(
                    NotificationPreference.user_id == user_id
                )
            ).all()
        )

        existing_channels = {p.channel: p.enabled for p in prefs}
        result: list[NotificationPreferenceItem] = []
        for ch in DEFAULT_CHANNELS:
            enabled = existing_channels.get(ch, True)
            result.append(NotificationPreferenceItem(channel=ch, enabled=enabled))
        return result

    @staticmethod
    def update_preferences(
        db: Session,
        user_id: uuid.UUID,
        preferences: list[NotificationPreferenceItem],
    ) -> list[NotificationPreferenceItem]:
        """Updates channel preferences for a user."""
        for item in preferences:
            existing = db.scalars(
                select(NotificationPreference).where(
                    NotificationPreference.user_id == user_id,
                    NotificationPreference.channel == item.channel,
                )
            ).first()

            if existing:
                existing.enabled = item.enabled
            else:
                new_pref = NotificationPreference(
                    user_id=user_id,
                    channel=item.channel,
                    enabled=item.enabled,
                )
                db.add(new_pref)

        db.commit()
        return NotificationService.get_preferences(db=db, user_id=user_id)

    @staticmethod
    def handle_domain_event(db: Session, event_type: str, payload: dict[str, Any]) -> int:
        """
        Creates in-app notifications reacting to transactional domain events.
        Guarantees tenant/user isolation.
        """
        created_count = 0
        try:
            if event_type == "BILL_FINALISED":
                invoice_ids = payload.get("invoice_ids", [])
                bulk_order_id = payload.get("bulk_order_id")

                # If invoice_ids is provided, notify those residents
                invoices: list[Invoice] = []
                if invoice_ids:
                    invoices = list(
                        db.scalars(
                            select(Invoice).where(Invoice.id.in_([uuid.UUID(str(i)) for i in invoice_ids]))
                        ).all()
                    )
                elif bulk_order_id:
                    invoices = list(
                        db.scalars(
                            select(Invoice).where(Invoice.bulk_order_id == uuid.UUID(str(bulk_order_id)))
                        ).all()
                    )

                for inv in invoices:
                    amt_rupees = inv.total_amount_paise / 100.0
                    notif = Notification(
                        user_id=inv.user_id,
                        title="Monthly Grocery Bill Ready",
                        message=f"Your bill of ₹{amt_rupees:.2f} for order #{inv.invoice_number} is ready. Please complete payment before delivery cutoff.",
                        kind="bill_ready",
                        is_read=False,
                        created_at=now_utc(),
                    )
                    db.add(notif)
                    created_count += 1

            elif event_type == "PAYMENT_RECEIVED":
                user_id_str = payload.get("user_id")
                if not user_id_str and payload.get("invoice_id"):
                    inv = db.get(Invoice, uuid.UUID(str(payload.get("invoice_id"))))
                    if inv:
                        user_id_str = str(inv.user_id)

                if user_id_str:
                    amt = payload.get("amount_paise", 0) / 100.0
                    tx_id = payload.get("transaction_id", "")
                    notif = Notification(
                        user_id=uuid.UUID(user_id_str),
                        title="Payment Received",
                        message=f"Payment of ₹{amt:.2f} received successfully (TX: {tx_id}). Thank you!",
                        kind="payment_update",
                        is_read=False,
                        created_at=now_utc(),
                    )
                    db.add(notif)
                    created_count += 1

            elif event_type in ("DELIVERY_READY", "DELIVERY_DISPATCHED"):
                bulk_order_id = payload.get("bulk_order_id")
                if bulk_order_id:
                    invoices = list(
                        db.scalars(
                            select(Invoice).where(Invoice.bulk_order_id == uuid.UUID(str(bulk_order_id)))
                        ).all()
                    )
                    for inv in invoices:
                        notif = Notification(
                            user_id=inv.user_id,
                            title="Order Out for Delivery",
                            message="Your consolidated community grocery order has been dispatched from the retailer!",
                            kind="delivery_update",
                            is_read=False,
                            created_at=now_utc(),
                        )
                        db.add(notif)
                        created_count += 1

            elif event_type == "DELIVERY_COMPLETED":
                bulk_order_id = payload.get("bulk_order_id")
                if bulk_order_id:
                    invoices = list(
                        db.scalars(
                            select(Invoice).where(Invoice.bulk_order_id == uuid.UUID(str(bulk_order_id)))
                        ).all()
                    )
                    for inv in invoices:
                        notif = Notification(
                            user_id=inv.user_id,
                            title="Groceries Delivered",
                            message="Your community delivery has arrived at your apartment building. Please collect from the designated area.",
                            kind="delivery_update",
                            is_read=False,
                            created_at=now_utc(),
                        )
                        db.add(notif)
                        created_count += 1

            elif event_type == "REFUND_PROCESSED":
                user_id_str = payload.get("user_id")
                if not user_id_str and payload.get("invoice_id"):
                    inv = db.get(Invoice, uuid.UUID(str(payload.get("invoice_id"))))
                    if inv:
                        user_id_str = str(inv.user_id)

                if user_id_str:
                    amt = payload.get("amount_paise", 0) / 100.0
                    notif = Notification(
                        user_id=uuid.UUID(user_id_str),
                        title="Refund Processed",
                        message=f"A refund of ₹{amt:.2f} has been processed for your invoice.",
                        kind="payment_update",
                        is_read=False,
                        created_at=now_utc(),
                    )
                    db.add(notif)
                    created_count += 1

            if created_count > 0:
                db.commit()
                logger.info("Created %d notifications for event %s", created_count, event_type)

        except Exception as exc:
            db.rollback()
            logger.error("Error handling domain event %s in notifications: %s", event_type, exc)

        return created_count
