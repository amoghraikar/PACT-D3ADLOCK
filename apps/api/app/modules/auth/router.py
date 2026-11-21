import hashlib
import logging
import random
import time

from fastapi import APIRouter, Cookie, Header, Response, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.errors import AppError
from app.core.security import create_session_token, verify_session_token

logger = logging.getLogger("pact.auth")

router = APIRouter(prefix="/auth", tags=["auth"])
onboarding_router = APIRouter(prefix="/onboarding", tags=["onboarding"])

# In-memory store initialized with Golden Scenario G data for quick dev/testing
COMMUNITIES = {
    "comm-green-1": {
        "id": "comm-green-1",
        "name": "Green Meadows Apartments",
        "code": "GREEN",
        "join_code": "GREEN1",
        "address": "Green Glen Layout, Bellandur, Bengaluru",
    },
    "comm-lake-1": {
        "id": "comm-lake-1",
        "name": "Lakeview Residency",
        "code": "LAKE",
        "join_code": "LAKE01",
        "address": "Outer Ring Road, Marathahalli, Bengaluru",
    },
}

USERS: dict[str, dict] = {
    "+919999900001": {
        "id": "usr-asha-1",
        "phone": "+919999900001",
        "name": "Asha Rao",
        "role": "customer",
        "language": "en",
        "community_id": "comm-green-1",
        "unit_label": "A-101",
    },
    "+919999900002": {
        "id": "usr-bharat-2",
        "phone": "+919999900002",
        "name": "Bharat Patel",
        "role": "customer",
        "language": "en",
        "community_id": "comm-green-1",
        "unit_label": "B-204",
    },
    "+919999900003": {
        "id": "usr-chitra-3",
        "phone": "+919999900003",
        "name": "Chitra Sen",
        "role": "customer",
        "language": "en",
        "community_id": "comm-green-1",
        "unit_label": "C-305",
    },
    "+919999900004": {
        "id": "usr-dev-4",
        "phone": "+919999900004",
        "name": "Dev Nair",
        "role": "customer",
        "language": "en",
        "community_id": "comm-green-1",
        "unit_label": "D-402",
    },
    "+919999900005": {
        "id": "usr-esha-5",
        "phone": "+919999900005",
        "name": "Esha Bose",
        "role": "customer",
        "language": "en",
        "community_id": "comm-lake-1",
        "unit_label": "L-11",
    },
    "+919999900011": {
        "id": "usr-meera-11",
        "phone": "+919999900011",
        "name": "Meera Sundaram",
        "role": "community_admin",
        "language": "en",
        "community_id": "comm-green-1",
        "unit_label": "Admin",
    },
    "+919999900012": {
        "id": "usr-nikhil-12",
        "phone": "+919999900012",
        "name": "Nikhil Verma",
        "role": "community_admin",
        "language": "en",
        "community_id": "comm-lake-1",
        "unit_label": "Admin",
    },
    "+919999900021": {
        "id": "usr-ravi-21",
        "phone": "+919999900021",
        "name": "Ravi Kumar",
        "role": "retailer",
        "language": "en",
        "store_id": "ret-ravi-1",
        "store_name": "Sri Lakshmi Stores",
        "store_status": "active",
    },
    "+919999900022": {
        "id": "usr-farah-22",
        "phone": "+919999900022",
        "name": "Farah Khan",
        "role": "retailer",
        "language": "en",
        "store_id": "ret-farah-2",
        "store_name": "Daily Needs Mart",
        "store_status": "active",
    },
    "+919999900099": {
        "id": "usr-priya-99",
        "phone": "+919999900099",
        "name": "Priya Sharma",
        "role": "platform_admin",
        "language": "en",
    },
}

# OTP Challenge Store: phone -> { code_hash, expires_at, attempts, requested_times: [...] }
OTP_STORE: dict[str, dict] = {}


def normalize_phone(phone: str) -> str:
    cleaned = "".join(c for c in phone if c.isdigit() or c == "+")
    if not cleaned.startswith("+"):
        if len(cleaned) == 10:
            cleaned = "+91" + cleaned
        elif cleaned.startswith("91") and len(cleaned) == 12:
            cleaned = "+" + cleaned
    return cleaned


class OtpRequestIn(BaseModel):
    phone: str = Field(..., description="Phone number with country code, e.g. +919999900001")


class OtpVerifyIn(BaseModel):
    phone: str
    code: str


class ResidentOnboardingIn(BaseModel):
    join_code: str
    name: str
    unit_label: str


class RetailerOnboardingIn(BaseModel):
    store_name: str
    address: str
    gstin: str | None = None


def get_user_from_token(token: str | None) -> dict | None:
    if not token:
        return None
    payload = verify_session_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    for user in USERS.values():
        if user["id"] == user_id:
            return user
    return None


