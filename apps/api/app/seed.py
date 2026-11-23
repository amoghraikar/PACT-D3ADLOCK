"""
PACT Deterministic Database Seeder
Seeds standard roles, communities, apartments, demo users, retailers,
categories, products, variants, initial inventory, and an active shopping cycle.
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
from app.models.inventory import InventoryItem
from app.models.organization import (
    Apartment,
    Building,
    Community,
    CommunityMembership,
    Retailer,
    RetailerCommunity,
)

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

CATEGORIES = [
    {"name": "Rice & Grains", "slug": "rice-grains", "icon": "grain", "display_order": 1},
    {"name": "Atta & Flours", "slug": "atta-flours", "icon": "wheat", "display_order": 2},
    {"name": "Dals & Pulses", "slug": "dals-pulses", "icon": "seed", "display_order": 3},
    {"name": "Cooking Oils & Ghee", "slug": "cooking-oils-ghee", "icon": "oil", "display_order": 4},
    {"name": "Dairy & Eggs", "slug": "dairy-eggs", "icon": "milk", "display_order": 5},
    {"name": "Spices & Masalas", "slug": "spices-masalas", "icon": "sparkles", "display_order": 6},
    {"name": "Dry Fruits & Nuts", "slug": "dry-fruits-nuts", "icon": "nut", "display_order": 7},
    {"name": "Snacks & Biscuits", "slug": "snacks-biscuits", "icon": "cookie", "display_order": 8},
    {"name": "Beverages & Tea", "slug": "beverages-tea", "icon": "coffee", "display_order": 9},
    {
        "name": "Cleaning & Household",
        "slug": "cleaning-household",
        "icon": "spray",
        "display_order": 10,
    },
    {"name": "Personal Care", "slug": "personal-care", "icon": "heart", "display_order": 11},
    {
        "name": "Pooja & Ritual Essentials",
        "slug": "pooja-essentials",
        "icon": "flame",
        "display_order": 12,
    },
]

DEMO_PRODUCTS = [
    # Rice & Grains
    {
        "cat_slug": "rice-grains",
        "title": "Sona Masoori Rice",
        "brand": "Standard Groceries",
        "description": "Premium aged lightweight Sona Masoori rice from Andhra.",
        "image_url": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80",
        "variants": [
            {
                "sku": "RICE-SONA-1KG",
                "title": "1 kg Pack",
                "unit": "1 kg",
                "mrp": 7000,
                "price": 6000,
            },
            {
                "sku": "RICE-SONA-5KG",
                "title": "5 kg Pack",
                "unit": "5 kg",
                "mrp": 34000,
                "price": 28000,
            },
        ],
    },
    {
        "cat_slug": "rice-grains",
        "title": "Royal Basmati Rice",
        "brand": "Heritage",
        "description": "Extra long grain authentic aromatic Basmati rice.",
        "image_url": "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400&auto=format&fit=crop&q=80",
        "variants": [
            {
                "sku": "RICE-BASM-1KG",
                "title": "1 kg Pack",
                "unit": "1 kg",
                "mrp": 14000,
                "price": 12000,
            },
            {
                "sku": "RICE-BASM-5KG",
                "title": "5 kg Pack",
                "unit": "5 kg",
                "mrp": 68000,
                "price": 58000,
            },
        ],
    },
    # Atta & Flours
    {
        "cat_slug": "atta-flours",
        "title": "Whole Wheat Sharbati Atta",
        "brand": "Aashirvaad Select",
        "description": "100% MP Sharbati wheat grains, stone ground for soft chapatis.",
        "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80",
        "variants": [
            {
                "sku": "ATTA-AASH-5KG",
                "title": "5 kg Bag",
                "unit": "5 kg",
                "mrp": 32000,
                "price": 29000,
            },
            {
                "sku": "ATTA-AASH-10KG",
                "title": "10 kg Bag",
                "unit": "10 kg",
                "mrp": 62000,
                "price": 56000,
            },
        ],
    },
    # Dals & Pulses
    {
        "cat_slug": "dals-pulses",
        "title": "Unpolished Toor Dal",
        "brand": "Tata Sampann",
        "description": "High-protein unpolished yellow pigeon peas.",
        "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80",
        "variants": [
            {
                "sku": "DAL-TOOR-1KG",
                "title": "1 kg Pack",
                "unit": "1 kg",
                "mrp": 18500,
                "price": 16500,
            },
        ],
    },
    {
        "cat_slug": "dals-pulses",
        "title": "Moong Dal (Yellow Split)",
        "brand": "Organic Tattva",
        "description": "Chemical-free unpolished yellow split lentils.",
        "image_url": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&auto=format&fit=crop&q=80",
        "variants": [
            {
                "sku": "DAL-MOONG-1KG",
                "title": "1 kg Pack",
                "unit": "1 kg",
                "mrp": 17000,
                "price": 15000,
            },
        ],
    },
    # Cooking Oils & Ghee
    {
        "cat_slug": "cooking-oils-ghee",
        "title": "Pure Cow Ghee",
        "brand": "Nandini",
        "description": "Traditional aromatic clarified cow butter from KMF.",
        "image_url": "https://images.unsplash.com/photo-1589927986086-3d10fb5b0288?w=400&auto=format&fit=crop&q=80",
        "variants": [
            {
                "sku": "GHEE-NAND-500ML",
                "title": "500 ml Pouch",
                "unit": "500 ml",
                "mrp": 34000,
                "price": 31500,
            },
            {
                "sku": "GHEE-NAND-1L",
                "title": "1 Litre Tin",
                "unit": "1 litre",
                "mrp": 66000,
                "price": 61000,
            },
        ],
    },
    {
        "cat_slug": "cooking-oils-ghee",
        "title": "Cold Pressed Sunflower Oil",
        "brand": "Fortune Sunlite",
        "description": "Refined heart-healthy light cooking oil.",
        "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80",
        "variants": [
            {
                "sku": "OIL-FORT-1L",
                "title": "1 Litre Pouch",
                "unit": "1 litre",
                "mrp": 16000,
                "price": 13500,
            },
        ],
    },
    # Dairy & Eggs
    {
        "cat_slug": "dairy-eggs",
        "title": "Pasteurised Toned Milk",
        "brand": "Amul Taaza",
        "description": "Homogenised toned long-life milk.",
        "image_url": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80",
        "variants": [
            {
                "sku": "MILK-AMUL-1L",
                "title": "1 Litre Tetra",
                "unit": "1 litre",
                "mrp": 7200,
                "price": 6800,
            },
        ],
    },
]


def seed_database(session: Session) -> None:
    logger.info("Starting PACT database seeding...")

    # 1. Seed Roles
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
            comm = Community(**c)
            session.add(comm)
            session.flush()
        community_map[c["code"]] = comm
    logger.info("Communities verified: %s", list(community_map.keys()))

    green_meadows = community_map["GREEN_MEADOWS"]

    # 3. Seed Buildings & Apartments in Green Meadows
    b_tower_a = session.scalar(
        select(Building).where(
            Building.community_id == green_meadows.id, Building.name == "Tower A"
        )
    )
    if not b_tower_a:
        b_tower_a = Building(community_id=green_meadows.id, name="Tower A", total_floors=14)
        session.add(b_tower_a)
        session.flush()

    apt_map = {}
    for unit in ["A-101", "A-102", "A-201", "A-202"]:
        apt = session.scalar(
            select(Apartment).where(
                Apartment.community_id == green_meadows.id, Apartment.unit_number == unit
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

    # 6. Seed Categories
    category_map = {}
    for cat in CATEGORIES:
        category = session.scalar(select(Category).where(Category.slug == cat["slug"]))
        if not category:
            category = Category(**cat, is_active=True)
            session.add(category)
            session.flush()
        category_map[cat["slug"]] = category

    # 7. Seed Products & Variants
    for prod_data in DEMO_PRODUCTS:
        category = category_map[prod_data["cat_slug"]]
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

            # Add Image
            if prod_data.get("image_url"):
                img = ProductImage(
                    product_id=product.id,
                    image_url=prod_data["image_url"],
                    alt_text=product.title,
                    is_primary=True,
                )
                session.add(img)

            # Add Variants
            for v in prod_data["variants"]:
                variant = ProductVariant(
                    product_id=product.id,
                    sku=v["sku"],
                    title=v["title"],
                    unit=v["unit"],
                    mrp_paise=v["mrp"],
                    default_price_paise=v["price"],
                    is_active=True,
                )
                session.add(variant)
                session.flush()

                # Add initial retailer inventory
                inv = InventoryItem(
                    retailer_id=retailer.id,
                    variant_id=variant.id,
                    current_stock_qty=100,
                    reserved_stock_qty=0,
                    reorder_level_qty=15,
                    is_active=True,
                )
                session.add(inv)

    # 8. Seed Active Shopping Cycle
    current_month = "2026-11"
    cycle = session.scalar(
        select(ShoppingCycle).where(
            ShoppingCycle.community_id == green_meadows.id,
            ShoppingCycle.cycle_month == current_month,
        )
    )
    if not cycle:
        # 22nd at 17:27 IST = 11:57 UTC
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
