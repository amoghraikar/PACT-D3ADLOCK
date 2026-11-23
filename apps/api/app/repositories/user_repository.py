"""
User, Session, and OTP Repository.
Encapsulates direct database queries for identity entities.
"""

import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.identity import OtpVerification, Role, User, UserSession
from app.models.organization import Apartment, CommunityMembership


class UserRepository:
    @staticmethod
    def get_by_id(db: Session, user_id: uuid.UUID) -> User | None:
        stmt = (
            select(User)
            .options(
                joinedload(User.role),
                joinedload(User.retailer_profile),
                joinedload(User.memberships).joinedload(CommunityMembership.community),
                joinedload(User.memberships)
                .joinedload(CommunityMembership.apartment)
                .joinedload(Apartment.building),
            )
            .where(User.id == user_id)
        )
        return db.scalars(stmt).unique().first()

    @staticmethod
    def get_by_phone(db: Session, phone: str) -> User | None:
        stmt = (
            select(User)
            .options(
                joinedload(User.role),
                joinedload(User.retailer_profile),
                joinedload(User.memberships).joinedload(CommunityMembership.community),
                joinedload(User.memberships)
                .joinedload(CommunityMembership.apartment)
                .joinedload(Apartment.building),
            )
            .where(User.phone == phone)
        )
        return db.scalars(stmt).unique().first()

    @staticmethod
    def get_role_by_name(db: Session, name: str) -> Role | None:
        stmt = select(Role).where(Role.name == name)
        return db.scalars(stmt).first()

    @staticmethod
    def create_user(
        db: Session,
        phone: str,
        full_name: str,
        role_name: str = "customer",
        email: str | None = None,
        language: str = "en",
    ) -> User:
        role = UserRepository.get_role_by_name(db, role_name)
        if not role:
            # Fallback to customer or create role if missing
            role = Role(name=role_name, description=f"Default {role_name} role")
            db.add(role)
            db.flush()

        user = User(
            phone=phone,
            full_name=full_name,
            email=email,
            role_id=role.id,
            language=language,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return UserRepository.get_by_id(db, user.id) or user

    @staticmethod
    def count_recent_otp_requests(db: Session, phone: str, since: datetime) -> int:
        stmt = (
            select(func.count(OtpVerification.id))
            .where(OtpVerification.phone == phone)
            .where(OtpVerification.created_at >= since)
        )
        return db.scalar(stmt) or 0

    @staticmethod
    def get_latest_otp(db: Session, phone: str) -> OtpVerification | None:
        stmt = (
            select(OtpVerification)
            .where(OtpVerification.phone == phone)
            .where(OtpVerification.is_used.is_(False))
            .order_by(OtpVerification.created_at.desc())
        )
        return db.scalars(stmt).first()

    @staticmethod
    def create_otp(
        db: Session,
        phone: str,
        otp_hash: str,
        expires_at: datetime,
    ) -> OtpVerification:
        record = OtpVerification(
            phone=phone,
            otp_hash=otp_hash,
            attempts=0,
            is_used=False,
            expires_at=expires_at,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def mark_otp_used(db: Session, otp_id: uuid.UUID) -> None:
        otp = db.get(OtpVerification, otp_id)
        if otp:
            otp.is_used = True
            db.commit()

    @staticmethod
    def increment_otp_attempts(db: Session, otp_id: uuid.UUID) -> int:
        otp = db.get(OtpVerification, otp_id)
        if otp:
            otp.attempts += 1
            db.commit()
            return otp.attempts
        return 0

    @staticmethod
    def create_session(
        db: Session,
        user_id: uuid.UUID,
        session_token_hash: str,
        expires_at: datetime,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> UserSession:
        session = UserSession(
            user_id=user_id,
            session_token_hash=session_token_hash,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent[:255] if user_agent else None,
            is_revoked=False,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def get_session_by_hash(db: Session, session_token_hash: str) -> UserSession | None:
        stmt = (
            select(UserSession)
            .options(joinedload(UserSession.user).joinedload(User.role))
            .where(UserSession.session_token_hash == session_token_hash)
        )
        return db.scalars(stmt).first()

    @staticmethod
    def revoke_session(db: Session, session_token_hash: str) -> bool:
        stmt = select(UserSession).where(UserSession.session_token_hash == session_token_hash)
        session = db.scalars(stmt).first()
        if session:
            session.is_revoked = True
            db.commit()
            return True
        return False

    @staticmethod
    def revoke_all_user_sessions(db: Session, user_id: uuid.UUID) -> int:
        stmt = (
            select(UserSession)
            .where(UserSession.user_id == user_id)
            .where(UserSession.is_revoked.is_(False))
        )
        sessions = db.scalars(stmt).all()
        for s in sessions:
            s.is_revoked = True
        db.commit()
        return len(sessions)