@router.post("/otp/request")
def request_otp(body: OtpRequestIn):
    phone = normalize_phone(body.phone)
    now = time.time()

    # Rate limiting: at most 3 requests per phone per 10 minutes (600s)
    history = OTP_STORE.get(phone, {}).get("requested_times", [])
    history = [t for t in history if now - t < 600]
    if len(history) >= 3:
        raise AppError(
            code="RATE_LIMITED",
            message="Too many code requests. Please wait a few minutes before trying again.",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    # Generate 6-digit code
    code = f"{random.randint(100000, 999999)}"
    code_hash = hashlib.sha256(code.encode()).hexdigest()
    expires_at = now + 300  # 5 minutes

    history.append(now)
    OTP_STORE[phone] = {
        "code_hash": code_hash,
        "expires_at": expires_at,
        "attempts": 0,
        "requested_times": history,
    }

    if settings.OTP_MODE == "dev":
        logger.info(f"[DEV OTP] Generated code for {phone}: {code} (or dev code 000000)")
        print(f"\n[DEV OTP] Phone: {phone} | Code: {code} (or 000000)\n")

    return {
        "message": "6-digit code sent",
        "phone": phone,
    }


@router.post("/otp/verify")
def verify_otp(body: OtpVerifyIn, response: Response):
    phone = normalize_phone(body.phone)
    code = body.code.strip()
    now = time.time()

    challenge = OTP_STORE.get(phone)
    is_dev = settings.OTP_MODE == "dev" and code == "000000"

    if not is_dev:
        if not challenge:
            raise AppError(
                code="INVALID_CODE",
                message="Invalid or expired code. Please request a new one.",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )
        if now > challenge["expires_at"]:
            raise AppError(
                code="CODE_EXPIRED",
                message="The code has expired. Please request a new code.",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )
        if challenge["attempts"] >= 5:
            raise AppError(
                code="ATTEMPTS_EXCEEDED",
                message="Too many incorrect attempts. Please request a new code.",
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        code_hash = hashlib.sha256(code.encode()).hexdigest()
        if code_hash != challenge["code_hash"]:
            challenge["attempts"] += 1
            raise AppError(
                code="INVALID_CODE",
                message="Incorrect code. Please check and try again.",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

    # Success: find or create user
    user = USERS.get(phone)
    if not user:
        user_id = f"usr-{random.randint(100000, 999999)}"
        user = {
            "id": user_id,
            "phone": phone,
            "name": "",
            "role": None,
            "language": "en",
        }
        USERS[phone] = user

    # Create signed session token
    token = create_session_token(user["id"])
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token,
        max_age=settings.SESSION_MAX_AGE_DAYS * 24 * 3600,
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True in production HTTPS
        path="/",
    )

    # Prepare response envelope
    membership = None
    if user.get("community_id"):
        community = COMMUNITIES.get(user["community_id"])
        if community:
            membership = {
                "community": community,
                "unit_label": user.get("unit_label", ""),
                "role": user.get("role", "member"),
            }

    retailer = None
    if user.get("store_id"):
        retailer = {
            "id": user["store_id"],
            "store_name": user.get("store_name", ""),
            "status": user.get("store_status", "pending"),
        }

    return {
        "user": {
            "id": user["id"],
            "phone": user["phone"],
            "name": user.get("name", ""),
            "role": user.get("role"),
            "language": user.get("language", "en"),
        },
        "membership": membership,
        "retailer": retailer,
        "token": token,
    }


@router.get("/me")
def get_me(
    pact_session: str | None = Cookie(None),
    authorization: str | None = Header(None),
):
    token = pact_session
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]

    user = get_user_from_token(token)
    if not user:
        raise AppError(
            code="UNAUTHORIZED",
            message="You are not signed in.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    membership = None
    if user.get("community_id"):
        community = COMMUNITIES.get(user["community_id"])
        if community:
            membership = {
                "community": community,
                "unit_label": user.get("unit_label", ""),
                "role": user.get("role", "member"),
            }

    retailer = None
    if user.get("store_id"):
        retailer = {
            "id": user["store_id"],
            "store_name": user.get("store_name", ""),
            "status": user.get("store_status", "pending"),
        }

    return {
        "user": {
            "id": user["id"],
            "phone": user["phone"],
            "name": user.get("name", ""),
            "role": user.get("role"),
            "language": user.get("language", "en"),
        },
        "membership": membership,
        "retailer": retailer,
    }


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax",
    )
    return {"message": "Signed out"}


@onboarding_router.post("/resident")
def onboard_resident(
    body: ResidentOnboardingIn,
    pact_session: str | None = Cookie(None),
    authorization: str | None = Header(None),
):
    token = pact_session
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]

    user = get_user_from_token(token)
    if not user:
        raise AppError(
            code="UNAUTHORIZED",
            message="Sign-in required to join a building.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    # Check join code
    matching_comm = None
    for comm in COMMUNITIES.values():
        if comm["join_code"].upper() == body.join_code.strip().upper():
            matching_comm = comm
            break

    if not matching_comm:
        raise AppError(
            code="COMMUNITY_NOT_FOUND",
            message="Building join code not recognized. Please check with your building committee.",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    user["name"] = body.name.strip()
    user["role"] = "customer"
    user["community_id"] = matching_comm["id"]
    user["unit_label"] = body.unit_label.strip()

    return {
        "user": {
            "id": user["id"],
            "phone": user["phone"],
            "name": user["name"],
            "role": user["role"],
            "language": user.get("language", "en"),
        },
        "membership": {
            "community": matching_comm,
            "unit_label": user["unit_label"],
            "role": "member",
        },
    }


@onboarding_router.post("/retailer")
def onboard_retailer(
    body: RetailerOnboardingIn,
    pact_session: str | None = Cookie(None),
    authorization: str | None = Header(None),
):
    token = pact_session
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]

    user = get_user_from_token(token)
    if not user:
        raise AppError(
            code="UNAUTHORIZED",
            message="Sign-in required to register a store.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    store_id = f"ret-{random.randint(10000, 99999)}"
    user["name"] = body.store_name.strip()
    user["role"] = "retailer"
    user["store_id"] = store_id
    user["store_name"] = body.store_name.strip()
    user["store_status"] = "pending"

    return {
        "user": {
            "id": user["id"],
            "phone": user["phone"],
            "name": user["name"],
            "role": user["role"],
            "language": user.get("language", "en"),
        },
        "retailer": {
            "id": store_id,
            "store_name": user["store_name"],
            "address": body.address.strip(),
            "gstin": body.gstin.strip() if body.gstin else None,
            "status": "pending",
        },
    }
