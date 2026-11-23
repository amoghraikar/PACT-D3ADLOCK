import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.clock import now_utc
from app.models.base import Base, uuid_pk

if TYPE_CHECKING:
    from app.models.catalogue import ProductVariant
    from app.models.commerce import BulkOrder
    from app.models.delivery import DeliveryHandover
    from app.models.identity import User
    from app.models.organization import Community, Retailer


class RetailerBill(Base):
    __tablename__ = "retailer_bills"

    id: Mapped[uuid.UUID] = uuid_pk()
    bulk_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bulk_orders.id", ondelete="RESTRICT"),
        unique=True,
        nullable=False,
        index=True,
    )
    retailer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("retailers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    community_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("communities.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    bill_number: Mapped[str] = mapped_column(String(60), unique=True, index=True, nullable=False)
    gross_amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)  # Integer paise
    discount_amount_paise: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    delivery_amount_paise: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    net_amount_paise: Mapped[int] = mapped_column(
        Integer, nullable=False
    )  # gross - discount + delivery
    status: Mapped[str] = mapped_column(
        String(30), default="draft", nullable=False, index=True
    )  # draft, finalized, settled
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, nullable=False
    )
    finalized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    bulk_order: Mapped["BulkOrder"] = relationship("BulkOrder", back_populates="retailer_bill")
    retailer: Mapped["Retailer"] = relationship("Retailer")
    community: Mapped["Community"] = relationship("Community")


class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (
        CheckConstraint("total_amount_paise >= 0", name="chk_invoice_total_non_negative"),
        CheckConstraint("paid_amount_paise >= 0", name="chk_invoice_paid_non_negative"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    bulk_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bulk_orders.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    community_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("communities.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    invoice_number: Mapped[str] = mapped_column(String(60), unique=True, index=True, nullable=False)
    base_amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)  # integer paise
    discount_amount_paise: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    delivery_fee_paise: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    paid_amount_paise: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(
        String(30), default="unlocked", nullable=False, index=True
    )  # unlocked, pending, paid, partially_paid, void, needs_refund
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, nullable=False
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    bulk_order: Mapped["BulkOrder"] = relationship("BulkOrder", back_populates="invoices")
    user: Mapped["User"] = relationship("User")
    community: Mapped["Community"] = relationship("Community")
    items: Mapped[list["InvoiceItem"]] = relationship(
        "InvoiceItem", back_populates="invoice", cascade="all, delete-orphan"
    )
    discounts: Mapped[list["DiscountAllocation"]] = relationship(
        "DiscountAllocation", back_populates="invoice", cascade="all, delete-orphan"
    )
    payments: Mapped[list["PaymentRecord"]] = relationship(
        "PaymentRecord", back_populates="invoice"
    )
    delivery_handovers: Mapped[list["DeliveryHandover"]] = relationship(
        "DeliveryHandover", back_populates="invoice"
    )


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id: Mapped[uuid.UUID] = uuid_pk()
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    requested_qty: Mapped[int] = mapped_column(Integer, nullable=False)
    packed_qty: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_paise: Mapped[int] = mapped_column(Integer, nullable=False)  # paise
    line_total_paise: Mapped[int] = mapped_column(
        Integer, nullable=False
    )  # packed_qty * unit_price_paise

    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="items")
    variant: Mapped["ProductVariant"] = relationship("ProductVariant")


class DiscountAllocation(Base):
    __tablename__ = "discount_allocations"

    id: Mapped[uuid.UUID] = uuid_pk()
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    discount_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # bulk_order, seasonal, community
    amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)  # paise
    description: Mapped[str | None] = mapped_column(String(200), nullable=True)

    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="discounts")


class PaymentRecord(Base):
    __tablename__ = "payment_records"

    id: Mapped[uuid.UUID] = uuid_pk()
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)  # integer paise
    gateway: Mapped[str] = mapped_column(
        String(40), default="razorpay", nullable=False
    )  # razorpay, mock, cash
    transaction_id: Mapped[str | None] = mapped_column(
        String(100), unique=True, index=True, nullable=True
    )
    gateway_order_id: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), default="initiated", nullable=False, index=True
    )  # initiated, successful, failed
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, nullable=False
    )

    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="payments")
    user: Mapped["User"] = relationship("User")
    refunds: Mapped[list["Refund"]] = relationship("Refund", back_populates="payment")


class Refund(Base):
    __tablename__ = "refunds"

    id: Mapped[uuid.UUID] = uuid_pk()
    payment_record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payment_records.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)  # paise
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(30), default="pending", nullable=False
    )  # pending, completed
    initiated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    payment: Mapped["PaymentRecord"] = relationship("PaymentRecord", back_populates="refunds")
