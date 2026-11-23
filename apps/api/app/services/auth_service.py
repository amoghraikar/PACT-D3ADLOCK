import hashlib
import hmac
import secrets
from datetime import timedelta

from sqlalchemy.orm import Session

from app.core.clock import now_utc
from app.core.config import settings
from app.core.errors import ForbiddenError, RateLimitError, UnauthorizedError
from app.core.security import create_session_token
from app.models.identity import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    AuthTokenResponse,
    CommunityBrief,
    OtpRequestResponse,
    UserSummary,
)


def compute_otp_hash(phone: str, otp: str) -> str:
    """Compute HMAC-SHA256 hash for phone + OTP."""
    msg = f"{phone}:{otp}".encode()
    return hmac.new(settings.APP_SECRET.encode("utf-8"), msg, hashlib.sha256).hexdigest()


def compute_token_hash(token: str) -> str:
    """Compute SHA-256 hash for session token storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class AuthService:
    @staticmethod
    def format_user_summary(user: User) -> UserSummary:
        """Transform User ORM model to UserSummary schema."""
        communities: list[CommunityBrief] = []
        for membership in user.memberships or []:
            if membership.is_active and membership.community:
                building_name = (
                    membership.apartment.building.name
                    if membership.apartment and membership.apartment.building
                    else None
                )
                unit_number = membership.apartment.unit_number if membership.apartment else None
                communities.append(
                    CommunityBrief(
                        id=membership.community.id,
                        name=membership.community.name,
                        code=membership.community.code,
                        role=membership.role,
                        building_name=building_name,
                        unit_number=unit_number,
                    )
                )

        retailer_id = user.retailer_profile.id if user.retailer_profile else None

        return UserSummary(
            id=user.id,
            phone=user.phone,
            email=user.email,
            full_name=user.full_name,
            role=user.role.name if user.role else "customer",
            language=user.language,
            is_active=user.is_active,
            communities=communities,
            retailer_id=retailer_id,
        )

    @classmethod
    def request_otp(cls, db: Session, phone: str) -> OtpRequestResponse:
        """
        Request a one-time password for the given phone number.
        Enforces rate limits (cooldown & hourly ceiling).
        """
        current_time = now_utc()
        one_hour_ago = current_time - timedelta(hours=1)

        # 1. Hourly rate limit check
        recent_count = UserRepository.count_recent_otp_requests(db, phone, since=one_hour_ago)
        if recent_count >= settings.OTP_RATE_LIMIT_MAX_PER_HOUR:
            raise RateLimitError(
                "Too many OTP requests for this phone number. Please wait an hour before trying again."
            )

        # 2. Cooldown check from latest request
        latest = UserRepository.get_latest_otp(db, phone)
        if latest and not latest.is_used:
            elapsed_seconds = (current_time - latest.created_at).total_seconds()
            if elapsed_seconds < settings.OTP_RATE_LIMIT_COOLDOWN_SECONDS:
                remaining = int(settings.OTP_RATE_LIMIT_COOLDOWN_SECONDS - elapsed_seconds)
                raise RateLimitError(
                    f"Please wait {remaining} seconds before requesting a new OTP."
                )

        # 3. Generate OTP
        is_dev = settings.ENVIRONMENT != "production" and settings.OTP_MODE == "dev"
        if is_dev and settings.DEV_OTP:
            otp = settings.DEV_OTP
        else:
            otp = f"{secrets.randbelow(1_000_000):06d}"

        # 4. Hash and persist OTP
        otp_hash = compute_otp_hash(phone, otp)
        expires_at = current_time + timedelta(seconds=settings.OTP_EXPIRE_SECONDS)
        UserRepository.create_otp(db, phone=phone, otp_hash=otp_hash, expires_at=expires_at)

        # 5. Build response - NEVER expose OTP in production
        dev_otp_value = otp if is_dev else None

        return OtpRequestResponse(
            message="OTP sent successfully",
            phone=phone,
            expires_in_seconds=settings.OTP_EXPIRE_SECONDS,
            dev_otp=dev_otp_value,
        )

    @classmethod
    def verify_otp(
        cls,
        db: Session,
        phone: str,
        otp: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> tuple[str, AuthTokenResponse]:
        """
        Verify the OTP, authenticate or register user, and create a persistent session.
        Returns raw token and AuthTokenResponse.
        """
        current_time = now_utc()
        otp_record = UserRepository.get_latest_otp(db, phone)

        if not otp_record:
            raise UnauthorizedError(
                "No active OTP request found. Please request an OTP first.",
                code="OTP_NOT_FOUND",
            )

        # Check expiration
        if otp_record.expires_at < current_time:
            UserRepository.mark_otp_used(db, otp_record.id)
            raise UnauthorizedError(
                "OTP has expired. Please request a new OTP.", code="OTP_EXPIRED"
            )

        # Check max attempts
        if otp_record.attempts >= settings.OTP_MAX_ATTEMPTS:
            UserRepository.mark_otp_used(db, otp_record.id)
            raise UnauthorizedError(
                "Maximum verification attempts exceeded. Please request a new OTP.",
                code="OTP_MAX_ATTEMPTS_EXCEEDED",
            )

        # Verify hash
        expected_hash = compute_otp_hash(phone, otp)
        if not hmac.compare_digest(expected_hash, otp_record.otp_hash):
            attempts = UserRepository.increment_otp_attempts(db, otp_record.id)
            remaining = max(0, settings.OTP_MAX_ATTEMPTS - attempts)
            if remaining == 0:
                UserRepository.mark_otp_used(db, otp_record.id)
                raise UnauthorizedError(
                    "Invalid OTP. Maximum attempts reached. Please request a new OTP.",
                    code="OTP_MAX_ATTEMPTS_EXCEEDED",
                )
            raise UnauthorizedError(
                f"Invalid OTP. {remaining} attempt(s) remaining.",
                code="INVALID_OTP",
            )

        # Mark OTP as successfully used
        UserRepository.mark_otp_used(db, otp_record.id)

        # Fetch or register user (defaulting to customer role)
        user = UserRepository.get_by_phone(db, phone)
        if not user:
            user = UserRepository.create_user(
                db=db,
                phone=phone,
                full_name=f"PACT Member ({phone[-4:]})",
                role_name="customer",
            )

        if not user.is_active:
            raise ForbiddenError(
                "Your account is inactive. Please contact support.",
                code="ACCOUNT_INACTIVE",
            )

        # Create session token
        session_token = create_session_token(
            user_id=str(user.id),
            extra={"role": user.role.name if user.role else "customer"},
        )
        token_hash = compute_token_hash(session_token)
        session_expires_at = current_time + timedelta(days=settings.SESSION_MAX_AGE_DAYS)

        UserRepository.create_session(
            db=db,
            user_id=user.id,
            session_token_hash=token_hash,
            expires_at=session_expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        user_summary = cls.format_user_summary(user)
        response = AuthTokenResponse(
            access_token=session_token,
            token_type="bearer",
            expires_in=settings.SESSION_MAX_AGE_DAYS * 86400,
            user=user_summary,
        )

        return session_token, response

    @classmethod
    def logout(cls, db: Session, session_token: str) -> bool:
        """Revoke user session."""
        token_hash = compute_token_hash(session_token)
        return UserRepository.revoke_session(db, token_hash)
