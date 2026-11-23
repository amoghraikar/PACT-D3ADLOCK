"""
Catalogue Module Router:
- Browse categories
- Search, filter, and paginate products
- View product variants, pricing, and availability
"""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.pagination import PaginatedResponse
from app.schemas.catalogue import CategorySummary, ProductDetail, ProductSummary
from app.services.catalogue_service import CatalogueService

router = APIRouter()


@router.get(
    "/categories",
    response_model=list[CategorySummary],
    summary="List all active grocery categories with product counts",
)
def get_categories(
    db: Session = Depends(get_db),
) -> list[CategorySummary]:
    """Retrieve all 12 active grocery categories ordered by display order."""
    return CatalogueService.get_categories(db=db)


@router.get(
    "/products",
    response_model=PaginatedResponse[ProductSummary],
    summary="Browse and search products with pagination and category filters",
)
def get_products(
    category_id: uuid.UUID | None = Query(default=None, description="Filter by Category UUID"),
    category_slug: str | None = Query(
        default=None, description="Filter by Category Slug (e.g. rice-grains)"
    ),
    search: str | None = Query(
        default=None, description="Search keyword in title, brand, or description"
    ),
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(default=20, ge=1, le=100, description="Items per page"),
    retailer_id: uuid.UUID | None = Query(
        default=None, description="Optional retailer ID for live stock availability"
    ),
    db: Session = Depends(get_db),
) -> PaginatedResponse[ProductSummary]:
    """
    Search and paginate through the grocery catalogue. Eagerly loads variants, images,
    and calculates price ranges in integer paise.
    """
    return CatalogueService.get_products(
        db=db,
        category_id=category_id,
        category_slug=category_slug,
        search=search,
        page=page,
        limit=limit,
        retailer_id=retailer_id,
    )


@router.get(
    "/products/{id}",
    response_model=ProductDetail,
    summary="Get detailed product information with all variants and images",
)
def get_product_detail(
    id: uuid.UUID,
    retailer_id: uuid.UUID | None = Query(
        default=None, description="Optional retailer ID for live stock availability"
    ),
    db: Session = Depends(get_db),
) -> ProductDetail:
    """Retrieve product details by UUID, including pack sizes, units, and images."""
    return CatalogueService.get_product_detail(
        db=db,
        product_id=id,
        retailer_id=retailer_id,
    )
