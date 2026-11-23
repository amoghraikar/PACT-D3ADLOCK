import uuid
from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.clock import now_utc
from app.core.errors import NotFoundError, ValidationError
from app.models.catalogue import Product, ProductVariant
from app.models.inventory import InventoryItem, InventoryMovement, StockBatch
from app.models.system import AuditLog


class InventoryRepository:
    @staticmethod
    def list_inventory(
        db: Session,
        retailer_id: uuid.UUID,
        low_stock_only: bool = False,
        search: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[InventoryItem], int]:
        """
        List inventory items for a retailer with low-stock detection, search, and pagination.
        """
        query = (
            select(InventoryItem)
            .join(InventoryItem.variant)
            .join(ProductVariant.product)
            .options(
                joinedload(InventoryItem.variant).joinedload(ProductVariant.product),
            )
            .where(InventoryItem.retailer_id == retailer_id)
        )

        if low_stock_only:
            # Low stock condition: current_stock_qty <= reorder_level_qty
            query = query.where(InventoryItem.current_stock_qty <= InventoryItem.reorder_level_qty)

        if search:
            search_pattern = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Product.title.ilike(search_pattern),
                    Product.brand.ilike(search_pattern),
                    ProductVariant.title.ilike(search_pattern),
                    ProductVariant.sku.ilike(search_pattern),
                )
            )

        # Count total
        count_stmt = select(func.count()).select_from(query.subquery())
        total = db.scalar(count_stmt) or 0

        # Order by low stock first, then variant title
        order_stmt = query.order_by(
            (InventoryItem.current_stock_qty <= InventoryItem.reorder_level_qty).desc(),
            Product.title.asc(),
        )
        items = db.scalars(order_stmt.offset(offset).limit(limit)).all()

        return items, total

    @staticmethod
    def get_inventory_item(
        db: Session, retailer_id: uuid.UUID, inventory_id: uuid.UUID
    ) -> InventoryItem | None:
        stmt = (
            select(InventoryItem)
            .options(joinedload(InventoryItem.variant).joinedload(ProductVariant.product))
            .where(InventoryItem.retailer_id == retailer_id)
            .where(InventoryItem.id == inventory_id)
        )
        return db.scalars(stmt).first()

    @staticmethod
    def get_inventory_by_variant(
        db: Session, retailer_id: uuid.UUID, variant_id: uuid.UUID
    ) -> InventoryItem | None:
        stmt = (
            select(InventoryItem)
            .options(joinedload(InventoryItem.variant).joinedload(ProductVariant.product))
            .where(InventoryItem.retailer_id == retailer_id)
            .where(InventoryItem.variant_id == variant_id)
        )
        return db.scalars(stmt).first()

    @staticmethod
    def inward_stock(
        db: Session,
        retailer_id: uuid.UUID,
        variant_id: uuid.UUID,
        batch_number: str,
        quantity: int,
        cost_price_paise: int,
        expiry_date: datetime | None = None,
        supplier_name: str | None = None,
    ) -> tuple[StockBatch, InventoryItem]:
        """
        Record a stock inward batch, increment retailer inventory item,
        and log the stock movement.
        """
        variant = db.get(ProductVariant, variant_id)
        if not variant:
            raise NotFoundError(f"Product variant {variant_id} does not exist.")

        # 1. Create StockBatch
        batch = StockBatch(
            retailer_id=retailer_id,
            variant_id=variant_id,
            batch_number=batch_number,
            quantity=quantity,
            cost_price_paise=cost_price_paise,
            expiry_date=expiry_date,
            supplier_name=supplier_name,
            inward_date=now_utc(),
        )
        db.add(batch)

        # 2. Get or create InventoryItem for retailer + variant
        inv_stmt = select(InventoryItem).where(
            InventoryItem.retailer_id == retailer_id,
            InventoryItem.variant_id == variant_id,
        )
        inv_item = db.scalars(inv_stmt).first()
        if not inv_item:
            inv_item = InventoryItem(
                retailer_id=retailer_id,
                variant_id=variant_id,
                current_stock_qty=quantity,
                reserved_stock_qty=0,
                reorder_level_qty=10,
                is_active=True,
            )
            db.add(inv_item)
        else:
            inv_item.current_stock_qty += quantity
            inv_item.updated_at = now_utc()

        # 3. Record InventoryMovement
        movement = InventoryMovement(
            retailer_id=retailer_id,
            variant_id=variant_id,
            movement_type="inward",
            quantity_delta=quantity,
            reference_id=batch_number,
            created_at=now_utc(),
        )
        db.add(movement)

        db.commit()
        db.refresh(batch)
        db.refresh(inv_item)
        return batch, inv_item

    @staticmethod
    def adjust_stock(
        db: Session,
        retailer_id: uuid.UUID,
        inventory_id: uuid.UUID,
        quantity_delta: int,
        reason: str,
        user_id: uuid.UUID | None = None,
        reference_id: str | None = None,
    ) -> tuple[InventoryItem, int, int]:
        """
        Adjust stock quantity (positive or negative) with validation against negative stock,
        records an inventory movement, and creates an audit log entry.
        """
        inv_item = InventoryRepository.get_inventory_item(db, retailer_id, inventory_id)
        if not inv_item:
            raise NotFoundError("Inventory item not found for this retailer.")

        previous_qty = inv_item.current_stock_qty
        new_qty = previous_qty + quantity_delta

        if new_qty < 0:
            raise ValidationError(
                f"Cannot reduce stock below zero. Current stock: {previous_qty}, adjustment: {quantity_delta}",
                code="INSUFFICIENT_STOCK",
            )

        inv_item.current_stock_qty = new_qty
        inv_item.updated_at = now_utc()

        # Record movement
        movement_type = "adjustment" if quantity_delta > 0 else "spoilage"
        movement = InventoryMovement(
            retailer_id=retailer_id,
            variant_id=inv_item.variant_id,
            movement_type=movement_type,
            quantity_delta=quantity_delta,
            reference_id=reference_id or reason[:80],
            created_at=now_utc(),
        )
        db.add(movement)

        # Record AuditLog
        audit = AuditLog(
            user_id=user_id,
            action="INVENTORY_ADJUSTMENT",
            entity_type="InventoryItem",
            entity_id=str(inv_item.id),
            payload_before=f'{{"stock_qty": {previous_qty}}}',
            payload_after=f'{{"stock_qty": {new_qty}, "delta": {quantity_delta}, "reason": "{reason}"}}',
            created_at=now_utc(),
        )
        db.add(audit)

        db.commit()
        db.refresh(inv_item)
        return inv_item, previous_qty, new_qty

    @staticmethod
    def list_movements(
        db: Session,
        retailer_id: uuid.UUID,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[InventoryMovement], int]:
        """Return stock movement history for a retailer ordered by latest first."""
        base_query = (
            select(InventoryMovement)
            .where(InventoryMovement.retailer_id == retailer_id)
            .order_by(InventoryMovement.created_at.desc())
        )

        count_stmt = select(func.count()).select_from(base_query.subquery())
        total = db.scalar(count_stmt) or 0

        movements = db.scalars(base_query.offset(offset).limit(limit)).all()
        return movements, total
