"""
Comprehensive tests for Milestone 2:
- Authentication (request OTP, verify OTP, session creation)
- Security (dev OTP mode, invalid OTP lockout, expired OTP)
- Dual-transport session handling (Bearer token & HttpOnly cookie)
- Session revocation on logout
- Strict RBAC (customer, retailer, admin, platform_admin)
- Tenant isolation (cross-community and cross-retailer access boundaries)
- Standardized error envelope conformance
- Tracing (X-Request-ID) and system readiness checks
"""

import uuid
from datetime import timedelta

import pytest
from fastapi import APIRouter, Depends
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.clock import now_utc
from app.core.config import settings
from app.core.db import SessionLocal
from app.core.deps import (
    get_current_user,
    require_admin,
    require_customer,
    require_platform_admin,
    require_retailer,
    verify_community_access,
    verify_retailer_access,
)
from app.main import app
from app.models.identity import OtpVerification, User
from app.models.organization import Community, Retailer
from app.repositories.user_repository import UserRepository
from app.services.auth_service import compute_otp_hash

# Mount temporary test router to verify dependency guards
rbac_test_router = APIRouter(prefix="/test-rbac")


@rbac_test_router.get("/customer-only")
def customer_endpoint(user: User = Depends(require_customer)):
    return {"status": "ok", "role": user.role.name}


@rbac_test_router.get("/retailer-only")
def retailer_endpoint(user: User = Depends(require_retailer)):
    return {"status": "ok", "role": user.role.name}


@rbac_test_router.get("/admin-only")
def admin_endpoint(user: User = Depends(require_admin)):
    return {"status": "ok", "role": user.role.name}


@rbac_test_router.get("/platform-admin-only")
def platform_admin_endpoint(user: User = Depends(require_platform_admin)):
    return {"status": "ok", "role": user.role.name}


@rbac_test_router.get("/community/{community_id}")
def community_tenant_endpoint(
    community_id: uuid.UUID,
    user: User = Depends(get_current_user),
):
    verify_community_access(user, community_id)
    return {"status": "ok", "community_id": str(community_id)}


@rbac_test_router.get("/retailer/{retailer_id}")
def retailer_tenant_endpoint(
    retailer_id: uuid.UUID,
    user: User = Depends(get_current_user),
):
    verify_retailer_access(user, retailer_id)
    return {"status": "ok", "retailer_id": str(retailer_id)}


app.include_router(rbac_test_router)

client = TestClient(app)


@pytest.fixture(scope="function")
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def test_readiness_checks():
    """Verify system readiness endpoints probe DB connectivity."""
    resp1 = client.get("/ready")
    assert resp1.status_code == 200
    assert resp1.json()["database"] == "connected"

    resp2 = client.get("/api/v1/ready")
    assert resp2.status_code == 200
    assert resp2.json()["database"] == "connected"


def test_request_id_middleware():
    """Verify X-Request-ID is attached to every response."""
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    assert "x-request-id" in resp.headers


def test_request_otp_flow(db):
    """Verify OTP generation and dev mode response."""
    phone = "+919999900001"  # Asha (customer)

    # Clear prior OTPs for clean test run
    db.query(OtpVerification).filter(OtpVerification.phone == phone).delete()
    db.commit()

    resp = client.post("/api/v1/auth/request-otp", json={"phone": phone})
    assert resp.status_code == 200
    data = resp.json()
    assert data["phone"] == phone
    assert data["message"] == "OTP sent successfully"
    assert data["expires_in_seconds"] == settings.OTP_EXPIRE_SECONDS
    assert data["dev_otp"] == settings.DEV_OTP


def test_verify_otp_bearer_and_cookie_transports(db):
    """Verify successful OTP verification returns token and sets HttpOnly cookie."""
    phone = "+919999900001"  # Asha Sharma

    # Reset OTP
    db.query(OtpVerification).filter(OtpVerification.phone == phone).delete()
    db.commit()

    client.post("/api/v1/auth/request-otp", json={"phone": phone})
    verify_resp = client.post(
        "/api/v1/auth/verify-otp",
        json={"phone": phone, "otp": settings.DEV_OTP},
    )
    assert verify_resp.status_code == 200
    verify_data = verify_resp.json()

    assert "access_token" in verify_data
    token = verify_data["access_token"]
    assert verify_data["user"]["phone"] == phone
    assert verify_data["user"]["full_name"] == "Asha Sharma"
    assert verify_data["user"]["role"] == "customer"
    assert len(verify_data["user"]["communities"]) >= 1

    # 1. Test Bearer Token transport
    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["phone"] == phone

    # 2. Test HttpOnly Cookie transport
    cookie_resp = client.get(
        "/api/v1/auth/me",
        cookies={settings.SESSION_COOKIE_NAME: token},
    )
    assert cookie_resp.status_code == 200
    assert cookie_resp.json()["phone"] == phone


