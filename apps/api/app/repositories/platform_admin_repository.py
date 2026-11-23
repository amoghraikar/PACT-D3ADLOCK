import uuid
from typing import Any

from sqlalchemy import case, distinct, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.clock import now_utc
from app.core.config import settings
from app.models.billing import Invoice
from app.models.commerce import BulkOrder
from app.models.identity import Role, User
from app.models.organization import (
    Apartment,
    Community,
    CommunityMembership,
    Retailer,
    RetailerCommunity,
)
from app.models.system import AuditLog


class PlatformAdminRepository:
    @staticmethod
    def get_all_communities(db: Session) -> list[dict[str, Any]]:
        stmt = (
            select(
                Community,
                func.count(distinct(CommunityMembership.user_id)).label("total_members"),
                func.count(distinct(Apartment.id)).label("total_apartments"),
            )
            .outerjoin(CommunityMembership, Community.id == CommunityMembership.community_id)
            .outerjoin(Apartment, Community.id == Apartment.community_id)
            .group_by(Community.id)
            .order_by(Community.created_at.desc())
        )
        results = []
        for comm, total_m, total_a in db.execute(stmt).all():
            results.append(
                {
                    "id": comm.id,
                    "name": comm.name,
                    "code": comm.code,
                    "address": comm.address,
                    "city": comm.city,
                    "postal_code": comm.postal_code,
                    "is_active": comm.is_active,
                    "total_members": total_m or 0,
                    "total_apartments": total_a or 0,
                    "created_at": comm.created_at,
                }
            )
        return results

    @staticmethod
    def create_community(
        db: Session,
        name: str,
        code: str,
        address: str,
        city: str,
        postal_code: str,
    ) -> Community:
        comm = Community(
            name=name,
            code=code.upper(),
            address=address,
            city=city,
            postal_code=postal_code,
            is_active=True,
            created_at=now_utc(),
        )
        db.add(comm)
        db.commit()
        db.refresh(comm)
        return comm

    @staticmethod
    def get_all_retailers(db: Session) -> list[dict[str, Any]]:
        stmt = (
            select(
                Retailer,
                func.count(distinct(RetailerCommunity.community_id)).label("comm_count"),
            )
            .outerjoin(
                RetailerCommunity,
                (Retailer.id == RetailerCommunity.retailer_id)
                & (RetailerCommunity.is_active.is_(True)),
            )
            .group_by(Retailer.id)
            .order_by(Retailer.created_at.desc())
        )
        results = []
        for ret, comm_count in db.execute(stmt).all():
            results.append(
                {
                    "id": ret.id,
                    "user_id": ret.user_id,
                    "store_name": ret.store_name,
                    "business_address": ret.business_address,
                    "gstin": ret.gstin,
                    "phone": ret.phone,
                    "status": ret.status,
                    "associated_communities_count": comm_count or 0,
                }
            )
        return results

    @staticmethod
    def create_retailer(
        db: Session,
        phone: str,
        full_name: str,
        store_name: str,
        business_address: str,
        gstin: str | None = None,
    ) -> Retailer:
        # 1. Resolve retailer role
        ret_role = db.scalars(select(Role).where(Role.name == "retailer")).first()
        if not ret_role:
            ret_role = Role(name="retailer", description="Retailer merchant")
            db.add(ret_role)
            db.flush()

        # 2. Find or create user
        user = db.scalars(select(User).where(User.phone == phone)).first()
        if not user:
            user = User(
                phone=phone,
                full_name=full_name,
                role_id=ret_role.id,
                is_active=True,
                created_at=now_utc(),
            )
            db.add(user)
            db.flush()
        else:
            user.role_id = ret_role.id

        # 3. Create retailer entity
        retailer = Retailer(
            user_id=user.id,
            store_name=store_name,
            business_address=business_address,
            phone=phone,
            gstin=gstin,
            status="active",
            created_at=now_utc(),
        )
        db.add(retailer)
        db.commit()
        db.refresh(retailer)
        return retailer

    @staticmethod
    def map_retailer_to_community(
        db: Session,
        retailer_id: uuid.UUID,
        community_id: uuid.UUID,
        delivery_fee_paise: int = 0,
        is_primary: bool = True,
        is_active: bool = True,
    ) -> RetailerCommunity:
        stmt = select(RetailerCommunity).where(
            RetailerCommunity.retailer_id == retailer_id,
            RetailerCommunity.community_id == community_id,
        )
        mapping = db.scalars(stmt).first()
        if mapping:
            mapping.delivery_fee_paise = delivery_fee_paise
            mapping.is_primary = is_primary
            mapping.is_active = is_active
        else:
            mapping = RetailerCommunity(
                retailer_id=retailer_id,
                community_id=community_id,
                delivery_fee_paise=delivery_fee_paise,
                is_primary=is_primary,
                is_active=is_active,
                created_at=now_utc(),
            )
            db.add(mapping)

        db.commit()
        db.refresh(mapping)
        return mapping

    @staticmethod
    def get_global_transaction_summary(db: Session) -> dict[str, Any]:
        bo_stmt = select(
            func.count(BulkOrder.id).label("total_orders"),
            func.coalesce(func.sum(BulkOrder.subtotal_paise), 0).label("gross"),
            func.coalesce(func.sum(BulkOrder.discount_paise), 0).label("discount"),
            func.coalesce(func.sum(BulkOrder.delivery_fee_paise), 0).label("delivery"),
            func.coalesce(func.sum(BulkOrder.total_paise), 0).label("net"),
        ).where(func.upper(BulkOrder.status) != "REJECTED")
        bo_res = db.execute(bo_stmt).one()

        inv_stmt = select(
            func.coalesce(func.sum(Invoice.paid_amount_paise), 0).label("collected"),
            func.coalesce(
                func.sum(
                    case(
                        (Invoice.status != "paid", Invoice.total_amount_paise - Invoice.paid_amount_paise),
                        else_=0,
                    )
                ),
                0,
            ).label("outstanding"),
        )
        inv_res = db.execute(inv_stmt).one()

        return {
            "total_orders": bo_res.total_orders or 0,
            "total_gross_paise": bo_res.gross or 0,
            "total_discount_paise": bo_res.discount or 0,
            "total_delivery_fee_paise": bo_res.delivery or 0,
            "total_net_paise": bo_res.net or 0,
            "total_collected_paise": inv_res.collected or 0,
            "total_outstanding_paise": inv_res.outstanding or 0,
        }

    @staticmethod
    def get_health_metrics(db: Session) -> dict[str, Any]:
        active_comms = (
            db.scalar(select(func.count(Community.id)).where(Community.is_active.is_(True))) or 0
        )
        active_rets = (
            db.scalar(select(func.count(Retailer.id)).where(Retailer.status == "active")) or 0
        )
        total_users = (
            db.scalar(select(func.count(User.id)).where(User.is_active.is_(True))) or 0
        )

        return {
            "status": "healthy",
            "database": "connected",
            "active_communities_count": active_comms,
            "active_retailers_count": active_rets,
            "total_users_count": total_users,
            "time_utc": now_utc(),
            "environment": settings.ENVIRONMENT,
        }

    @staticmethod
    def get_audit_logs(
        db: Session,
        entity_type: str | None = None,
        action: str | None = None,
        page: int = 1,
        limit: int = 50,
    ) -> tuple[list[AuditLog], int]:
        stmt = (
            select(AuditLog)
            .options(selectinload(AuditLog.user))
            .order_by(AuditLog.created_at.desc())
        )
        count_stmt = select(func.count(AuditLog.id))

        if entity_type:
            stmt = stmt.where(AuditLog.entity_type == entity_type)
            count_stmt = count_stmt.where(AuditLog.entity_type == entity_type)
        if action:
            stmt = stmt.where(AuditLog.action == action)
            count_stmt = count_stmt.where(AuditLog.action == action)

        total = db.scalar(count_stmt) or 0
        items = list(db.scalars(stmt.offset((page - 1) * limit).limit(limit)).all())
        return items, total
