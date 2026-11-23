import uuid

from pydantic import BaseModel


class CategorySummary(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    icon: str | None = None
    display_order: int = 0
    product_count: int = 0


class ProductImageResponse(BaseModel):
    id: uuid.UUID
    image_url: str
    alt_text: str | None = None
    display_order: int = 0
    is_primary: bool = False


class ProductVariantResponse(BaseModel):
    id: uuid.UUID
    sku: str
    title: str
    unit: str
    pack_quantity: int = 1
    mrp_paise: int
    default_price_paise: int
    is_available: bool = True
    current_stock_qty: int | None = None


class ProductSummary(BaseModel):
    id: uuid.UUID
    title: str
    brand: str | None = None
    description: str | None = None
    category_id: uuid.UUID
    category_name: str | None = None
    category_slug: str | None = None
    primary_image_url: str | None = None
    min_price_paise: int
    max_price_paise: int
    variants_count: int
    is_available: bool = True
    variants: list[ProductVariantResponse] = []


class ProductDetail(BaseModel):
    id: uuid.UUID
    title: str
    brand: str | None = None
    description: str | None = None
    is_active: bool = True
    category: CategorySummary
    images: list[ProductImageResponse] = []
    variants: list[ProductVariantResponse] = []
    is_available: bool = True
