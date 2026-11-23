import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, uuid_pk

if TYPE_CHECKING:
    from app.models.billing import Invoice
    from app.models.commerce import BulkOrder
    from app.models.identity import User
    from app.models.organization import Community


class Delivery(Base):
    __tablename__ = "deliveries"

    id: Mapped[uuid.UUID] = uuid_pk()
    bulk_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bulk_orders.id", ondelete="RESTRICT"),
        unique=True,
        nullable=False,
        index=True,
    )
    community_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("communities.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(30), default="scheduled", nullable=False, index=True
    )  # scheduled, in_transit, at_gate, delivered
    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    arrived_at_gate: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    bulk_order: Mapped["BulkOrder"] = relationship("BulkOrder", back_populates="delivery")
    community: Mapped["Community"] = relationship("Community")
    handovers: Mapped[list["DeliveryHandover"]] = relationship(
        "DeliveryHandover", back_populates="delivery", cascade="all, delete-orphan"
    )


class DeliveryHandover(Base):
    __tablename__ = "delivery_handovers"

    id: Mapped[uuid.UUID] = uuid_pk()
    delivery_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deliveries.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="RESTRICT"),
        unique=True,
        nullable=False,
        index=True,
    )
    recipient_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    handed_over_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(
        String(30), default="pending", nullable=False, index=True
    )  # pending, handed_over
    handover_timestamp: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    delivery: Mapped["Delivery"] = relationship("Delivery", back_populates="handovers")
    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="delivery_handovers")
    recipient: Mapped["User"] = relationship("User", foreign_keys=[recipient_user_id])
    handed_over_by: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[handed_over_by_user_id]
    )
