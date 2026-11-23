import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.catalogue import Category, Product, ProductVariant


class CatalogueRepository:
    @staticmethod
    def list_categories(db: Session, active_only: bool = True) -> list[tuple[Category, int]]:
        """Return categories with their active product counts, ordered by display_order."""
        stmt = (
            select(Category, func.count(Product.id).label("product_count"))
            .outerjoin(
                Product,
                (Product.category_id == Category.id) & (Product.is_active.is_(True)),
            )
            .group_by(Category.id)
            .order_by(Category.display_order.asc(), Category.name.asc())
        )
        if active_only:
            stmt = stmt.where(Category.is_active.is_(True))

        results = db.execute(stmt).all()
        return [(cat, count) for cat, count in results]

    @staticmethod
    def get_category_by_id_or_slug(db: Session, identifier: str) -> Category | None:
        try:
            val_uuid = uuid.UUID(identifier)
            stmt = select(Category).where(Category.id == val_uuid)
        except ValueError:
            stmt = select(Category).where(Category.slug == identifier)
        return db.scalars(stmt).first()

    @staticmethod
    def list_products(
        db: Session,
        category_id: uuid.UUID | None = None,
        category_slug: str | None = None,
        search: str | None = None,
        offset: int = 0,
        limit: int = 20,
        active_only: bool = True,
    ) -> tuple[list[Product], int]:
        """
        List products with filtering, full-text-like search on title/brand, and pagination.
        Eagerly loads variants, images, and category to prevent N+1 query problems.
        """
        base_query = (
            select(Product)
            .join(Product.category)
            .options(
                joinedload(Product.category),
                selectinload(Product.variants),
                selectinload(Product.images),
            )
        )

        if active_only:
            base_query = base_query.where(Product.is_active.is_(True))

        if category_id:
            base_query = base_query.where(Product.category_id == category_id)
        elif category_slug:
            base_query = base_query.where(Category.slug == category_slug)

        if search:
            search_pattern = f"%{search.strip()}%"
            base_query = base_query.where(
                or_(
                    Product.title.ilike(search_pattern),
                    Product.brand.ilike(search_pattern),
                    Product.description.ilike(search_pattern),
                )
            )

        # Count total matching
        count_stmt = select(func.count()).select_from(base_query.subquery())
        total = db.scalar(count_stmt) or 0

        # Fetch page
        page_stmt = base_query.order_by(Product.title.asc()).offset(offset).limit(limit)
        products = db.scalars(page_stmt).all()

        return products, total

    @staticmethod
    def get_product_by_id(db: Session, product_id: uuid.UUID) -> Product | None:
        stmt = (
            select(Product)
            .options(
                joinedload(Product.category),
                selectinload(Product.variants),
                selectinload(Product.images),
            )
            .where(Product.id == product_id)
        )
        return db.scalars(stmt).first()

    @staticmethod
    def get_variant_by_id(db: Session, variant_id: uuid.UUID) -> ProductVariant | None:
        stmt = (
            select(ProductVariant)
            .options(joinedload(ProductVariant.product).joinedload(Product.category))
            .where(ProductVariant.id == variant_id)
        )
        return db.scalars(stmt).first()
