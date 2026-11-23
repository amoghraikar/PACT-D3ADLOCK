import uuid

from sqlalchemy.orm import Session

from app.core.pagination import PaginatedMeta, PaginatedResponse
from app.repositories.inventory_repository import InventoryRepository
from app.schemas.inventory import (
    InventoryAdjustmentRequest,
    InventoryAdjustmentResponse,
    InventoryItemResponse,
    InventoryMovementResponse,
    StockInwardRequest,
    StockInwardResponse,
)


class InventoryService:
    @staticmethod
    def get_inventory(
        db: Session,
        retailer_id: uuid.UUID,
        low_stock_only: bool = False,
        search: str | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> PaginatedResponse[InventoryItemResponse]:
        offset = (page - 1) * limit
        items, total = InventoryRepository.list_inventory(
            db=db,
            retailer_id=retailer_id,
            low_stock_only=low_stock_only,
            search=search,
            offset=offset,
            limit=limit,
        )

        data = [
            InventoryItemResponse(
                id=item.id,
                retailer_id=item.retailer_id,
                variant_id=item.variant_id,
                variant_title=item.variant.title,
                variant_sku=item.variant.sku,
                variant_unit=item.variant.unit,
                product_title=item.variant.product.title,
                product_brand=item.variant.product.brand,
                current_stock_qty=item.current_stock_qty,
                reserved_stock_qty=item.reserved_stock_qty,
                available_stock_qty=max(0, item.current_stock_qty - item.reserved_stock_qty),
                reorder_level_qty=item.reorder_level_qty,
                is_low_stock=item.current_stock_qty <= item.reorder_level_qty,
                is_active=item.is_active,
                updated_at=item.updated_at,
            )
            for item in items
        ]

        meta = PaginatedMeta.from_total(total=total, page=page, limit=limit)
        return PaginatedResponse(data=data, meta=meta)

    @staticmethod
    def inward_stock(
        db: Session,
        retailer_id: uuid.UUID,
        payload: StockInwardRequest,
    ) -> StockInwardResponse:
        batch, item = InventoryRepository.inward_stock(
            db=db,
            retailer_id=retailer_id,
            variant_id=payload.variant_id,
            batch_number=payload.batch_number,
            quantity=payload.quantity,
            cost_price_paise=payload.cost_price_paise,
            expiry_date=payload.expiry_date,
            supplier_name=payload.supplier_name,
        )
        return StockInwardResponse(
            message="Stock successfully inwarded",
            batch_id=batch.id,
            variant_id=batch.variant_id,
            inward_quantity=batch.quantity,
            new_stock_qty=item.current_stock_qty,
        )

    @staticmethod
    def adjust_stock(
        db: Session,
        retailer_id: uuid.UUID,
        inventory_id: uuid.UUID,
        payload: InventoryAdjustmentRequest,
        user_id: uuid.UUID | None = None,
    ) -> InventoryAdjustmentResponse:
        item, prev_qty, new_qty = InventoryRepository.adjust_stock(
            db=db,
            retailer_id=retailer_id,
            inventory_id=inventory_id,
            quantity_delta=payload.quantity_delta,
            reason=payload.reason,
            user_id=user_id,
            reference_id=payload.reference_id,
        )
        return InventoryAdjustmentResponse(
            message="Inventory stock adjusted successfully",
            inventory_id=item.id,
            previous_stock_qty=prev_qty,
            new_stock_qty=new_qty,
            quantity_delta=payload.quantity_delta,
        )

    @staticmethod
    def get_movements(
        db: Session,
        retailer_id: uuid.UUID,
        page: int = 1,
        limit: int = 20,
    ) -> PaginatedResponse[InventoryMovementResponse]:
        offset = (page - 1) * limit
        movements, total = InventoryRepository.list_movements(
            db=db,
            retailer_id=retailer_id,
            offset=offset,
            limit=limit,
        )

        data = [
            InventoryMovementResponse(
                id=m.id,
                retailer_id=m.retailer_id,
                variant_id=m.variant_id,
                movement_type=m.movement_type,
                quantity_delta=m.quantity_delta,
                reference_id=m.reference_id,
                created_at=m.created_at,
            )
            for m in movements
        ]

        meta = PaginatedMeta.from_total(total=total, page=page, limit=limit)
        return PaginatedResponse(data=data, meta=meta)
