from uuid import UUID

from pydantic import BaseModel, Field, field_validator


def normalize_phone(phone: str) -> str:
    """Normalize phone number to canonical E.164 Indian format (+91XXXXXXXXXX)."""
    cleaned = "".join(ch for ch in phone if ch.isdigit() or ch == "+")
    if cleaned.startswith("+91") and len(cleaned) == 13 and cleaned[3] in "6789":
        return cleaned
    if cleaned.startswith("91") and len(cleaned) == 12 and cleaned[2] in "6789":
        return f"+{cleaned}"
    if cleaned.startswith("0") and len(cleaned) == 11 and cleaned[1] in "6789":
        return f"+91{cleaned[1:]}"
    if len(cleaned) == 10 and cleaned[0] in "6789":
        return f"+91{cleaned}"
    # Allow general E.164 format for international or test numbers
    if cleaned.startswith("+") and 10 <= len(cleaned) <= 15:
        return cleaned
    raise ValueError(
        "Invalid phone number. Must be a valid mobile number (e.g. 9876543210 or +919876543210)."
    )


class OtpRequest(BaseModel):
    phone: str = Field(..., description="Mobile number in Indian 10-digit or E.164 format")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return normalize_phone(v)


class OtpRequestResponse(BaseModel):
    message: str
    phone: str
    expires_in_seconds: int
    dev_otp: str | None = Field(
        default=None,
        description="Provided strictly in non-production environments when dev OTP is active",
    )


class OtpVerifyRequest(BaseModel):
    phone: str = Field(..., description="Mobile number")
    otp: str = Field(..., min_length=4, max_length=8, description="4 to 8 digit OTP")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return normalize_phone(v)

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped.isdigit():
            raise ValueError("OTP must contain only digits")
        return v_stripped


class CommunityBrief(BaseModel):
    id: UUID
    name: str
    code: str
    role: str = "resident"
    building_name: str | None = None
    unit_number: str | None = None


class UserSummary(BaseModel):
    id: UUID
    phone: str
    email: str | None = None
    full_name: str
    role: str
    language: str = "en"
    is_active: bool = True
    communities: list[CommunityBrief] = []
    retailer_id: UUID | None = None


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserSummary


class LogoutResponse(BaseModel):
    message: str = "Successfully logged out"
