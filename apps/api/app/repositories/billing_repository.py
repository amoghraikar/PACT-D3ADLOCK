import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.clock import now_utc
from app.models.billing import DiscountAllocation, Invoice, InvoiceItem, RetailerBill
from app.models.commerce import BulkOrder, BulkOrderItem


class BillingRepository:
    @staticmethod
    def get_bulk_order(
        db: Session, order_id: uuid.UUID, for_update: bool = False
    ) -> BulkOrder | None:
        stmt = (
            select(BulkOrder)
            .options(
                selectinload(BulkOrder.items).selectinload(BulkOrderItem.variant),
                selectinload(BulkOrder.retailer_bill),
                selectinload(BulkOrder.invoices),
            )
            .where(BulkOrder.id == order_id)
        )
        if for_update:
            stmt = stmt.with_for_update()
        return db.scalars(stmt).first()

    @staticmethod
    def get_retailer_bill_by_id(db: Session, bill_id: uuid.UUID) -> RetailerBill | None:
        stmt = (
            select(RetailerBill)
            .where(RetailerBill.id == bill_id)
        )
        return db.scalars(stmt).first()

    @staticmethod
    def get_retailer_bill_by_order_id(
        db: Session, order_id: uuid.UUID
    ) -> RetailerBill | None:
        stmt = select(RetailerBill).where(RetailerBill.bulk_order_id == order_id)
        return db.scalars(stmt).first()

    @staticmethod
    def get_invoice_by_id(
        db: Session, invoice_id: uuid.UUID
    ) -> Invoice | None:
        stmt = (
            select(Invoice)
            .options(
                selectinload(Invoice.items).selectinload(InvoiceItem.variant),
                selectinload(Invoice.discounts),
            )
            .where(Invoice.id == invoice_id)
        )
        return db.scalars(stmt).first()

    @staticmethod
    def get_user_invoices(
        db: Session, user_id: uuid.UUID, community_id: uuid.UUID | None = None
    ) -> list[Invoice]:
        stmt = (
            select(Invoice)
            .options(
                selectinload(Invoice.items),
                selectinload(Invoice.discounts),
            )
            .where(Invoice.user_id == user_id)
        )
        if community_id:
            stmt = stmt.where(Invoice.community_id == community_id)
        stmt = stmt.order_by(Invoice.created_at.desc())
        return list(db.scalars(stmt).all())

    @staticmethod
    def save_retailer_bill(
        db: Session,
        bulk_order_id: uuid.UUID,
        retailer_id: uuid.UUID,
        community_id: uuid.UUID,
        gross_amount_paise: int,
        discount_amount_paise: int,
        delivery_amount_paise: int,
        net_amount_paise: int,
        bill_number: str | None = None,
        finalized_at: datetime | None = None,
    ) -> RetailerBill:
        if not bill_number:
            bill_number = f"PACT-RB-{uuid.uuid4().hex[:8].upper()}"

        bill = RetailerBill(
            bulk_order_id=bulk_order_id,
            retailer_id=retailer_id,
            community_id=community_id,
            bill_number=bill_number,
            gross_amount_paise=gross_amount_paise,
            discount_amount_paise=discount_amount_paise,
            delivery_amount_paise=delivery_amount_paise,
            net_amount_paise=net_amount_paise,
            status="finalized",
            issued_at=now_utc(),
            finalized_at=finalized_at or now_utc(),
        )
        db.add(bill)
        return bill

    @staticmethod
    def save_invoice_with_items(
        db: Session,
        bulk_order_id: uuid.UUID,
        user_id: uuid.UUID,
        community_id: uuid.UUID,
        invoice_number: str,
        base_amount_paise: int,
        discount_amount_paise: int,
        delivery_fee_paise: int,
        total_amount_paise: int,
        items_data: list[dict],
        discounts_data: list[dict],
    ) -> Invoice:
        invoice = Invoice(
            bulk_order_id=bulk_order_id,
            user_id=user_id,
            community_id=community_id,
            invoice_number=invoice_number,
            base_amount_paise=base_amount_paise,
            discount_amount_paise=discount_amount_paise,
            delivery_fee_paise=delivery_fee_paise,
            total_amount_paise=total_amount_paise,
            paid_amount_paise=0,
            status="pending",
            created_at=now_utc(),
        )
        db.add(invoice)
        db.flush()

        for idata in items_data:
            item = InvoiceItem(
                invoice_id=invoice.id,
                variant_id=idata["variant_id"],
                requested_qty=idata["requested_qty"],
                packed_qty=idata["packed_qty"],
                unit_price_paise=idata["unit_price_paise"],
                line_total_paise=idata["line_total_paise"],
            )
            db.add(item)

        for ddata in discounts_data:
            disc = DiscountAllocation(
                invoice_id=invoice.id,
                discount_type=ddata["discount_type"],
                amount_paise=ddata["amount_paise"],
                description=ddata.get("description"),
            )
            db.add(disc)

        return invoice
