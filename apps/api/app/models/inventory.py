import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
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
from app.models.base import Base, uuid_pk

if TYPE_CHECKING:
    from app.models.catalogue import ProductVariant
    from app.models.organization import Retailer


class InventoryItem(Base):
    __tablename__ = "inventory_items"
    __table_args__ = (
        UniqueConstraint("retailer_id", "variant_id", name="uq_retailer_inventory_variant"),
        CheckConstraint("current_stock_qty >= 0", name="chk_inventory_stock_non_negative"),
        CheckConstraint("reserved_stock_qty >= 0", name="chk_inventory_reserved_non_negative"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    retailer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("retailers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    current_stock_qty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reserved_stock_qty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reorder_level_qty: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False
    )

    retailer: Mapped["Retailer"] = relationship("Retailer")
    variant: Mapped["ProductVariant"] = relationship(
        "ProductVariant", back_populates="inventory_records"
    )


class StockBatch(Base):
    __tablename__ = "stock_batches"

    id: Mapped[uuid.UUID] = uuid_pk()
    retailer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("retailers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    batch_number: Mapped[str] = mapped_column(String(60), index=True, nullable=False)
    inward_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, nullable=False
    )
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    cost_price_paise: Mapped[int] = mapped_column(Integer, nullable=False)  # Integer paise
    supplier_name: Mapped[str | None] = mapped_column(String(120), nullable=True)

    variant: Mapped["ProductVariant"] = relationship("ProductVariant", back_populates="batches")


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id: Mapped[uuid.UUID] = uuid_pk()
    retailer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("retailers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    movement_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # inward, packed, adjustment, spoilage
    quantity_delta: Mapped[int] = mapped_column(
        Integer, nullable=False
    )  # positive or negative integer
    reference_id: Mapped[str | None] = mapped_column(
        String(80), nullable=True
    )  # bulk order id or PO number
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, nullable=False
    )


class ReorderRule(Base):
    __tablename__ = "reorder_rules"
    __table_args__ = (
        UniqueConstraint("retailer_id", "variant_id", name="uq_retailer_reorder_rule"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    retailer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("retailers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    min_threshold_qty: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    target_reorder_qty: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    auto_reorder_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
