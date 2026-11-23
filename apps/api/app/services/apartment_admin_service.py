import uuid

from sqlalchemy import distinct, func, select
from sqlalchemy.orm import Session

from app.core.clock import now_utc
from app.core.errors import ForbiddenError, NotFoundError
from app.models.billing import Invoice
from app.models.commerce import BulkOrder
from app.models.delivery import Delivery, DeliveryHandover
from app.models.identity import User
from app.models.organization import Apartment, CommunityMembership
from app.modules.admin.notifications.adapters import reminder_dispatcher
from app.repositories.apartment_admin_repository import ApartmentAdminRepository
from app.repositories.cycle_repository import CycleRepository
from app.repositories.retailer_order_repository import RetailerOrderRepository
from app.schemas.apartment_admin import (
    AdminCycleOverview,
    AdminDashboardMetrics,
    CommunityOverviewResponse,
    ConfirmHandoverRequest,
    ConfirmHandoverResponse,
    DeliveryHandoverItem,
    DeliveryStatusResponse,
    ResidentCollectionItem,
    ResidentCollectionResponse,
    TriggerReminderRequest,
    TriggerReminderResponse,
)


class ApartmentAdminService:
    @staticmethod
    def resolve_community_id(
        current_user: User, explicit_community_id: uuid.UUID | None = None
    ) -> uuid.UUID:
        """
        Enforce strict multi-tenant community boundary for apartment administrators.
        Platform admins can manage any community.
        Apartment admins can only manage their assigned community.
        """
        user_role = current_user.role.name if current_user.role else ""
        if user_role == "platform_admin":
            if explicit_community_id:
                return explicit_community_id
            active_m = [m for m in (current_user.memberships or []) if m.is_active and m.community_id]
            if active_m:
                return active_m[0].community_id
            raise ForbiddenError(
                "Community ID parameter required for platform admin.",
                code="COMMUNITY_ID_REQUIRED",
            )

        active_memberships = [
            m for m in (current_user.memberships or []) if m.is_active and m.community_id
        ]
        if not active_memberships:
            raise ForbiddenError(
                "You are not assigned as an administrator to any community.",
                code="COMMUNITY_ACCESS_DENIED",
            )

        user_comm_ids = {m.community_id for m in active_memberships}
        if explicit_community_id:
            if explicit_community_id not in user_comm_ids:
                raise ForbiddenError(
                    "Cross-community access denied. You do not manage this community.",
                    code="COMMUNITY_ACCESS_DENIED",
                )
            return explicit_community_id

        return active_memberships[0].community_id

    @classmethod
    def get_community_overview(
        cls,
        db: Session,
        current_user: User,
        community_id: uuid.UUID | None = None,
    ) -> CommunityOverviewResponse:
        comm_id = cls.resolve_community_id(current_user, community_id)
        data = ApartmentAdminRepository.get_community_overview(db, comm_id)
        if not data:
            raise NotFoundError(f"Community {comm_id} not found.")
        return CommunityOverviewResponse(**data)

    @classmethod
    def get_dashboard_metrics(
        cls,
        db: Session,
        current_user: User,
        community_id: uuid.UUID | None = None,
    ) -> AdminDashboardMetrics:
        comm_id = cls.resolve_community_id(current_user, community_id)
        cycle = CycleRepository.get_or_create_current_cycle(db, comm_id)
        metrics = ApartmentAdminRepository.get_dashboard_metrics(db, comm_id, cycle)
        return AdminDashboardMetrics(**metrics)

    @classmethod
    def get_current_cycle(
        cls,
        db: Session,
        current_user: User,
        community_id: uuid.UUID | None = None,
    ) -> AdminCycleOverview:
        comm_id = cls.resolve_community_id(current_user, community_id)
        cycle = CycleRepository.get_or_create_current_cycle(db, comm_id)

        stats = CycleRepository.get_community_cycle_stats(db, cycle.id)
        h_count = stats.get("participating_households_count", 0)
        req_units = stats.get("total_units_count", 0)
        est_amount = stats.get("estimated_total_paise", 0)

        # Check if bulk order exists to get packed units
        bo_stmt = select(BulkOrder).where(BulkOrder.cycle_id == cycle.id)
        bo = db.scalars(bo_stmt).first()
        packed_units = bo.total_packed_items if bo else 0
        actual_order_amount = bo.total_paise if bo else est_amount
        if bo and req_units == 0:
            req_units = bo.total_requested_items
        if bo and h_count == 0:
            inv_count = db.scalar(
                select(func.count(distinct(Invoice.user_id))).where(Invoice.bulk_order_id == bo.id)
            ) or 0
            if inv_count > 0:
                h_count = inv_count

        seconds_left = max(0, int((cycle.cutoff_at - now_utc()).total_seconds()))
        is_passed = now_utc() >= cycle.cutoff_at

        return AdminCycleOverview(
            cycle_id=cycle.id,
            cycle_month=cycle.cycle_month,
            cutoff_at=cycle.cutoff_at,
            status=cycle.status,
            seconds_until_cutoff=seconds_left,
            is_cutoff_passed=is_passed,
            total_requested_units=req_units,
            total_packed_units=packed_units,
            total_order_amount_paise=actual_order_amount,
            participating_households_count=h_count,
        )

    @classmethod
    def get_resident_collections(
        cls,
        db: Session,
        current_user: User,
        community_id: uuid.UUID | None = None,
        status_filter: str | None = None,
    ) -> ResidentCollectionResponse:
        comm_id = cls.resolve_community_id(current_user, community_id)
        cycle = CycleRepository.get_or_create_current_cycle(db, comm_id)

        invoices = ApartmentAdminRepository.get_resident_invoices(
            db=db,
            community_id=comm_id,
            cycle_id=cycle.id,
            status_filter=status_filter,
        )

        items: list[ResidentCollectionItem] = []
        total_billed = 0
        total_collected = 0

        for inv in invoices:
            total_billed += inv.total_amount_paise
            total_collected += inv.paid_amount_paise
            outstanding = max(0, inv.total_amount_paise - inv.paid_amount_paise)

            user = inv.user
            # Find apartment unit if linked
            apt_stmt = (
                select(Apartment.unit_number)
                .join(CommunityMembership, Apartment.id == CommunityMembership.apartment_id)
                .where(
                    CommunityMembership.user_id == user.id,
                    CommunityMembership.community_id == comm_id,
                )
            )
            unit_no = db.scalar(apt_stmt)

            last_rem = ApartmentAdminRepository.get_last_reminder_time(db, user.id)

            items.append(
                ResidentCollectionItem(
                    invoice_id=inv.id,
                    invoice_number=inv.invoice_number,
                    user_id=user.id,
                    resident_name=user.full_name or "Resident",
                    phone=user.phone,
                    apartment_unit=unit_no,
                    total_amount_paise=inv.total_amount_paise,
                    paid_amount_paise=inv.paid_amount_paise,
                    outstanding_amount_paise=outstanding,
                    status=inv.status,
                    last_reminder_at=last_rem,
                )
            )

        total_outstanding = max(0, total_billed - total_collected)
        return ResidentCollectionResponse(
            items=items,
            total_invoices=len(items),
            total_billed_paise=total_billed,
            total_collected_paise=total_collected,
            total_outstanding_paise=total_outstanding,
        )

    @classmethod
    def trigger_payment_reminder(
        cls,
        db: Session,
        invoice_id: uuid.UUID,
        payload: TriggerReminderRequest,
        current_user: User,
    ) -> TriggerReminderResponse:
        inv = db.get(Invoice, invoice_id)
        if not inv:
            raise NotFoundError(f"Invoice {invoice_id} not found.")

        # Security check: admin must manage this invoice's community
        comm_id = cls.resolve_community_id(current_user, inv.community_id)
        if inv.community_id != comm_id:
            raise ForbiddenError(
                "You cannot trigger reminders for invoices in another community.",
                code="COMMUNITY_ACCESS_DENIED",
            )

        recipient = inv.user
        if not recipient:
            raise NotFoundError("Recipient user for invoice not found.")

        # Rate Limiting: 1 reminder per hour per intended recipient
        reminder_dispatcher.check_rate_limit(
            db=db,
            recipient_user_id=recipient.id,
            invoice_id=inv.id,
            rate_limit_minutes=60,
        )

        outstanding_rupees = max(0, inv.total_amount_paise - inv.paid_amount_paise) / 100.0
        title = "Payment Reminder: Collective Monthly Order"
        default_msg = (
            f"Dear {recipient.full_name or 'Resident'}, your PACT community invoice "
            f"#{inv.invoice_number} has an outstanding balance of ₹{outstanding_rupees:.2f}. "
            f"Please complete payment to confirm your order."
        )
        msg_text = payload.custom_message or default_msg

        # Dispatch via multi-channel adapters
        reports = reminder_dispatcher.dispatch(
            db=db,
            user=recipient,
            title=title,
            message=msg_text,
            channels=payload.channels,
        )

        confirmed_channels = [r.channel for r in reports if r.status == "sent"]
        failed_channels = [r.channel for r in reports if r.status in ("failed", "unconfigured")]

        # Log audit entry recording the reminder attempt
        RetailerOrderRepository.log_audit(
            db=db,
            action="PAYMENT_REMINDER_SENT",
            entity_type="Invoice",
            entity_id=recipient.id,  # recipient ID for rate limiting lookup
            user_id=current_user.id,
            payload_after={
                "invoice_id": str(inv.id),
                "confirmed_channels": confirmed_channels,
                "failed_channels": failed_channels,
                "reports": [r.model_dump() for r in reports],
            },
        )

        db.commit()

        summary_msg = f"Reminder sent via {len(confirmed_channels)} confirmed channel(s)."
        if failed_channels:
            summary_msg += f" {len(failed_channels)} channel(s) unconfirmed or unconfigured."

        return TriggerReminderResponse(
            invoice_id=inv.id,
            recipient_user_id=recipient.id,
            recipient_name=recipient.full_name or "Resident",
            channels_attempted=payload.channels,
            channels_confirmed=confirmed_channels,
            channels_failed=failed_channels,
            details=reports,
            message=summary_msg,
        )

    @classmethod
    def get_delivery_status(
        cls,
        db: Session,
        current_user: User,
        community_id: uuid.UUID | None = None,
    ) -> DeliveryStatusResponse:
        comm_id = cls.resolve_community_id(current_user, community_id)

        # Find latest bulk order for community
        bo_stmt = (
            select(BulkOrder)
            .where(BulkOrder.community_id == comm_id)
            .order_by(BulkOrder.placed_at.desc())
        )
        bo = db.scalars(bo_stmt).first()
        if not bo:
            raise NotFoundError("No bulk orders found for this community.")

        # Ensure Delivery and DeliveryHandover records exist
        delivery = ApartmentAdminRepository.ensure_delivery_records_for_order(db, bo)

        handover_items: list[DeliveryHandoverItem] = []
        pending_count = 0
        completed_count = 0

        for h in sorted(delivery.handovers, key=lambda x: x.status):
            if h.status == "handed_over":
                completed_count += 1
            else:
                pending_count += 1

            recipient = h.recipient
            by_user = h.handed_over_by
            inv = h.invoice

            handover_items.append(
                DeliveryHandoverItem(
                    handover_id=h.id,
                    delivery_id=delivery.id,
                    invoice_id=inv.id if inv else uuid.UUID(int=0),
                    invoice_number=inv.invoice_number if inv else "N/A",
                    recipient_user_id=recipient.id if recipient else uuid.UUID(int=0),
                    recipient_name=recipient.full_name or "Resident" if recipient else "Unknown",
                    phone=recipient.phone if recipient else "",
                    status=h.status,
                    handover_timestamp=h.handover_timestamp,
                    handed_over_by_id=by_user.id if by_user else None,
                    handed_over_by_name=by_user.full_name if by_user else None,
                    notes=h.notes,
                )
            )

        return DeliveryStatusResponse(
            delivery_id=delivery.id,
            bulk_order_id=bo.id,
            order_number=bo.order_number,
            status=delivery.status,
            dispatched_at=delivery.dispatched_at,
            arrived_at_gate=delivery.arrived_at_gate,
            completed_at=delivery.completed_at,
            total_handovers=len(handover_items),
            pending_handovers=pending_count,
            completed_handovers=completed_count,
            handovers=handover_items,
        )

    @classmethod
    def confirm_handover(
        cls,
        db: Session,
        handover_id: uuid.UUID,
        payload: ConfirmHandoverRequest,
        current_user: User,
    ) -> ConfirmHandoverResponse:
        stmt = (
            select(DeliveryHandover)
            .join(Delivery, DeliveryHandover.delivery_id == Delivery.id)
            .where(DeliveryHandover.id == handover_id)
            .with_for_update()
        )
        handover = db.scalars(stmt).first()
        if not handover:
            raise NotFoundError(f"Delivery handover record {handover_id} not found.")

        # Community tenant boundary
        comm_id = cls.resolve_community_id(current_user, handover.delivery.community_id)
        if handover.delivery.community_id != comm_id:
            raise ForbiddenError(
                "Cross-community handover confirmation denied.",
                code="COMMUNITY_ACCESS_DENIED",
            )

        if handover.status == "handed_over":
            return ConfirmHandoverResponse(
                handover_id=handover.id,
                status="handed_over",
                handover_timestamp=handover.handover_timestamp or now_utc(),
                handed_over_by_id=handover.handed_over_by_user_id or current_user.id,
                message="Handover already confirmed.",
            )

        handover.status = "handed_over"
        handover.handover_timestamp = now_utc()
        handover.handed_over_by_user_id = current_user.id
        handover.notes = payload.notes

        # Check if all handovers in this delivery are complete
        all_handovers = handover.delivery.handovers
        if all(h.status == "handed_over" for h in all_handovers):
            handover.delivery.status = "delivered"
            handover.delivery.completed_at = now_utc()

        RetailerOrderRepository.log_audit(
            db=db,
            action="DELIVERY_HANDOVER_CONFIRMED",
            entity_type="DeliveryHandover",
            entity_id=handover.id,
            user_id=current_user.id,
            payload_after={
                "status": "handed_over",
                "handover_timestamp": handover.handover_timestamp.isoformat(),
                "notes": payload.notes,
            },
        )

        db.commit()
        db.refresh(handover)

        return ConfirmHandoverResponse(
            handover_id=handover.id,
            status="handed_over",
            handover_timestamp=handover.handover_timestamp,
            handed_over_by_id=current_user.id,
            message="Doorstep delivery handover confirmed successfully.",
        )
