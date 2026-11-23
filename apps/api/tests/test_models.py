import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.db import SessionLocal
from app.models.catalogue import ProductVariant
from app.models.commerce import BulkOrder, BulkOrderItem, CommunityCartItem, ShoppingCycle
from app.models.identity import Role, User
from app.models.inventory import InventoryItem
from app.models.organization import Community, Retailer


@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.rollback()
    session.close()


def test_seed_entities_exist(db):
    """Verify that seeded roles, communities, and users exist."""
    roles = db.scalars(select(Role)).all()
    assert len(roles) >= 4
    role_names = {r.name for r in roles}
    assert {"customer", "retailer", "community_admin", "platform_admin"}.issubset(role_names)

    comm = db.scalar(select(Community).where(Community.code == "GREEN_MEADOWS"))
    assert comm is not None
    assert comm.name == "Green Meadows Apartment"

    asha = db.scalar(select(User).where(User.phone == "+919999900001"))
    assert asha is not None
    assert asha.full_name == "Asha Sharma"
    assert asha.role.name == "customer"


def test_integer_paise_guarantee(db):
    """Verify all monetary fields are stored as integer paise."""
    variants = db.scalars(select(ProductVariant)).all()
    assert len(variants) > 0
    for v in variants:
        assert isinstance(v.mrp_paise, int)
        assert isinstance(v.default_price_paise, int)
        assert v.mrp_paise > 0
        assert v.default_price_paise > 0
        # Sanity check: selling price should not exceed MRP
        assert v.default_price_paise <= v.mrp_paise


def test_prevent_duplicate_cart_item(db):
    """Rule 8: Prevent duplicate cart entries for same resident, cycle, and product variant."""
    user = db.scalar(select(User).where(User.phone == "+919999900001"))
    comm = db.scalar(select(Community).where(Community.code == "GREEN_MEADOWS"))
    cycle = db.scalar(select(ShoppingCycle).where(ShoppingCycle.community_id == comm.id))
    variant = db.scalars(select(ProductVariant)).first()

    assert user and comm and cycle and variant

    # Clear prior item if exists
    db.query(CommunityCartItem).filter(
        CommunityCartItem.cycle_id == cycle.id,
        CommunityCartItem.user_id == user.id,
        CommunityCartItem.variant_id == variant.id,
    ).delete()
    db.flush()

    # Insert first cart item
    cart1 = CommunityCartItem(
        cycle_id=cycle.id,
        community_id=comm.id,
        user_id=user.id,
        variant_id=variant.id,
        quantity=2,
    )
    db.add(cart1)
    db.flush()

    # Attempt to insert exact duplicate (same user, cycle, variant)
    cart2 = CommunityCartItem(
        cycle_id=cycle.id,
        community_id=comm.id,
        user_id=user.id,
        variant_id=variant.id,
        quantity=3,
    )
    db.add(cart2)

    with pytest.raises(IntegrityError):
        db.flush()


def test_packing_cannot_exceed_requested(db):
    """Check constraint: packed_qty <= requested_qty on BulkOrderItem."""
    comm = db.scalar(select(Community).where(Community.code == "GREEN_MEADOWS"))
    cycle = db.scalar(select(ShoppingCycle).where(ShoppingCycle.community_id == comm.id))
    retailer = db.scalars(select(Retailer)).first()
    variant = db.scalars(select(ProductVariant)).first()

    bulk_order = BulkOrder(
        cycle_id=cycle.id,
        community_id=comm.id,
        retailer_id=retailer.id,
        order_number=f"TEST-ORD-{uuid.uuid4().hex[:8]}",
        status="packing",
        total_requested_items=10,
    )
    db.add(bulk_order)
    db.flush()

    # Requested 5, packed 6 -> Violates CheckConstraint("packed_qty <= requested_qty")
    invalid_item = BulkOrderItem(
        bulk_order_id=bulk_order.id,
        variant_id=variant.id,
        requested_qty=5,
        packed_qty=6,
        unit_price_paise=6000,
        subtotal_paise=36000,
    )
    db.add(invalid_item)

    with pytest.raises(IntegrityError):
        db.flush()


def test_inventory_non_negative_constraint(db):
    """Check constraint: current_stock_qty >= 0."""
    retailer = db.scalars(select(Retailer)).first()
    variant = db.scalars(select(ProductVariant)).first()

    # Attempt to set negative stock
    bad_inv = InventoryItem(
        retailer_id=retailer.id,
        variant_id=variant.id,
        current_stock_qty=-5,
    )
    db.add(bad_inv)

    with pytest.raises(IntegrityError):
        db.flush()


def test_financial_record_deletion_restricted(db):
    """Rule 15: Never cascade-delete financial records (BulkOrder ondelete='RESTRICT')."""
    comm = db.scalar(select(Community).where(Community.code == "GREEN_MEADOWS"))
    cycle = db.scalar(select(ShoppingCycle).where(ShoppingCycle.community_id == comm.id))
    retailer = db.scalars(select(Retailer)).first()

    order = BulkOrder(
        cycle_id=cycle.id,
        community_id=comm.id,
        retailer_id=retailer.id,
        order_number=f"FIN-ORD-{uuid.uuid4().hex[:8]}",
        status="billed",
    )
    db.add(order)
    db.flush()

    # Attempting to delete the retailer who has active bulk orders must be RESTRICTED
    db.delete(retailer)
    with pytest.raises(IntegrityError):
        db.flush()
