import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.clock import now_utc
from app.models.base import Base, TimestampMixin, uuid_pk

if TYPE_CHECKING:
    from app.models.billing import Invoice, RetailerBill
    from app.models.catalogue import ProductVariant
    from app.models.delivery import Delivery
    from app.models.identity import User
    from app.models.inventory import StockBatch
    from app.models.organization import Community, Retailer


class ShoppingCycle(Base):
    __tablename__ = "shopping_cycles"
    __table_args__ = (
        UniqueConstraint("community_id", "cycle_month", name="uq_community_cycle_month"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    community_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("communities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    cycle_month: Mapped[str] = mapped_column(
        String(7), nullable=False, index=True
    )  # e.g., "2026-11"
    cutoff_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )  # 22nd 17:27 IST in UTC
    status: Mapped[str] = mapped_column(
        String(20), default="OPEN", nullable=False, index=True
    )  # OPEN, LOCKED, PROCESSING, COMPLETED
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, nullable=False
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    community: Mapped["Community"] = relationship("Community", back_populates="shopping_cycles")
    cart_items: Mapped[list["CommunityCartItem"]] = relationship(
        "CommunityCartItem", back_populates="cycle"
    )
    bulk_orders: Mapped[list["BulkOrder"]] = relationship("BulkOrder", back_populates="cycle")


class CommunityCartItem(Base, TimestampMixin):
    __tablename__ = "community_cart_items"
    __table_args__ = (
        UniqueConstraint("cycle_id", "user_id", "variant_id", name="uq_cycle_user_variant_cart"),
        CheckConstraint("quantity > 0", name="chk_cart_item_quantity_positive"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    cycle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shopping_cycles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    community_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("communities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)

    cycle: Mapped["ShoppingCycle"] = relationship("ShoppingCycle", back_populates="cart_items")
    community: Mapped["Community"] = relationship("Community", back_populates="cart_items")
    user: Mapped["User"] = relationship("User")
    variant: Mapped["ProductVariant"] = relationship("ProductVariant", back_populates="cart_items")


class CartItemHistory(Base):
    __tablename__ = "cart_item_history"

    id: Mapped[uuid.UUID] = uuid_pk()
    cart_item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cycle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shopping_cycles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    previous_qty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    new_qty: Mapped[int] = mapped_column(Integer, nullable=False)
    action: Mapped[str] = mapped_column(String(30), nullable=False)  # added, updated, removed
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, nullable=False
    )


class BulkOrder(Base):
    __tablename__ = "bulk_orders"

    id: Mapped[uuid.UUID] = uuid_pk()
    cycle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shopping_cycles.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    community_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("communities.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    retailer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("retailers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    order_number: Mapped[str] = mapped_column(String(60), unique=True, index=True, nullable=False)
    status: Mapped[str] = mapped_column(
        String(30), default="pending", nullable=False, index=True
    )  # pending, accepted, packing, billed, dispatched, delivered, cancelled
    total_requested_items: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_packed_items: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    subtotal_paise: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # integer paise
    discount_paise: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    delivery_fee_paise: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_paise: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    placed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, nullable=False
    )
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    cycle: Mapped["ShoppingCycle"] = relationship("ShoppingCycle", back_populates="bulk_orders")
    community: Mapped["Community"] = relationship("Community", back_populates="bulk_orders")
    retailer: Mapped["Retailer"] = relationship("Retailer", back_populates="bulk_orders")
    items: Mapped[list["BulkOrderItem"]] = relationship(
        "BulkOrderItem", back_populates="bulk_order", cascade="all, delete-orphan"
    )
    retailer_bill: Mapped[Optional["RetailerBill"]] = relationship(
        "RetailerBill", back_populates="bulk_order", uselist=False
    )
    invoices: Mapped[list["Invoice"]] = relationship("Invoice", back_populates="bulk_order")
    delivery: Mapped[Optional["Delivery"]] = relationship(
        "Delivery", back_populates="bulk_order", uselist=False
    )


class BulkOrderItem(Base):
    __tablename__ = "bulk_order_items"
    __table_args__ = (
        UniqueConstraint("bulk_order_id", "variant_id", name="uq_bulk_order_variant"),
        CheckConstraint(
            "packed_qty <= requested_qty", name="chk_bulk_item_packed_not_exceed_requested"
        ),
        CheckConstraint("requested_qty >= 0", name="chk_bulk_item_requested_non_negative"),
        CheckConstraint("packed_qty >= 0", name="chk_bulk_item_packed_non_negative"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    bulk_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bulk_orders.id", ondelete="CASCADE"),
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
    packed_qty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unit_price_paise: Mapped[int] = mapped_column(Integer, nullable=False)  # paise
    subtotal_paise: Mapped[int] = mapped_column(Integer, nullable=False)  # paise

    bulk_order: Mapped["BulkOrder"] = relationship("BulkOrder", back_populates="items")
    variant: Mapped["ProductVariant"] = relationship(
        "ProductVariant", back_populates="bulk_order_items"
    )
    packing_records: Mapped[list["RetailerPackingItem"]] = relationship(
        "RetailerPackingItem", back_populates="bulk_order_item"
    )


class RetailerPackingItem(Base):
    __tablename__ = "retailer_packing_items"

    id: Mapped[uuid.UUID] = uuid_pk()
    bulk_order_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bulk_order_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    batch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("stock_batches.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    packed_qty: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    packed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, nullable=False
    )

    bulk_order_item: Mapped["BulkOrderItem"] = relationship(
        "BulkOrderItem", back_populates="packing_records"
    )
    batch: Mapped[Optional["StockBatch"]] = relationship("StockBatch")
