"""
FastAPI Dependency Injection:
- Database session provider (get_db)
- Authentication dependencies (get_current_user)
- Strict Role-Based Access Control (RBAC) guards
- Multi-tenant boundary verification (community & retailer isolation)
"""

import uuid

from fastapi import Cookie, Depends, Header, Request
from sqlalchemy.orm import Session

from app.core.clock import now_utc
from app.core.config import settings
from app.core.db import get_db
from app.core.errors import ForbiddenError, UnauthorizedError
from app.core.security import compute_token_hash, verify_session_token
from app.models.identity import User
from app.repositories.user_repository import UserRepository


def extract_session_token(
    request: Request,
    authorization: str | None = Header(default=None),
    pact_session: str | None = Cookie(default=None, alias=settings.SESSION_COOKIE_NAME),
) -> str | None:
    """
    Extracts session token from either:
    1. Authorization: Bearer <token> (preferred for Capacitor mobile & API clients)
    2. HttpOnly Cookie: pact_session (preferred for browser web clients)
    """
    if authorization:
        parts = authorization.strip().split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1]
    if pact_session:
        return pact_session
    # Fallback to custom header if client uses X-Session-Token
    custom_header = request.headers.get("X-Session-Token")
    if custom_header:
        return custom_header.strip()
    return None


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    token: str | None = Depends(extract_session_token),
) -> User:
    """
    Validates token signature, expiration, and database session state.
    Returns the authenticated active User entity.
    """
    if not token:
        raise UnauthorizedError("Authentication required. Please sign in.", code="UNAUTHORIZED")

    # 1. Verify cryptographic HMAC signature & token expiration
    payload = verify_session_token(token)
    if not payload or "sub" not in payload:
        raise UnauthorizedError("Invalid or expired session token.", code="INVALID_SESSION")

    # 2. Verify stateful session in database
    token_hash = compute_token_hash(token)
    session_record = UserRepository.get_session_by_hash(db, token_hash)
    if not session_record:
        raise UnauthorizedError("Session record not found.", code="SESSION_NOT_FOUND")

    if session_record.is_revoked:
        raise UnauthorizedError("Session has been revoked.", code="SESSION_REVOKED")

    if session_record.expires_at < now_utc():
        raise UnauthorizedError("Session has expired.", code="SESSION_EXPIRED")

    # 3. Load user
    user = UserRepository.get_by_id(db, session_record.user_id)
    if not user:
        raise UnauthorizedError("User associated with session not found.", code="USER_NOT_FOUND")

    if not user.is_active:
        raise ForbiddenError(
            "Account has been deactivated. Please contact support.", code="ACCOUNT_INACTIVE"
        )

    return user


def require_customer(current_user: User = Depends(get_current_user)) -> User:
    """Ensures the authenticated user has customer or higher privileges."""
    if not current_user.role or current_user.role.name not in {
        "customer",
        "community_admin",
        "admin",
        "platform_admin",
    }:
        raise ForbiddenError("Customer access required.", code="FORBIDDEN")
    return current_user


def require_retailer(current_user: User = Depends(get_current_user)) -> User:
    """Ensures the authenticated user is a registered merchant/retailer."""
    role_name = current_user.role.name if current_user.role else ""
    if role_name not in {"retailer", "platform_admin"}:
        raise ForbiddenError("Retailer privileges required.", code="FORBIDDEN")
    return current_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Ensures the user has community admin or platform admin privileges."""
    role_name = current_user.role.name if current_user.role else ""
    if role_name not in {"admin", "community_admin", "platform_admin"}:
        raise ForbiddenError("Community administrator privileges required.", code="FORBIDDEN")
    return current_user


def require_platform_admin(current_user: User = Depends(get_current_user)) -> User:
    """Ensures the user has platform administrator privileges."""
    role_name = current_user.role.name if current_user.role else ""
    if role_name != "platform_admin":
        raise ForbiddenError("Platform administrator privileges required.", code="FORBIDDEN")
    return current_user


def verify_community_access(user: User, community_id: uuid.UUID) -> None:
    """
    Enforces tenant isolation for community boundaries.
    Platform admins have global visibility.
    Regular residents/admins must be active members of the specified community.
    """
    if user.role and user.role.name == "platform_admin":
        return

    is_member = any(
        m.community_id == community_id and m.is_active for m in (user.memberships or [])
    )
    if not is_member:
        raise ForbiddenError(
            "Cross-community access denied. You are not an active member of this community.",
            code="COMMUNITY_ACCESS_DENIED",
        )


def verify_retailer_access(user: User, retailer_id: uuid.UUID) -> None:
    """
    Enforces tenant isolation for retailer boundaries.
    Platform admins have global visibility.
    Retailers may only access resources belonging to their own store.
    """
    if user.role and user.role.name == "platform_admin":
        return

    if not user.retailer_profile or user.retailer_profile.id != retailer_id:
        raise ForbiddenError(
            "Cross-retailer access denied. You do not manage this store.",
            code="RETAILER_ACCESS_DENIED",
        )
