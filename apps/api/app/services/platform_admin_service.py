
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import ConflictError, NotFoundError
from app.models.identity import User
from app.models.organization import Community, Retailer
from app.repositories.platform_admin_repository import PlatformAdminRepository
from app.repositories.retailer_order_repository import RetailerOrderRepository
from app.schemas.platform_admin import (
    AuditLogItem,
    CreateCommunityRequest,
    CreateRetailerRequest,
    GlobalTransactionSummary,
    MapRetailerCommunityRequest,
    MapRetailerCommunityResponse,
    PlatformCommunityItem,
    PlatformConfigResponse,
    PlatformHealthMetrics,
    PlatformRetailerItem,
    UpdatePlatformConfigRequest,
)


class PlatformAdminService:
    @staticmethod
    def get_all_communities(db: Session) -> list[PlatformCommunityItem]:
        comms = PlatformAdminRepository.get_all_communities(db)
        return [PlatformCommunityItem(**c) for c in comms]

    @staticmethod
    def create_community(
        db: Session,
        payload: CreateCommunityRequest,
        current_user: User,
    ) -> PlatformCommunityItem:
        # Check if code already taken
        all_c = PlatformAdminRepository.get_all_communities(db)
        if any(c["code"].upper() == payload.code.upper() for c in all_c):
            raise ConflictError(
                f"Community code '{payload.code.upper()}' is already in use.",
                code="COMMUNITY_CODE_TAKEN",
            )

        comm = PlatformAdminRepository.create_community(
            db=db,
            name=payload.name,
            code=payload.code,
            address=payload.address,
            city=payload.city,
            postal_code=payload.postal_code,
        )

        RetailerOrderRepository.log_audit(
            db=db,
            action="COMMUNITY_CREATED",
            entity_type="Community",
            entity_id=comm.id,
            user_id=current_user.id,
            payload_after={"name": comm.name, "code": comm.code},
        )
        db.commit()

        return PlatformCommunityItem(
            id=comm.id,
            name=comm.name,
            code=comm.code,
            address=comm.address,
            city=comm.city,
            postal_code=comm.postal_code,
            is_active=comm.is_active,
            total_members=0,
            total_apartments=0,
            created_at=comm.created_at,
        )

    @staticmethod
    def get_all_retailers(db: Session) -> list[PlatformRetailerItem]:
        rets = PlatformAdminRepository.get_all_retailers(db)
        return [PlatformRetailerItem(**r) for r in rets]

    @staticmethod
    def create_retailer(
        db: Session,
        payload: CreateRetailerRequest,
        current_user: User,
    ) -> PlatformRetailerItem:
        ret = PlatformAdminRepository.create_retailer(
            db=db,
            phone=payload.phone,
            full_name=payload.full_name,
            store_name=payload.store_name,
            business_address=payload.business_address,
            gstin=payload.gstin,
        )

        RetailerOrderRepository.log_audit(
            db=db,
            action="RETAILER_CREATED",
            entity_type="Retailer",
            entity_id=ret.id,
            user_id=current_user.id,
            payload_after={"store_name": ret.store_name, "phone": ret.phone},
        )
        db.commit()

        return PlatformRetailerItem(
            id=ret.id,
            user_id=ret.user_id,
            store_name=ret.store_name,
            business_address=ret.business_address,
            gstin=ret.gstin,
            phone=ret.phone,
            status=ret.status,
            associated_communities_count=0,
        )

    @staticmethod
    def map_retailer_community(
        db: Session,
        payload: MapRetailerCommunityRequest,
        current_user: User,
    ) -> MapRetailerCommunityResponse:
        ret = db.get(Retailer, payload.retailer_id)
        if not ret:
            raise NotFoundError(f"Retailer {payload.retailer_id} not found.")

        comm = db.get(Community, payload.community_id)
        if not comm:
            raise NotFoundError(f"Community {payload.community_id} not found.")

        mapping = PlatformAdminRepository.map_retailer_to_community(
            db=db,
            retailer_id=payload.retailer_id,
            community_id=payload.community_id,
            delivery_fee_paise=payload.delivery_fee_paise,
            is_primary=payload.is_primary,
            is_active=payload.is_active,
        )

        RetailerOrderRepository.log_audit(
            db=db,
            action="RETAILER_COMMUNITY_MAPPED",
            entity_type="RetailerCommunity",
            entity_id=mapping.id,
            user_id=current_user.id,
            payload_after={
                "retailer_id": str(payload.retailer_id),
                "community_id": str(payload.community_id),
                "delivery_fee_paise": payload.delivery_fee_paise,
                "is_primary": payload.is_primary,
            },
        )
        db.commit()

        return MapRetailerCommunityResponse(
            id=mapping.id,
            retailer_id=mapping.retailer_id,
            retailer_store_name=ret.store_name,
            community_id=mapping.community_id,
            community_name=comm.name,
            delivery_fee_paise=mapping.delivery_fee_paise,
            is_primary=mapping.is_primary,
            is_active=mapping.is_active,
        )

    @staticmethod
    def get_global_transactions(db: Session) -> GlobalTransactionSummary:
        summary = PlatformAdminRepository.get_global_transaction_summary(db)
        return GlobalTransactionSummary(**summary)

    @staticmethod
    def get_platform_health(db: Session) -> PlatformHealthMetrics:
        metrics = PlatformAdminRepository.get_health_metrics(db)
        return PlatformHealthMetrics(**metrics)

    @staticmethod
    def get_audit_logs(
        db: Session,
        entity_type: str | None = None,
        action: str | None = None,
        page: int = 1,
        limit: int = 50,
    ) -> list[AuditLogItem]:
        items, _ = PlatformAdminRepository.get_audit_logs(
            db=db,
            entity_type=entity_type,
            action=action,
            page=page,
            limit=limit,
        )
        res = []
        for log in items:
            u_phone = log.user.phone if log.user else None
            res.append(
                AuditLogItem(
                    id=log.id,
                    user_id=log.user_id,
                    user_phone=u_phone,
                    action=log.action,
                    entity_type=log.entity_type,
                    entity_id=log.entity_id,
                    payload_before=log.payload_before,
                    payload_after=log.payload_after,
                    created_at=log.created_at,
                )
            )
        return res

    @staticmethod
    def get_config() -> PlatformConfigResponse:
        return PlatformConfigResponse(
            environment=settings.ENVIRONMENT,
            cutoff_day=settings.CYCLE_CUTOFF_DAY,
            cutoff_time=f"{settings.CYCLE_CUTOFF_HOUR:02d}:{settings.CYCLE_CUTOFF_MINUTE:02d}",
            session_max_age_days=settings.SESSION_MAX_AGE_DAYS,
            dev_otp_mode=(settings.OTP_MODE.lower() == "dev"),
            reminder_rate_limit_minutes=60,
        )

    @staticmethod
    def update_config(
        payload: UpdatePlatformConfigRequest,
        current_user: User,
        db: Session,
    ) -> PlatformConfigResponse:
        before = {
            "cutoff_day": settings.CYCLE_CUTOFF_DAY,
            "cutoff_time": f"{settings.CYCLE_CUTOFF_HOUR:02d}:{settings.CYCLE_CUTOFF_MINUTE:02d}",
        }
        if payload.cutoff_day is not None:
            settings.CYCLE_CUTOFF_DAY = payload.cutoff_day
        if payload.cutoff_time is not None:
            parts = payload.cutoff_time.split(":")
            settings.CYCLE_CUTOFF_HOUR = int(parts[0])
            settings.CYCLE_CUTOFF_MINUTE = int(parts[1])

        after = {
            "cutoff_day": settings.CYCLE_CUTOFF_DAY,
            "cutoff_time": f"{settings.CYCLE_CUTOFF_HOUR:02d}:{settings.CYCLE_CUTOFF_MINUTE:02d}",
            "reminder_rate_limit_minutes": payload.reminder_rate_limit_minutes or 60,
        }

        RetailerOrderRepository.log_audit(
            db=db,
            action="PLATFORM_CONFIG_UPDATED",
            entity_type="PlatformConfig",
            entity_id="global",
            user_id=current_user.id,
            payload_before=before,
            payload_after=after,
        )
        db.commit()

        return PlatformConfigResponse(
            environment=settings.ENVIRONMENT,
            cutoff_day=settings.CYCLE_CUTOFF_DAY,
            cutoff_time=f"{settings.CYCLE_CUTOFF_HOUR:02d}:{settings.CYCLE_CUTOFF_MINUTE:02d}",
            session_max_age_days=settings.SESSION_MAX_AGE_DAYS,
            dev_otp_mode=(settings.OTP_MODE.lower() == "dev"),
            reminder_rate_limit_minutes=payload.reminder_rate_limit_minutes or 60,
        )
