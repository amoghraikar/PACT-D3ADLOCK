import json
import uuid
from typing import Any

from sqlalchemy import case, distinct, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.clock import now_utc
from app.models.billing import Invoice, RetailerBill
from app.models.catalogue import Product, ProductVariant
from app.models.commerce import (
    BulkOrder,
    BulkOrderItem,
    CommunityCartItem,
    RetailerPackingItem,
)
from app.models.inventory import InventoryItem
from app.models.organization import Retailer
from app.models.system import AuditLog


class RetailerOrderRepository:
    @staticmethod
    def get_orders_list(
        db: Session,
        retailer_id: uuid.UUID,
        status: str | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[BulkOrder], int, dict[uuid.UUID, int]]:
        """
        Fetch paginated bulk orders for a retailer, optionally filtered by status.
        Also returns total count and a map of cycle_id -> participating households count.
        """
        query = (
            select(BulkOrder)
            .options(
                selectinload(BulkOrder.community),
                selectinload(BulkOrder.cycle),
            )
            .where(BulkOrder.retailer_id == retailer_id)
        )

        count_query = (
            select(func.count(BulkOrder.id)).where(BulkOrder.retailer_id == retailer_id)
        )

        if status:
            norm_status = status.strip().upper()
            query = query.where(func.upper(BulkOrder.status) == norm_status)
            count_query = count_query.where(func.upper(BulkOrder.status) == norm_status)

        total = db.scalar(count_query) or 0

        orders = list(
            db.scalars(
                query.order_by(BulkOrder.placed_at.desc())
                .offset((page - 1) * limit)
                .limit(limit)
            ).all()
        )

        # Batch query participating households count for each cycle
        cycle_ids = [order.cycle_id for order in orders if order.cycle_id]
        households_map: dict[uuid.UUID, int] = {}
        if cycle_ids:
            h_stmt = (
                select(
                    CommunityCartItem.cycle_id,
                    func.count(distinct(CommunityCartItem.user_id)),
                )
                .where(CommunityCartItem.cycle_id.in_(cycle_ids))
                .group_by(CommunityCartItem.cycle_id)
            )
            for cid, count in db.execute(h_stmt).all():
                households_map[cid] = count

        return orders, total, households_map

    @staticmethod
    def get_order_by_id(
        db: Session,
        order_id: uuid.UUID,
        retailer_id: uuid.UUID | None = None,
        for_update: bool = False,
    ) -> BulkOrder | None:
        """
        Fetch a single bulk order with all items, variant details, packing records, and bill.
        Optionally locks the row for atomic updates.
        """
        stmt = (
            select(BulkOrder)
            .options(
                selectinload(BulkOrder.community),
                selectinload(BulkOrder.cycle),
                selectinload(BulkOrder.retailer_bill),
                selectinload(BulkOrder.items)
                .selectinload(BulkOrderItem.variant)
                .selectinload(ProductVariant.product)
                .selectinload(Product.category),
                selectinload(BulkOrder.items)
                .selectinload(BulkOrderItem.packing_records),
            )
            .where(BulkOrder.id == order_id)
        )
        if retailer_id:
            stmt = stmt.where(BulkOrder.retailer_id == retailer_id)
        if for_update:
            stmt = stmt.with_for_update()

        return db.scalars(stmt).first()

    @staticmethod
    def get_participating_households_count(db: Session, cycle_id: uuid.UUID) -> int:
        stmt = select(func.count(distinct(CommunityCartItem.user_id))).where(
            CommunityCartItem.cycle_id == cycle_id
        )
        return db.scalar(stmt) or 0

    @staticmethod
    def record_packing(
        db: Session,
        bulk_order_item_id: uuid.UUID,
        packed_qty: int,
        batch_id: uuid.UUID | None = None,
        notes: str | None = None,
    ) -> RetailerPackingItem:
        record = RetailerPackingItem(
            bulk_order_item_id=bulk_order_item_id,
            batch_id=batch_id,
            packed_qty=packed_qty,
            notes=notes,
            packed_at=now_utc(),
        )
        db.add(record)
        return record

    @staticmethod
    def log_audit(
        db: Session,
        action: str,
        entity_type: str,
        entity_id: str | uuid.UUID,
        user_id: uuid.UUID | None = None,
        payload_before: Any | None = None,
        payload_after: Any | None = None,
    ) -> AuditLog:
        audit = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            payload_before=json.dumps(payload_before, default=str) if payload_before else None,
            payload_after=json.dumps(payload_after, default=str) if payload_after else None,
            created_at=now_utc(),
        )
        db.add(audit)
        return audit

    @staticmethod
    def get_dashboard_metrics(
        db: Session, retailer_id: uuid.UUID
    ) -> dict[str, Any]:
        """
        Aggregate operational and financial metrics for a retailer:
        - Total orders
        - Pending orders
        - Orders being packed (ACCEPTED + PACKING)
        - Monthly sales paise
        - Gross order value paise
        - Outstanding collections paise
        - Inventory low-stock alerts
        """
        # Retailer name
        retailer = db.get(Retailer, retailer_id)
        retailer_name = retailer.store_name if retailer else "Unknown Retailer"

        # Bulk orders aggregation
        all_orders_stmt = select(
            func.count(BulkOrder.id).label("total_orders"),
            func.sum(
                case((func.upper(BulkOrder.status) == "PENDING", 1), else_=0)
            ).label("pending_orders"),
            func.sum(
                case(
                    (func.upper(BulkOrder.status).in_(["ACCEPTED", "PACKING"]), 1),
                    else_=0,
                )
            ).label("packing_orders"),
            func.sum(
                case(
                    (func.upper(BulkOrder.status) != "REJECTED", BulkOrder.total_paise),
                    else_=0,
                )
            ).label("gross_order_value_paise"),
        ).where(BulkOrder.retailer_id == retailer_id)

        agg = db.execute(all_orders_stmt).one()

        # Monthly sales from finalized RetailerBills
        current_year_month = now_utc().strftime("%Y-%m")
        monthly_sales_stmt = select(
            func.coalesce(func.sum(RetailerBill.net_amount_paise), 0)
        ).where(
            RetailerBill.retailer_id == retailer_id,
            func.to_char(RetailerBill.issued_at, "YYYY-MM") == current_year_month,
        )
        monthly_sales_paise = db.scalar(monthly_sales_stmt) or 0

        # Outstanding collections from Invoices on orders fulfilled by this retailer
        outstanding_stmt = (
            select(
                func.coalesce(
                    func.sum(Invoice.total_amount_paise - Invoice.paid_amount_paise),
                    0,
                )
            )
            .join(BulkOrder, Invoice.bulk_order_id == BulkOrder.id)
            .where(
                BulkOrder.retailer_id == retailer_id,
                Invoice.status.in_(["pending", "unlocked", "partially_paid"]),
            )
        )
        outstanding_paise = db.scalar(outstanding_stmt) or 0

        # Low stock inventory alerts count
        alerts_stmt = select(func.count(InventoryItem.id)).where(
            InventoryItem.retailer_id == retailer_id,
            InventoryItem.current_stock_qty <= InventoryItem.reorder_level_qty,
        )
        inventory_alerts = db.scalar(alerts_stmt) or 0

        return {
            "retailer_id": retailer_id,
            "retailer_name": retailer_name,
            "total_orders": agg.total_orders or 0,
            "pending_orders": agg.pending_orders or 0,
            "orders_being_packed": agg.packing_orders or 0,
            "monthly_sales_paise": monthly_sales_paise,
            "gross_order_value_paise": agg.gross_order_value_paise or 0,
            "outstanding_collections_paise": outstanding_paise,
            "inventory_alerts": inventory_alerts,
        }
