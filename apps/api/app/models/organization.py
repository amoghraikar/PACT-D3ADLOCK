import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.clock import now_utc
from app.models.base import Base, TimestampMixin, uuid_pk

if TYPE_CHECKING:
    from app.models.commerce import BulkOrder, CommunityCartItem, ShoppingCycle
    from app.models.identity import User


class Community(Base, TimestampMixin):
    __tablename__ = "communities"

    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    code: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(String(80), nullable=False, default="Bengaluru")
    postal_code: Mapped[str] = mapped_column(String(20), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    buildings: Mapped[list["Building"]] = relationship(
        "Building", back_populates="community", cascade="all, delete-orphan"
    )
    apartments: Mapped[list["Apartment"]] = relationship(
        "Apartment", back_populates="community", cascade="all, delete-orphan"
    )
    memberships: Mapped[list["CommunityMembership"]] = relationship(
        "CommunityMembership", back_populates="community"
    )
    retailer_associations: Mapped[list["RetailerCommunity"]] = relationship(
        "RetailerCommunity", back_populates="community"
    )
    shopping_cycles: Mapped[list["ShoppingCycle"]] = relationship(
        "ShoppingCycle", back_populates="community"
    )
    cart_items: Mapped[list["CommunityCartItem"]] = relationship(
        "CommunityCartItem", back_populates="community"
    )
    bulk_orders: Mapped[list["BulkOrder"]] = relationship("BulkOrder", back_populates="community")


class Building(Base):
    __tablename__ = "buildings"

    id: Mapped[uuid.UUID] = uuid_pk()
    community_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("communities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(60), nullable=False)  # e.g., "Tower A", "Block 1"
    total_floors: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, nullable=False
    )

    community: Mapped["Community"] = relationship("Community", back_populates="buildings")
    apartments: Mapped[list["Apartment"]] = relationship("Apartment", back_populates="building")


class Apartment(Base):
    __tablename__ = "apartments"
    __table_args__ = (
        UniqueConstraint("community_id", "unit_number", name="uq_community_apartment_unit"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    community_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("communities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    building_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("buildings.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    unit_number: Mapped[str] = mapped_column(
        String(30), nullable=False, index=True
    )  # e.g., "A-402", "101"
    floor_number: Mapped[int | None] = mapped_column(Integer, nullable=True)

    community: Mapped["Community"] = relationship("Community", back_populates="apartments")
    building: Mapped[Optional["Building"]] = relationship("Building", back_populates="apartments")
    memberships: Mapped[list["CommunityMembership"]] = relationship(
        "CommunityMembership", back_populates="apartment"
    )


class CommunityMembership(Base):
    __tablename__ = "community_memberships"
    __table_args__ = (
        UniqueConstraint("community_id", "user_id", name="uq_community_user_membership"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    community_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("communities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    apartment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("apartments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    role: Mapped[str] = mapped_column(
        String(30), default="resident", nullable=False
    )  # resident, lead, admin
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, nullable=False
    )

    community: Mapped["Community"] = relationship("Community", back_populates="memberships")
    user: Mapped["User"] = relationship("User", back_populates="memberships")
    apartment: Mapped[Optional["Apartment"]] = relationship(
        "Apartment", back_populates="memberships"
    )


class Retailer(Base, TimestampMixin):
    __tablename__ = "retailers"

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        unique=True,
        nullable=False,
        index=True,
    )
    store_name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    business_address: Mapped[str] = mapped_column(Text, nullable=False)
    gstin: Mapped[str | None] = mapped_column(String(30), nullable=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="active", nullable=False
    )  # active, suspended

    user: Mapped["User"] = relationship("User", back_populates="retailer_profile")
    community_associations: Mapped[list["RetailerCommunity"]] = relationship(
        "RetailerCommunity", back_populates="retailer"
    )
    bulk_orders: Mapped[list["BulkOrder"]] = relationship("BulkOrder", back_populates="retailer")


class RetailerCommunity(Base):
    __tablename__ = "retailer_communities"
    __table_args__ = (
        UniqueConstraint("retailer_id", "community_id", name="uq_retailer_community"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    retailer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("retailers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    community_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("communities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    delivery_fee_paise: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, nullable=False
    )

    retailer: Mapped["Retailer"] = relationship("Retailer", back_populates="community_associations")
    community: Mapped["Community"] = relationship(
        "Community", back_populates="retailer_associations"
    )
