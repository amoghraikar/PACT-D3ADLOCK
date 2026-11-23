import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.clock import now_business, now_utc
from app.core.config import settings
from app.models.catalogue import ProductVariant
from app.models.commerce import CommunityCartItem, ShoppingCycle


class CycleRepository:
    @staticmethod
    def calculate_cutoff_for_month(year: int, month: int) -> datetime:
        """
        Calculates cutoff datetime in Asia/Kolkata timezone and returns UTC datetime.
        Default: 22nd at 17:27 IST.
        """
        tz = ZoneInfo(settings.BUSINESS_TZ)
        cutoff_ist = datetime(
            year=year,
            month=month,
            day=settings.CYCLE_CUTOFF_DAY,
            hour=settings.CYCLE_CUTOFF_HOUR,
            minute=settings.CYCLE_CUTOFF_MINUTE,
            second=0,
            microsecond=0,
            tzinfo=tz,
        )
        return cutoff_ist.astimezone(ZoneInfo("UTC"))

    @classmethod
    def get_or_create_current_cycle(cls, db: Session, community_id: uuid.UUID) -> ShoppingCycle:
        """
        Retrieves or initializes the current shopping cycle for the community.
        Evaluates live Asia/Kolkata time against cutoff and auto-locks if cutoff passed.
        """
        biz_now = now_business()
        current_month_str = f"{biz_now.year:04d}-{biz_now.month:02d}"

        # Check existing cycle
        stmt = (
            select(ShoppingCycle)
            .options(joinedload(ShoppingCycle.community))
            .where(
                ShoppingCycle.community_id == community_id,
                ShoppingCycle.cycle_month == current_month_str,
            )
        )
        cycle = db.scalars(stmt).first()

        if not cycle:
            # Create new cycle for current month
            cutoff_utc = cls.calculate_cutoff_for_month(biz_now.year, biz_now.month)
            status = "LOCKED" if now_utc() >= cutoff_utc else "OPEN"

            cycle = ShoppingCycle(
                community_id=community_id,
                cycle_month=current_month_str,
                cutoff_at=cutoff_utc,
                status=status,
                created_at=now_utc(),
            )
            db.add(cycle)
            db.commit()
            db.refresh(cycle)

        # Evaluate cutoff expiration
        if cycle.status == "OPEN" and now_utc() >= cycle.cutoff_at:
            cycle.status = "LOCKED"
            db.commit()
            db.refresh(cycle)

        return cycle

    @staticmethod
    def get_cycle_by_id(db: Session, cycle_id: uuid.UUID) -> ShoppingCycle | None:
        stmt = (
            select(ShoppingCycle)
            .options(joinedload(ShoppingCycle.community))
            .where(ShoppingCycle.id == cycle_id)
        )
        cycle = db.scalars(stmt).first()
        if cycle and cycle.status == "OPEN" and now_utc() >= cycle.cutoff_at:
            cycle.status = "LOCKED"
            db.commit()
            db.refresh(cycle)
        return cycle

    @staticmethod
    def get_community_cycle_stats(db: Session, cycle_id: uuid.UUID) -> dict:
        """
        Calculates aggregated demand statistics across the entire community:
        - Total distinct variants
        - Total item units
        - Participating households count
        - Total estimated order value in paise
        """
        stmt = (
            select(
                func.count(func.distinct(CommunityCartItem.variant_id)).label("distinct_items"),
                func.coalesce(func.sum(CommunityCartItem.quantity), 0).label("total_units"),
                func.count(func.distinct(CommunityCartItem.user_id)).label("households"),
                func.coalesce(
                    func.sum(CommunityCartItem.quantity * ProductVariant.default_price_paise), 0
                ).label("estimated_total_paise"),
            )
            .join(ProductVariant, CommunityCartItem.variant_id == ProductVariant.id)
            .where(CommunityCartItem.cycle_id == cycle_id)
        )
        result = db.execute(stmt).first()
        if not result:
            return {
                "total_distinct_items": 0,
                "total_units_count": 0,
                "participating_households_count": 0,
                "estimated_total_paise": 0,
            }

        return {
            "total_distinct_items": result.distinct_items,
            "total_units_count": result.total_units,
            "participating_households_count": result.households,
            "estimated_total_paise": result.estimated_total_paise,
        }
