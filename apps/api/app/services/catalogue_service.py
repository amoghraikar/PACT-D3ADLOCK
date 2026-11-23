import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.core.pagination import PaginatedMeta, PaginatedResponse
from app.models.catalogue import Product
from app.models.inventory import InventoryItem
from app.repositories.catalogue_repository import CatalogueRepository
from app.schemas.catalogue import (
    CategorySummary,
    ProductDetail,
    ProductImageResponse,
    ProductSummary,
    ProductVariantResponse,
)


class CatalogueService:
    @staticmethod
    def get_categories(db: Session) -> list[CategorySummary]:
        results = CatalogueRepository.list_categories(db, active_only=True)
        return [
            CategorySummary(
                id=cat.id,
                name=cat.name,
                slug=cat.slug,
                icon=cat.icon,
                display_order=cat.display_order,
                product_count=count,
            )
            for cat, count in results
        ]

    @staticmethod
    def _format_product_summary(
        product: Product,
        inventory_map: dict[uuid.UUID, int] | None = None,
    ) -> ProductSummary:
        active_variants = [v for v in product.variants if v.is_active]
        prices = [v.default_price_paise for v in active_variants]
        min_price = min(prices) if prices else 0
        max_price = max(prices) if prices else 0

        # Sort images by display_order
        sorted_images = sorted(product.images, key=lambda img: img.display_order)
        primary_img = next((img for img in sorted_images if img.is_primary), None)
        primary_url = (
            primary_img.image_url
            if primary_img
            else (sorted_images[0].image_url if sorted_images else None)
        )

        variant_responses: list[ProductVariantResponse] = []
        has_available_stock = False

        for v in active_variants:
            stock = inventory_map.get(v.id) if inventory_map is not None else None
            is_avail = stock is None or stock > 0
            if is_avail:
                has_available_stock = True
            variant_responses.append(
                ProductVariantResponse(
                    id=v.id,
                    sku=v.sku,
                    title=v.title,
                    unit=v.unit,
                    pack_quantity=v.pack_quantity,
                    mrp_paise=v.mrp_paise,
                    default_price_paise=v.default_price_paise,
                    is_available=is_avail,
                    current_stock_qty=stock,
                )
            )

        return ProductSummary(
            id=product.id,
            title=product.title,
            brand=product.brand,
            description=product.description,
            category_id=product.category_id,
            category_name=product.category.name if product.category else None,
            category_slug=product.category.slug if product.category else None,
            primary_image_url=primary_url,
            min_price_paise=min_price,
            max_price_paise=max_price,
            variants_count=len(active_variants),
            is_available=has_available_stock and len(active_variants) > 0,
            variants=variant_responses,
        )

    @classmethod
    def get_products(
        cls,
        db: Session,
        category_id: uuid.UUID | None = None,
        category_slug: str | None = None,
        search: str | None = None,
        page: int = 1,
        limit: int = 20,
        retailer_id: uuid.UUID | None = None,
    ) -> PaginatedResponse[ProductSummary]:
        offset = (page - 1) * limit
        products, total = CatalogueRepository.list_products(
            db=db,
            category_id=category_id,
            category_slug=category_slug,
            search=search,
            offset=offset,
            limit=limit,
            active_only=True,
        )

        inventory_map: dict[uuid.UUID, int] | None = None
        if retailer_id and products:
            variant_ids = [v.id for p in products for v in p.variants]
            if variant_ids:
                stmt = select(InventoryItem.variant_id, InventoryItem.current_stock_qty).where(
                    InventoryItem.retailer_id == retailer_id,
                    InventoryItem.variant_id.in_(variant_ids),
                )
                inventory_map = dict(db.execute(stmt).all())

        summaries = [cls._format_product_summary(p, inventory_map) for p in products]
        meta = PaginatedMeta.from_total(total=total, page=page, limit=limit)
        return PaginatedResponse(data=summaries, meta=meta)

    @classmethod
    def get_product_detail(
        cls,
        db: Session,
        product_id: uuid.UUID,
        retailer_id: uuid.UUID | None = None,
    ) -> ProductDetail:
        product = CatalogueRepository.get_product_by_id(db, product_id)
        if not product or not product.is_active:
            raise NotFoundError(f"Product {product_id} not found.")

        inventory_map: dict[uuid.UUID, int] | None = None
        if retailer_id:
            variant_ids = [v.id for v in product.variants]
            if variant_ids:
                stmt = select(InventoryItem.variant_id, InventoryItem.current_stock_qty).where(
                    InventoryItem.retailer_id == retailer_id,
                    InventoryItem.variant_id.in_(variant_ids),
                )
                inventory_map = dict(db.execute(stmt).all())

        cat_summary = CategorySummary(
            id=product.category.id,
            name=product.category.name,
            slug=product.category.slug,
            icon=product.category.icon,
            display_order=product.category.display_order,
            product_count=0,
        )

        sorted_images = sorted(product.images, key=lambda img: img.display_order)
        image_responses = [
            ProductImageResponse(
                id=img.id,
                image_url=img.image_url,
                alt_text=img.alt_text,
                display_order=img.display_order,
                is_primary=img.is_primary,
            )
            for img in sorted_images
        ]

        active_variants = [v for v in product.variants if v.is_active]
        variant_responses: list[ProductVariantResponse] = []
        has_stock = False

        for v in active_variants:
            stock = inventory_map.get(v.id) if inventory_map is not None else None
            is_avail = stock is None or stock > 0
            if is_avail:
                has_stock = True
            variant_responses.append(
                ProductVariantResponse(
                    id=v.id,
                    sku=v.sku,
                    title=v.title,
                    unit=v.unit,
                    pack_quantity=v.pack_quantity,
                    mrp_paise=v.mrp_paise,
                    default_price_paise=v.default_price_paise,
                    is_available=is_avail,
                    current_stock_qty=stock,
                )
            )

        return ProductDetail(
            id=product.id,
            title=product.title,
            brand=product.brand,
            description=product.description,
            is_active=product.is_active,
            category=cat_summary,
            images=image_responses,
            variants=variant_responses,
            is_available=has_stock and len(active_variants) > 0,
        )
