from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

client = TestClient(app)


def test_request_and_verify_dev_otp():
    # 1. Request OTP
    resp = client.post(f"{settings.API_PREFIX}/auth/otp/request", json={"phone": "+919999900001"})
    assert resp.status_code == 200
    assert resp.json()["phone"] == "+919999900001"

    # 2. Verify with dev code 000000
    resp = client.post(
        f"{settings.API_PREFIX}/auth/otp/verify",
        json={"phone": "+919999900001", "code": "000000"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["user"]["name"] == "Asha Rao"
    assert data["user"]["role"] == "customer"
    assert "token" in data
    assert settings.SESSION_COOKIE_NAME in resp.cookies

    # 3. GET /me with cookie
    resp = client.get(f"{settings.API_PREFIX}/auth/me")
    assert resp.status_code == 200
    assert resp.json()["user"]["name"] == "Asha Rao"
    assert resp.json()["membership"]["community"]["code"] == "GREEN"

    # 4. Logout
    resp = client.post(f"{settings.API_PREFIX}/auth/logout")
    assert resp.status_code == 200

    # 5. GET /me now fails with 401
    resp = client.get(f"{settings.API_PREFIX}/auth/me")
    assert resp.status_code == 401


def test_onboarding_resident():
    # Verify a new phone
    new_phone = "+919876543210"
    from app.modules.auth.router import USERS, _persist_users
    USERS.pop(new_phone, None)
    _persist_users()

    client.post(f"{settings.API_PREFIX}/auth/otp/request", json={"phone": new_phone})
    resp = client.post(
        f"{settings.API_PREFIX}/auth/otp/verify",
        json={"phone": new_phone, "code": "000000"},
    )
    assert resp.status_code == 200
    assert resp.json()["user"]["role"] is None

    # Onboard resident to Green Meadows
    resp = client.post(
        f"{settings.API_PREFIX}/onboarding/resident",
        json={"join_code": "GREEN1", "name": "Kavita Singh", "unit_label": "C-102"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["user"]["role"] == "customer"
    assert data["user"]["name"] == "Kavita Singh"
    assert data["membership"]["community"]["name"] == "Green Meadows Apartments"

    # Cleanup test phone
    USERS.pop(new_phone, None)
    _persist_users()


def test_register_resident_and_retailer_endpoints():
    test_res_phone = "+919876543299"
    from app.modules.auth.router import USERS, _persist_users
    USERS.pop(test_res_phone, None)

    # Register resident
    resp = client.post(
        f"{settings.API_PREFIX}/auth/register/resident",
        json={"name": "Pooja Hegde", "phone": test_res_phone, "join_code": "GREEN1", "unit_label": "E-501"},
    )
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["user"]["name"] == "Pooja Hegde"
    assert res_data["user"]["role"] == "customer"

    # Verify persistent login
    verify_resp = client.post(
        f"{settings.API_PREFIX}/auth/otp/verify",
        json={"phone": test_res_phone, "code": "000000"},
    )
    assert verify_resp.status_code == 200
    assert verify_resp.json()["user"]["name"] == "Pooja Hegde"
    assert verify_resp.json()["user"]["role"] == "customer"

    # Register retailer
    test_ret_phone = "+919876543288"
    USERS.pop(test_ret_phone, None)
    resp = client.post(
        f"{settings.API_PREFIX}/auth/register/retailer",
        json={"name": "Anil Gupta", "store_name": "Gupta Supermart", "phone": test_ret_phone, "address": "Indiranagar 100ft Road"},
    )
    assert resp.status_code == 200
    ret_data = resp.json()
    assert ret_data["user"]["name"] == "Anil Gupta"
    assert ret_data["user"]["role"] == "retailer"

    # Verify persistent login for retailer
    verify_ret = client.post(
        f"{settings.API_PREFIX}/auth/otp/verify",
        json={"phone": test_ret_phone, "code": "000000"},
    )
    assert verify_ret.status_code == 200
    assert verify_ret.json()["user"]["role"] == "retailer"
    assert verify_ret.json()["retailer"]["store_name"] == "Gupta Supermart"

    # Cleanup
    USERS.pop(test_res_phone, None)
    USERS.pop(test_ret_phone, None)
    _persist_users()