def test_new_user_registration(db):
    """Verify new phone number auto-registers strictly as customer."""
    new_phone = "+919999999999"

    # Cleanup if previously created
    db.query(OtpVerification).filter(OtpVerification.phone == new_phone).delete()
    existing_user = UserRepository.get_by_phone(db, new_phone)
    if existing_user:
        db.delete(existing_user)
    db.commit()

    client.post("/api/v1/auth/request-otp", json={"phone": new_phone})
    verify_resp = client.post(
        "/api/v1/auth/verify-otp",
        json={"phone": new_phone, "otp": settings.DEV_OTP},
    )
    assert verify_resp.status_code == 200
    data = verify_resp.json()
    assert data["user"]["phone"] == new_phone
    assert data["user"]["role"] == "customer"


def test_invalid_otp_attempts_lockout(db):
    """Verify invalid OTP attempts are counted and max attempts lock out the OTP."""
    phone = "+919999900002"  # Bharat

    db.query(OtpVerification).filter(OtpVerification.phone == phone).delete()
    db.commit()

    client.post("/api/v1/auth/request-otp", json={"phone": phone})

    # Attempt 1
    resp1 = client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp": "999999"})
    assert resp1.status_code == 401
    assert "attempt(s) remaining" in resp1.json()["error"]["message"]

    # Attempt 2
    resp2 = client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp": "999999"})
    assert resp2.status_code == 401

    # Attempt 3 - Max attempts reached
    resp3 = client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp": "999999"})
    assert resp3.status_code == 401
    assert "Maximum attempts reached" in resp3.json()["error"]["message"]

    # Attempt 4 with correct OTP should now fail because OTP record is spent
    resp4 = client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp": settings.DEV_OTP})
    assert resp4.status_code == 401


def test_expired_otp(db):
    """Verify expired OTP is rejected."""
    phone = "+919999900003"  # Dev

    db.query(OtpVerification).filter(OtpVerification.phone == phone).delete()
    db.commit()

    otp_hash = compute_otp_hash(phone, "123456")
    past_time = now_utc() - timedelta(minutes=5)
    record = OtpVerification(
        phone=phone,
        otp_hash=otp_hash,
        attempts=0,
        is_used=False,
        expires_at=past_time,
    )
    db.add(record)
    db.commit()

    resp = client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp": "123456"})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "OTP_EXPIRED"


def test_session_revocation_on_logout(db):
    """Verify logout invalidates token in database."""
    phone = "+919999900001"

    db.query(OtpVerification).filter(OtpVerification.phone == phone).delete()
    db.commit()

    client.post("/api/v1/auth/request-otp", json={"phone": phone})
    verify_resp = client.post(
        "/api/v1/auth/verify-otp",
        json={"phone": phone, "otp": settings.DEV_OTP},
    )
    token = verify_resp.json()["access_token"]

    # Logout
    logout_resp = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert logout_resp.status_code == 200

    # Attempt accessing profile with revoked token
    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 401
    assert me_resp.json()["error"]["code"] == "SESSION_REVOKED"


def _get_token_for_user(phone: str, db) -> str:
    db.query(OtpVerification).filter(OtpVerification.phone == phone).delete()
    db.commit()
    client.post("/api/v1/auth/request-otp", json={"phone": phone})
    resp = client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp": settings.DEV_OTP})
    return resp.json()["access_token"]


def test_rbac_guards(db):
    """Verify role-based authorization hierarchy."""
    customer_token = _get_token_for_user("+919999900001", db)  # Asha (customer)
    retailer_token = _get_token_for_user("+919999900021", db)  # Ravi (retailer)
    admin_token = _get_token_for_user("+919999900031", db)  # Meera (community_admin)
    platform_admin_token = _get_token_for_user("+919999900099", db)  # Super Admin

    # 1. Customer user
    h_cust = {"Authorization": f"Bearer {customer_token}"}
    assert client.get("/test-rbac/customer-only", headers=h_cust).status_code == 200
    assert client.get("/test-rbac/retailer-only", headers=h_cust).status_code == 403
    assert client.get("/test-rbac/admin-only", headers=h_cust).status_code == 403
    assert client.get("/test-rbac/platform-admin-only", headers=h_cust).status_code == 403

    # 2. Retailer user (strictly merchant access)
    h_ret = {"Authorization": f"Bearer {retailer_token}"}
    assert client.get("/test-rbac/customer-only", headers=h_ret).status_code == 403
    assert client.get("/test-rbac/retailer-only", headers=h_ret).status_code == 200
    assert client.get("/test-rbac/admin-only", headers=h_ret).status_code == 403
    assert client.get("/test-rbac/platform-admin-only", headers=h_ret).status_code == 403

    # 3. Community Admin user
    h_adm = {"Authorization": f"Bearer {admin_token}"}
    assert client.get("/test-rbac/customer-only", headers=h_adm).status_code == 200
    assert client.get("/test-rbac/admin-only", headers=h_adm).status_code == 200
    assert client.get("/test-rbac/platform-admin-only", headers=h_adm).status_code == 403

    # 4. Platform Admin user (all access)
    h_plt = {"Authorization": f"Bearer {platform_admin_token}"}
    assert client.get("/test-rbac/customer-only", headers=h_plt).status_code == 200
    assert client.get("/test-rbac/retailer-only", headers=h_plt).status_code == 200
    assert client.get("/test-rbac/admin-only", headers=h_plt).status_code == 200
    assert client.get("/test-rbac/platform-admin-only", headers=h_plt).status_code == 200


