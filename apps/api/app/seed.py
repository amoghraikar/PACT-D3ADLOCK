"""
PACT Deterministic Database Seeder
Seeds standard roles, communities, apartments, demo users, retailers,
12 grocery categories, 72 products with multiple variants, stock inventory,
and an active shopping cycle.
"""

import logging
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.clock import now_utc
from app.core.db import SessionLocal
from app.models.catalogue import Category, Product, ProductImage, ProductVariant
from app.models.commerce import ShoppingCycle
from app.models.identity import Role, User
from app.models.inventory import InventoryItem, InventoryMovement, StockBatch
from app.models.organization import (
    Apartment,
    Building,
    Community,
    CommunityMembership,
    Retailer,
    RetailerCommunity,
)
from app.seed_data import CATEGORIES_DATA, PRODUCTS_DATA

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pact.seed")

# Standard Demo UUIDs for predictable reference
ROLES = [
    {"name": "customer", "description": "Apartment resident consumer"},
    {"name": "retailer", "description": "Kirana store merchant / supplier"},
    {"name": "community_admin", "description": "Society management committee / admin"},
    {"name": "platform_admin", "description": "PACT super administrator"},
]

COMMUNITIES = [
    {
        "name": "Green Meadows Apartment",
        "code": "GREEN_MEADOWS",
        "address": "Survey 42/1, Sarjapur Road, Bellandur",
        "city": "Bengaluru",
        "postal_code": "560102",
    },
    {
        "name": "Lakeview Residency",
        "code": "LAKEVIEW",
        "address": "45 Wind Tunnel Road, Murugeshpalya",
        "city": "Bengaluru",
        "postal_code": "560017",
    },
]


