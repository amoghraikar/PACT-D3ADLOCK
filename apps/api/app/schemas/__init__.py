from app.schemas.auth import (
    AuthTokenResponse,
    CommunityBrief,
    LogoutResponse,
    OtpRequest,
    OtpRequestResponse,
    OtpVerifyRequest,
    UserSummary,
    normalize_phone,
)
from app.schemas.catalogue import (
    CategorySummary,
    ProductDetail,
    ProductImageResponse,
    ProductSummary,
    ProductVariantResponse,
)
from app.schemas.inventory import (
    InventoryAdjustmentRequest,
    InventoryAdjustmentResponse,
    InventoryItemResponse,
    InventoryMovementResponse,
    StockInwardRequest,
    StockInwardResponse,
)

__all__ = [
    "normalize_phone",
    "OtpRequest",
    "OtpRequestResponse",
    "OtpVerifyRequest",
    "CommunityBrief",
    "UserSummary",
    "AuthTokenResponse",
    "LogoutResponse",
    "CategorySummary",
    "ProductImageResponse",
    "ProductVariantResponse",
    "ProductSummary",
    "ProductDetail",
    "InventoryItemResponse",
    "StockInwardRequest",
    "StockInwardResponse",
    "InventoryAdjustmentRequest",
    "InventoryAdjustmentResponse",
    "InventoryMovementResponse",
]
