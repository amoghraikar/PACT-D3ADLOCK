"""
Authentication API Router:
- Phone OTP Request & Verification
- Mobile & Web Session Management
- Current User Profile
- Session Revocation / Logout
"""

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.core.deps import extract_session_token, get_current_user
from app.models.identity import User
from app.schemas.auth import (
    AuthTokenResponse,
    LogoutResponse,
    OtpRequest,
    OtpRequestResponse,
    OtpVerifyRequest,
    UserSummary,
)
from app.services.auth_service import AuthService

router = APIRouter()


@router.post(
    "/request-otp",
    response_model=OtpRequestResponse,
    summary="Request a verification OTP for login or registration",
)
def request_otp(
    payload: OtpRequest,
    db: Session = Depends(get_db),
) -> OtpRequestResponse:
    """
    Initiates phone verification by generating and securely hashing a 6-digit OTP.
    Rate limits OTP requests per phone. In development mode, returns dev_otp.
    """
    return AuthService.request_otp(db=db, phone=payload.phone)


@router.post(
    "/verify-otp",
    response_model=AuthTokenResponse,
    summary="Verify OTP and establish an authenticated user session",
)
def verify_otp(
    payload: OtpVerifyRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthTokenResponse:
    """
    Validates the submitted OTP.
    On success:
    - Registers user if not already present (defaulting strictly to customer role).
    - Creates a stateful session record in PostgreSQL.
    - Sets an HttpOnly, SameSite cookie for web browsers.
    - Returns an HMAC-signed Bearer token in the JSON body for Capacitor mobile apps.
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")

    session_token, auth_response = AuthService.verify_otp(
        db=db,
        phone=payload.phone,
        otp=payload.otp,
        ip_address=client_ip,
        user_agent=user_agent,
    )

    # Set secure HttpOnly session cookie for browser clients
    is_prod = settings.ENVIRONMENT == "production"
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_token,
        max_age=settings.SESSION_MAX_AGE_DAYS * 86400,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE or is_prod,
        samesite=settings.SESSION_COOKIE_SAMESITE,
        path="/",
    )

    return auth_response


@router.get(
    "/me",
    response_model=UserSummary,
    summary="Retrieve profile and permissions for the currently authenticated user",
)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
) -> UserSummary:
    """
    Returns authenticated user information including role, active society memberships,
    and linked retailer profile if applicable.
    """
    return AuthService.format_user_summary(current_user)


@router.post(
    "/logout",
    response_model=LogoutResponse,
    summary="Revoke active user session and clear cookies",
)
def logout(
    response: Response,
    db: Session = Depends(get_db),
    token: str | None = Depends(extract_session_token),
) -> LogoutResponse:
    """
    Revokes the current session record in the database and clears the session cookie.
    """
    if token:
        AuthService.logout(db=db, session_token=token)

    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/",
    )

    return LogoutResponse(message="Successfully logged out")