def seed_database(session: Session) -> None:
    logger.info("Starting PACT database seeding...")

    # 1. Seed Core Roles
    role_map = {}
    for r in ROLES:
        role = session.scalar(select(Role).where(Role.name == r["name"]))
        if not role:
            role = Role(name=r["name"], description=r["description"])
            session.add(role)
            session.flush()
        role_map[r["name"]] = role
    logger.info("Roles verified: %s", list(role_map.keys()))

    # 2. Seed Communities
    community_map = {}
    for c in COMMUNITIES:
        comm = session.scalar(select(Community).where(Community.code == c["code"]))
        if not comm:
            comm = Community(**c, is_active=True)
            session.add(comm)
            session.flush()
        community_map[c["code"]] = comm
    logger.info("Communities verified: %s", list(community_map.keys()))

    green_meadows = community_map["GREEN_MEADOWS"]

    # 3. Seed Buildings and Apartments for Green Meadows
    b_tower_a = session.scalar(
        select(Building).where(
            Building.community_id == green_meadows.id, Building.name == "Tower A"
        )
    )
    if not b_tower_a:
        b_tower_a = Building(community_id=green_meadows.id, name="Tower A", total_floors=14)
        session.add(b_tower_a)
        session.flush()

    apt_units = ["A-101", "A-102", "A-201", "A-202", "A-301"]
    apt_map = {}
    for unit in apt_units:
        apt = session.scalar(
            select(Apartment).where(
                Apartment.building_id == b_tower_a.id, Apartment.unit_number == unit
            )
        )
        if not apt:
            apt = Apartment(
                community_id=green_meadows.id,
                building_id=b_tower_a.id,
                unit_number=unit,
                floor_number=int(unit.split("-")[1][0]),
            )
            session.add(apt)
            session.flush()
        apt_map[unit] = apt

    # 4. Seed Demo Users
    demo_users = [
        {"phone": "+919999900001", "full_name": "Asha Sharma", "role": "customer", "unit": "A-101"},
        {
            "phone": "+919999900002",
            "full_name": "Bharat Patel",
            "role": "customer",
            "unit": "A-102",
        },
        {"phone": "+919999900003", "full_name": "Dev Nair", "role": "customer", "unit": "A-201"},
        {
            "phone": "+919999900031",
            "full_name": "Meera Iyer",
            "role": "community_admin",
            "unit": "A-202",
        },
        {"phone": "+919999900021", "full_name": "Ravi Mohan", "role": "retailer", "unit": None},
        {
            "phone": "+919999900099",
            "full_name": "PACT Platform Admin",
            "role": "platform_admin",
            "unit": None,
        },
    ]

    user_map = {}
    for u in demo_users:
        user = session.scalar(select(User).where(User.phone == u["phone"]))
        if not user:
            user = User(
                phone=u["phone"],
                full_name=u["full_name"],
                role_id=role_map[u["role"]].id,
                language="en",
                is_active=True,
            )
            session.add(user)
            session.flush()

            # Create community membership if resident/admin
            if u["unit"] and u["unit"] in apt_map:
                membership = CommunityMembership(
                    community_id=green_meadows.id,
                    user_id=user.id,
                    apartment_id=apt_map[u["unit"]].id,
                    role="admin" if u["role"] == "community_admin" else "resident",
                )
                session.add(membership)

        user_map[u["phone"]] = user

    # 5. Seed Retailer Profile for Ravi
    ravi_user = user_map["+919999900021"]
    retailer = session.scalar(select(Retailer).where(Retailer.user_id == ravi_user.id))
    if not retailer:
        retailer = Retailer(
            user_id=ravi_user.id,
            store_name="Mohan Kirana & Daily Needs",
            business_address="Shop 4, Green Glen Layout, Bellandur, Bengaluru",
            gstin="29ABCDE1234F1Z5",
            phone=ravi_user.phone,
            status="active",
        )
        session.add(retailer)
        session.flush()

        # Connect retailer to Green Meadows
        ret_comm = RetailerCommunity(
            retailer_id=retailer.id,
            community_id=green_meadows.id,
            is_primary=True,
            is_active=True,
            delivery_fee_paise=15000,  # ₹150 society flat delivery
        )
        session.add(ret_comm)
        session.flush()

    # 6. Seed 12 Grocery Categories
    category_map = {}
    for cat in CATEGORIES_DATA:
        category = session.scalar(select(Category).where(Category.slug == cat["slug"]))
        if not category:
            category = Category(**cat, is_active=True)
            session.add(category)
            session.flush()
        else:
            category.name = cat["name"]
            category.display_order = cat["display_order"]
            category.icon = cat["icon"]
            session.flush()
        category_map[cat["slug"]] = category
    logger.info("Seeded %d categories", len(category_map))

    # 7. Seed 72 Grocery Products, Variants, Images & Inventory
    products_count = 0
    variants_count = 0

    for prod_data in PRODUCTS_DATA:
        category = category_map[prod_data["category_slug"]]
        product = session.scalar(select(Product).where(Product.title == prod_data["title"]))
        if not product:
            product = Product(
                category_id=category.id,
                title=prod_data["title"],
                brand=prod_data.get("brand"),
                description=prod_data.get("description"),
                is_active=True,
            )
            session.add(product)
            session.flush()

            # Add Primary Image
            if prod_data.get("image_url"):
                img = ProductImage(
                    product_id=product.id,
                    image_url=prod_data["image_url"],
                    alt_text=product.title,
                    display_order=0,
                    is_primary=True,
                )
                session.add(img)

        products_count += 1

        # Add Variants
        for v in prod_data["variants"]:
            variant = session.scalar(select(ProductVariant).where(ProductVariant.sku == v["sku"]))
            if not variant:
                variant = ProductVariant(
                    product_id=product.id,
                    sku=v["sku"],
                    title=v["title"],
                    unit=v["unit"],
                    pack_quantity=1,
                    mrp_paise=v["mrp"],
                    default_price_paise=v["price"],
                    is_active=True,
                )
                session.add(variant)
                session.flush()

            variants_count += 1

            # Seed Retailer Inventory Record
            inv_item = session.scalar(
                select(InventoryItem).where(
                    InventoryItem.retailer_id == retailer.id,
                    InventoryItem.variant_id == variant.id,
                )
            )
            initial_stock = v.get("stock", 50)
            if not inv_item:
                inv_item = InventoryItem(
                    retailer_id=retailer.id,
                    variant_id=variant.id,
                    current_stock_qty=initial_stock,
                    reserved_stock_qty=0,
                    reorder_level_qty=15,
                    is_active=True,
                )
                session.add(inv_item)
                session.flush()

                # Add initial stock batch
                batch = StockBatch(
                    retailer_id=retailer.id,
                    variant_id=variant.id,
                    batch_number=f"BATCH-{variant.sku[:8]}-01",
                    quantity=initial_stock,
                    cost_price_paise=int(v["price"] * 0.85),
                    supplier_name="Metro Cash & Carry Wholesale",
                    inward_date=now_utc(),
                )
                session.add(batch)

                # Add initial inward movement
                movement = InventoryMovement(
                    retailer_id=retailer.id,
                    variant_id=variant.id,
                    movement_type="inward",
                    quantity_delta=initial_stock,
                    reference_id=f"INITIAL-INWARD-{variant.sku}",
                    created_at=now_utc(),
                )
                session.add(movement)

    logger.info(
        "Seeded %d products with %d variants and inventory batches.", products_count, variants_count
    )

    # 8. Seed Active Shopping Cycle
    current_month = "2026-11"
    cycle = session.scalar(
        select(ShoppingCycle).where(
            ShoppingCycle.community_id == green_meadows.id,
            ShoppingCycle.cycle_month == current_month,
        )
    )
    if not cycle:
        cutoff = datetime(2026, 11, 22, 11, 57, 0, tzinfo=UTC)
        cycle = ShoppingCycle(
            community_id=green_meadows.id,
            cycle_month=current_month,
            cutoff_at=cutoff,
            status="OPEN",
            created_at=now_utc(),
        )
        session.add(cycle)

    session.commit()
    logger.info("PACT Database successfully seeded with standard test entities.")


if __name__ == "__main__":
    with SessionLocal() as db_session:
        seed_database(db_session)
