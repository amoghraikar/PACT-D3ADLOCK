"""
Reusable FastAPI dependency functions for authentication and role enforcement.

Usage:
    from app.core.deps import require_customer, require_retailer, require_admin, get_current_user

    @router.get("/my-cart")
    def get_cart(user: dict = Depends(require_customer)):
        ...
"""

from fastapi import Cookie, Depends, Header, status

from app.core.errors import AppError
from app.core.security import verify_session_token


def _extract_token(
    pact_session: str | None = Cookie(None),
    pact_token: str | None = Cookie(None),
    authorization: str | None = Header(None),
) -> str | None:
    """Extract the raw session token from cookie or Authorization header."""
    if pact_session:
        return pact_session
    if pact_token:
        return pact_token
    if authorization and authorization.startswith("Bearer "):
        return authorization[7:]
    return None


def get_current_user(token: str | None = Depends(_extract_token)) -> dict:
    """
    Validate the session token and return the user payload.
    Raises HTTP 401 if the token is missing or invalid.
    """
    if not token:
        raise AppError(
            code="UNAUTHORIZED",
            message="Sign-in required. Please log in to continue.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    # Import here to avoid circular imports with auth router
    from app.modules.auth.router import USERS, get_user_from_token

    user = get_user_from_token(token)
    if not user:
        raise AppError(
            code="UNAUTHORIZED",
            message="Session expired or invalid. Please sign in again.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    return user


def require_customer(user: dict = Depends(get_current_user)) -> dict:
    """Require the caller to be a customer."""
    if user.get("role") != "customer":
        raise AppError(
            code="FORBIDDEN",
            message="This action is only available to customers.",
            status_code=status.HTTP_403_FORBIDDEN,
        )
    return user


def require_retailer(user: dict = Depends(get_current_user)) -> dict:
    """Require the caller to be a retailer."""
    if user.get("role") != "retailer":
        raise AppError(
            code="FORBIDDEN",
            message="This action is only available to retailers.",
            status_code=status.HTTP_403_FORBIDDEN,
        )
    return user


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Require the caller to be a community_admin or platform_admin."""
    role = user.get("role", "")
    if role not in ("community_admin", "platform_admin"):
        raise AppError(
            code="FORBIDDEN",
            message="This action is only available to administrators.",
            status_code=status.HTTP_403_FORBIDDEN,
        )
    return user


def require_platform_admin(user: dict = Depends(get_current_user)) -> dict:
    """Require the caller to be a platform_admin."""
    if user.get("role") != "platform_admin":
        raise AppError(
            code="FORBIDDEN",
            message="Platform administrator access required.",
            status_code=status.HTTP_403_FORBIDDEN,
        )
    return user


def get_retailer_id(user: dict = Depends(require_retailer)) -> str:
    """Extract the retailer's store_id from the authenticated retailer user."""
    store_id = user.get("store_id") or user.get("retailer_id")
    if not store_id:
        raise AppError(
            code="RETAILER_NOT_CONFIGURED",
            message="Your retailer account has no store associated. Please complete onboarding.",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    return store_id