def test_tenant_isolation(db):
    """Verify cross-community and cross-retailer access boundaries."""
    customer_token = _get_token_for_user("+919999900001", db)  # Asha (Green Meadows)
    retailer_token = _get_token_for_user("+919999900021", db)  # Ravi Mohan (retailer)
    platform_admin_token = _get_token_for_user("+919999900099", db)  # Platform Admin

    green_meadows = db.scalars(select(Community).where(Community.code == "GREEN_MEADOWS")).first()
    lakeview = db.scalars(select(Community).where(Community.code == "LAKEVIEW")).first()
    mohan_kirana = db.scalars(select(Retailer).where(Retailer.store_name.ilike("%Mohan%"))).first()
    dummy_retailer_id = uuid.uuid4()

    # Community Tenant Isolation:
    # Asha belongs to Green Meadows -> 200 OK
    resp_ok = client.get(
        f"/test-rbac/community/{green_meadows.id}",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert resp_ok.status_code == 200

    # Asha does NOT belong to Lakeview -> 403 Forbidden
    resp_forbidden = client.get(
        f"/test-rbac/community/{lakeview.id}",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert resp_forbidden.status_code == 403
    assert resp_forbidden.json()["error"]["code"] == "COMMUNITY_ACCESS_DENIED"

    # Platform Admin can access Lakeview -> 200 OK
    resp_admin = client.get(
        f"/test-rbac/community/{lakeview.id}",
        headers={"Authorization": f"Bearer {platform_admin_token}"},
    )
    assert resp_admin.status_code == 200

    # Retailer Tenant Isolation:
    # Ravi Mohan manages Mohan Kirana -> 200 OK
    resp_ret_ok = client.get(
        f"/test-rbac/retailer/{mohan_kirana.id}",
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert resp_ret_ok.status_code == 200

    # Ravi does not manage dummy retailer -> 403 Forbidden
    resp_ret_denied = client.get(
        f"/test-rbac/retailer/{dummy_retailer_id}",
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert resp_ret_denied.status_code == 403
    assert resp_ret_denied.json()["error"]["code"] == "RETAILER_ACCESS_DENIED"

    # Platform Admin can access any retailer -> 200 OK
    resp_ret_admin = client.get(
        f"/test-rbac/retailer/{dummy_retailer_id}",
        headers={"Authorization": f"Bearer {platform_admin_token}"},
    )
    assert resp_ret_admin.status_code == 200


def test_standardized_error_envelope_structure():
    """Verify that error responses strictly match the C6 envelope standard with details."""
    # 404 test
    resp_404 = client.get("/api/v1/invalid-route")
    assert resp_404.status_code == 404
    data_404 = resp_404.json()
    assert "error" in data_404
    assert data_404["error"]["code"] == "NOT_FOUND"
    assert "message" in data_404["error"]
    assert "details" in data_404["error"]
    assert data_404["error"]["details"] is None

    # 422 test
    resp_422 = client.post("/api/v1/auth/request-otp", json={"phone": "invalid"})
    assert resp_422.status_code == 422
    data_422 = resp_422.json()
    assert "error" in data_422
    assert data_422["error"]["code"] == "VALIDATION_ERROR"
    assert data_422["error"]["details"] is not None


def test_otp_rate_limiting(db):
    """Verify rapid successive OTP requests trigger rate limiting (cooldown)."""
    phone = "+919999900003"

    db.query(OtpVerification).filter(OtpVerification.phone == phone).delete()
    db.commit()

    # First request succeeds
    resp1 = client.post("/api/v1/auth/request-otp", json={"phone": phone})
    assert resp1.status_code == 200

    # Immediate second request triggers cooldown rate limit
    resp2 = client.post("/api/v1/auth/request-otp", json={"phone": phone})
    assert resp2.status_code == 429
    data2 = resp2.json()
    assert data2["error"]["code"] == "RATE_LIMIT_EXCEEDED"
    assert "Please wait" in data2["error"]["message"]
