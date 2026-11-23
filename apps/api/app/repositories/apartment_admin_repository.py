import uuid
from typing import Any

from sqlalchemy import case, distinct, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.clock import now_utc
from app.models.billing import Invoice
from app.models.commerce import BulkOrder, CommunityCartItem, ShoppingCycle
from app.models.delivery import Delivery, DeliveryHandover
from app.models.organization import Apartment, Building, Community, CommunityMembership
from app.models.system import AuditLog


class ApartmentAdminRepository:
    @staticmethod
    def get_community_overview(db: Session, community_id: uuid.UUID) -> dict[str, Any] | None:
        community = db.get(Community, community_id)
        if not community:
            return None

        total_buildings = db.scalar(
            select(func.count(Building.id)).where(Building.community_id == community_id)
        ) or 0

        total_apartments = db.scalar(
            select(func.count(Apartment.id)).where(Apartment.community_id == community_id)
        ) or 0

        total_households = db.scalar(
            select(func.count(distinct(CommunityMembership.user_id))).where(
                CommunityMembership.community_id == community_id,
                CommunityMembership.is_active.is_(True),
            )
        ) or 0

        return {
            "community_id": community.id,
            "name": community.name,
            "code": community.code,
            "address": community.address,
            "city": community.city,
            "postal_code": community.postal_code,
            "total_buildings": total_buildings,
            "total_apartments": total_apartments,
            "total_registered_households": total_households,
        }

    @staticmethod
    def get_dashboard_metrics(
        db: Session, community_id: uuid.UUID, current_cycle: ShoppingCycle | None
    ) -> dict[str, Any]:
        community = db.get(Community, community_id)
        comm_name = community.name if community else "Unknown Community"
        cycle_month = current_cycle.cycle_month if current_cycle else "CURRENT"

        # 1. Total registered households
        total_households = db.scalar(
            select(func.count(distinct(CommunityMembership.user_id))).where(
                CommunityMembership.community_id == community_id,
                CommunityMembership.is_active.is_(True),
            )
        ) or 0

        # 2. Participating households in current cycle
        participating_households = 0
        if current_cycle:
            participating_households = db.scalar(
                select(func.count(distinct(CommunityCartItem.user_id))).where(
                    CommunityCartItem.cycle_id == current_cycle.id
                )
            ) or 0

        # 3. Financials from invoices of current cycle (or latest bulk order)
        inv_query = select(
            func.coalesce(func.sum(Invoice.total_amount_paise), 0).label("total_billed"),
            func.coalesce(func.sum(Invoice.paid_amount_paise), 0).label("total_collected"),
        ).where(Invoice.community_id == community_id)

        if current_cycle:
            inv_query = inv_query.join(BulkOrder, Invoice.bulk_order_id == BulkOrder.id).where(
                BulkOrder.cycle_id == current_cycle.id
            )

        inv_res = db.execute(inv_query).one()
        total_billed = inv_res.total_billed or 0
        total_collected = inv_res.total_collected or 0
        outstanding = max(0, total_billed - total_collected)
        pct = round((total_collected / total_billed) * 100.0, 2) if total_billed > 0 else 0.0

        # 4. Delivery Handovers
        del_stmt = (
            select(
                func.sum(case((DeliveryHandover.status == "pending", 1), else_=0)).label(
                    "pending"
                ),
                func.sum(case((DeliveryHandover.status == "handed_over", 1), else_=0)).label(
                    "completed"
                ),
            )
            .join(Delivery, DeliveryHandover.delivery_id == Delivery.id)
            .where(Delivery.community_id == community_id)
        )
        del_res = db.execute(del_stmt).one()
        deliveries_pending = del_res.pending or 0
        deliveries_completed = del_res.completed or 0

        return {
            "community_id": community_id,
            "community_name": comm_name,
            "cycle_month": cycle_month,
            "total_households": total_households,
            "participating_households": participating_households,
            "total_billing_amount_paise": total_billed,
            "amount_collected_paise": total_collected,
            "outstanding_amount_paise": outstanding,
            "collection_percentage": pct,
            "deliveries_pending": deliveries_pending,
            "deliveries_completed": deliveries_completed,
        }

    @staticmethod
    def get_resident_invoices(
        db: Session,
        community_id: uuid.UUID,
        cycle_id: uuid.UUID | None = None,
        status_filter: str | None = None,
    ) -> list[Invoice]:
        stmt = (
            select(Invoice)
            .options(
                selectinload(Invoice.user).selectinload(
                    CommunityMembership.__table__.columns.user_id
                )
                if False
                else selectinload(Invoice.user),
            )
            .where(Invoice.community_id == community_id)
        )
        if cycle_id:
            stmt = stmt.join(BulkOrder, Invoice.bulk_order_id == BulkOrder.id).where(
                BulkOrder.cycle_id == cycle_id
            )

        if status_filter:
            if status_filter.lower() == "paid":
                stmt = stmt.where(Invoice.status == "paid")
            elif status_filter.lower() in ("unpaid", "pending"):
                stmt = stmt.where(Invoice.status.in_(["pending", "unlocked", "partially_paid"]))

        stmt = stmt.order_by(Invoice.created_at.desc())
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_last_reminder_time(db: Session, recipient_user_id: uuid.UUID) -> Any | None:
        stmt = (
            select(AuditLog.created_at)
            .where(
                AuditLog.action == "PAYMENT_REMINDER_SENT",
                AuditLog.entity_id == str(recipient_user_id),
            )
            .order_by(AuditLog.created_at.desc())
        )
        return db.scalar(stmt)

    @staticmethod
    def ensure_delivery_records_for_order(
        db: Session, bulk_order: BulkOrder
    ) -> Delivery:
        """
        Creates Delivery and DeliveryHandover records for a billed/dispatched bulk order
        if not already present.
        """
        existing_del = (
            select(Delivery)
            .options(
                selectinload(Delivery.handovers).selectinload(DeliveryHandover.recipient),
                selectinload(Delivery.handovers).selectinload(DeliveryHandover.invoice),
                selectinload(Delivery.handovers).selectinload(DeliveryHandover.handed_over_by),
            )
            .where(Delivery.bulk_order_id == bulk_order.id)
        )
        deliv = db.scalars(existing_del).first()
        if deliv:
            return deliv

        # Create new Delivery record
        deliv = Delivery(
            bulk_order_id=bulk_order.id,
            community_id=bulk_order.community_id,
            status="scheduled" if bulk_order.status.upper() != "DISPATCHED" else "in_transit",
            dispatched_at=bulk_order.dispatched_at or now_utc(),
        )
        db.add(deliv)
        db.flush()

        # Create a DeliveryHandover for each resident invoice
        invoices = (
            select(Invoice)
            .where(Invoice.bulk_order_id == bulk_order.id)
        )
        inv_list = db.scalars(invoices).all()
        for inv in inv_list:
            handover = DeliveryHandover(
                delivery_id=deliv.id,
                invoice_id=inv.id,
                recipient_user_id=inv.user_id,
                status="pending",
            )
            db.add(handover)

        db.commit()
        db.refresh(deliv)
        return deliv
