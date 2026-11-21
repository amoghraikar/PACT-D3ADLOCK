
from fastapi import APIRouter, Cookie, Header, Query

from app.modules.auth.router import get_user_from_token

router = APIRouter(prefix="/catalogue", tags=["catalogue"])

# F2 The twelve categories in exact order
CATEGORIES = [
    {"id": "cat-1", "slug": "rice-grains", "name": "Rice & Grains", "sort_order": 1},
    {"id": "cat-2", "slug": "flours-atta", "name": "Flours & Atta", "sort_order": 2},
    {"id": "cat-3", "slug": "dal-pulses", "name": "Dal (Lentils) & Pulses", "sort_order": 3},
    {"id": "cat-4", "slug": "spices", "name": "Spices", "sort_order": 4},
    {"id": "cat-5", "slug": "sugar-jaggery", "name": "Sugar & Jaggery", "sort_order": 5},
    {"id": "cat-6", "slug": "oils-ghee", "name": "Cooking Oils & Ghee", "sort_order": 6},
    {"id": "cat-7", "slug": "sauces-pickles", "name": "Sauces, Pickles & Spreads", "sort_order": 7},
    {"id": "cat-8", "slug": "dry-fruits", "name": "Dry Fruits", "sort_order": 8},
    {"id": "cat-9", "slug": "fruits-nuts", "name": "Fruits & Nuts", "sort_order": 9},
    {"id": "cat-10", "slug": "beverages", "name": "Beverages", "sort_order": 10},
    {"id": "cat-11", "slug": "snacks", "name": "Snacks", "sort_order": 11},
    {"id": "cat-12", "slug": "breakfast-cereals", "name": "Breakfast & Cereals", "sort_order": 12},
]

# Central Products and Variants
PRODUCTS = [
    {
        "id": "prod-rice-sona",
        "category_id": "cat-1",
        "category_name": "Rice & Grains",
        "name": "Sona Masoori Rice",
        "brand": "Standard Groceries",
        "image_url": "/brand/pact-mark.png",
        "aliases": ["rice", "chawal", "चावल", "sona masoori"],
        "variants": [
            {
                "id": "var-rice-sona-1kg",
                "label": "1 kg",
                "pack_size": 1,
                "pack_unit": "kg",
                "base_qty": 1000,
                "base_unit": "g",
            },
            {
                "id": "var-rice-sona-5kg",
                "label": "5 kg",
                "pack_size": 5,
                "pack_unit": "kg",
                "base_qty": 5000,
                "base_unit": "g",
            },
        ],
    },
    {
        "id": "prod-rice-basmati",
        "category_id": "cat-1",
        "category_name": "Rice & Grains",
        "name": "Basmati Rice",
        "brand": "Heritage",
        "image_url": "/brand/pact-mark.png",
        "aliases": ["rice", "chawal", "चावल", "basmati"],
        "variants": [
            {
                "id": "var-rice-basmati-1kg",
                "label": "1 kg",
                "pack_size": 1,
                "pack_unit": "kg",
                "base_qty": 1000,
                "base_unit": "g",
            },
            {
                "id": "var-rice-basmati-5kg",
                "label": "5 kg",
                "pack_size": 5,
                "pack_unit": "kg",
                "base_qty": 5000,
                "base_unit": "g",
            },
        ],
    },
    {
        "id": "prod-sugar",
        "category_id": "cat-5",
        "category_name": "Sugar & Jaggery",
        "name": "Sugar",
        "brand": "Crystal Pure",
        "image_url": "/brand/pact-mark.png",
        "aliases": ["sugar", "cheeni", "चीनी", "shakkar"],
        "variants": [
            {
                "id": "var-sugar-1kg",
                "label": "1 kg",
                "pack_size": 1,
                "pack_unit": "kg",
                "base_qty": 1000,
                "base_unit": "g",
            },
            {
                "id": "var-sugar-5kg",
                "label": "5 kg",
                "pack_size": 5,
                "pack_unit": "kg",
                "base_qty": 5000,
                "base_unit": "g",
            },
        ],
    },
    {
        "id": "prod-oil-sunflower",
        "category_id": "cat-6",
        "category_name": "Cooking Oils & Ghee",
        "name": "Sunflower Oil",
        "brand": "Sun Gold",
        "image_url": "/brand/pact-mark.png",
        "aliases": ["oil", "sunflower oil", "tel", "तेल"],
        "variants": [
            {
                "id": "var-oil-sunflower-1l",
                "label": "1 L",
                "pack_size": 1,
                "pack_unit": "l",
                "base_qty": 1000,
                "base_unit": "ml",
            },
            {
                "id": "var-oil-sunflower-5l",
                "label": "5 L",
                "pack_size": 5,
                "pack_unit": "l",
                "base_qty": 5000,
                "base_unit": "ml",
            },
        ],
    },
    {
        "id": "prod-dal-toor",
        "category_id": "cat-3",
        "category_name": "Dal (Lentils) & Pulses",
        "name": "Toor Dal",
        "brand": "Golden Pulses",
        "image_url": "/brand/pact-mark.png",
        "aliases": ["toor dal", "arhar", "दाल", "dal"],
        "variants": [
            {
                "id": "var-dal-toor-500g",
                "label": "500 g",
                "pack_size": 500,
                "pack_unit": "g",
                "base_qty": 500,
                "base_unit": "g",
            },
            {
                "id": "var-dal-toor-1kg",
                "label": "1 kg",
                "pack_size": 1,
                "pack_unit": "kg",
                "base_qty": 1000,
                "base_unit": "g",
            },
        ],
    },
    {
        "id": "prod-flour-atta",
        "category_id": "cat-2",
        "category_name": "Flours & Atta",
        "name": "Whole Wheat Chakki Atta",
        "brand": "Harvest Gold",
        "image_url": "/brand/pact-mark.png",
        "aliases": ["atta", "flour", "gehu", "आटा"],
        "variants": [
            {
                "id": "var-atta-5kg",
                "label": "5 kg",
                "pack_size": 5,
                "pack_unit": "kg",
                "base_qty": 5000,
                "base_unit": "g",
            },
            {
                "id": "var-atta-10kg",
                "label": "10 kg",
                "pack_size": 10,
                "pack_unit": "kg",
                "base_qty": 10000,
                "base_unit": "g",
            },
        ],
    },
]

# Retailer Inventory Listings: (retailer_id, variant_id) -> dict
# G facts:
# Sri Lakshmi Stores (ret-ravi-1) serves Green Meadows:
# Sona Masoori Rice 5kg: MRP ₹340, sells ₹300 (30000 paise)
# Sugar 1kg: MRP ₹80, sells ₹75 (7500 paise)
# Sunflower Oil 1L: MRP ₹270, sells ₹250 (25000 paise)
# Toor Dal 500g: MRP ₹110, sells ₹100 (10000 paise)
# Sona Masoori Rice 1kg: MRP ₹70, sells ₹65 (6500 paise)
# Basmati Rice is NOT listed by Sri Lakshmi Stores!
# Daily Needs Mart (ret-farah-2) lists Sona Masoori Rice 5kg at ₹320, and Basmati Rice at ₹320.
RETAILER_LISTINGS: dict[tuple[str, str], dict] = {
    ("ret-ravi-1", "var-rice-sona-5kg"): {
        "mrp_paise": 34000,
        "selling_price_paise": 30000,
        "stock_qty": 100,
        "availability": "active",
    },
    ("ret-ravi-1", "var-rice-sona-1kg"): {
        "mrp_paise": 7000,
        "selling_price_paise": 6500,
        "stock_qty": 100,
        "availability": "active",
    },
    ("ret-ravi-1", "var-sugar-1kg"): {
        "mrp_paise": 8000,
        "selling_price_paise": 7500,
        "stock_qty": 100,
        "availability": "active",
    },
    ("ret-ravi-1", "var-sugar-5kg"): {
        "mrp_paise": 38000,
        "selling_price_paise": 36000,
        "stock_qty": 50,
        "availability": "active",
    },
    ("ret-ravi-1", "var-oil-sunflower-1l"): {
        "mrp_paise": 27000,
        "selling_price_paise": 25000,
        "stock_qty": 50,
        "availability": "active",
    },
    ("ret-ravi-1", "var-oil-sunflower-5l"): {
        "mrp_paise": 130000,
        "selling_price_paise": 120000,
        "stock_qty": 20,
        "availability": "active",
    },
    ("ret-ravi-1", "var-dal-toor-500g"): {
        "mrp_paise": 11000,
        "selling_price_paise": 10000,
        "stock_qty": 80,
        "availability": "active",
    },
    ("ret-ravi-1", "var-dal-toor-1kg"): {
        "mrp_paise": 21000,
        "selling_price_paise": 19500,
        "stock_qty": 80,
        "availability": "active",
    },
    ("ret-ravi-1", "var-atta-5kg"): {
        "mrp_paise": 26000,
        "selling_price_paise": 24000,
        "stock_qty": 60,
        "availability": "active",
    },
    # Daily Needs Mart (Lakeview)
    ("ret-farah-2", "var-rice-sona-5kg"): {
        "mrp_paise": 34000,
        "selling_price_paise": 32000,
        "stock_qty": 50,
        "availability": "active",
    },
    ("ret-farah-2", "var-rice-basmati-5kg"): {
        "mrp_paise": 34000,
        "selling_price_paise": 32000,
        "stock_qty": 50,
        "availability": "active",
    },
    ("ret-farah-2", "var-sugar-1kg"): {
        "mrp_paise": 8000,
        "selling_price_paise": 7600,
        "stock_qty": 50,
        "availability": "active",
    },
    ("ret-farah-2", "var-oil-sunflower-1l"): {
        "mrp_paise": 27000,
        "selling_price_paise": 25500,
        "stock_qty": 50,
        "availability": "active",
    },
    ("ret-farah-2", "var-dal-toor-500g"): {
        "mrp_paise": 11000,
        "selling_price_paise": 10500,
        "stock_qty": 50,
        "availability": "active",
    },
}


def get_variant_by_id(variant_id: str) -> tuple[dict | None, dict | None]:
    """Returns (product, variant) for a given variant_id."""
    for prod in PRODUCTS:
        for v in prod["variants"]:
            if v["id"] == variant_id:
                return prod, v
    return None, None


@router.get("/categories")
def get_categories():
    return {"categories": CATEGORIES}


@router.get("/products")
def get_products(
    category: str | None = Query(None),
    q: str | None = Query(None),
    pact_session: str | None = Cookie(None),
    authorization: str | None = Header(None),
):
    token = pact_session
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    user = get_user_from_token(token)

    # Determine assigned retailer for customer
    # Default is Sri Lakshmi Stores (ret-ravi-1) for Green Meadows
    assigned_retailer_id = "ret-ravi-1"
    if user and user.get("community_id") == "comm-lake-1":
        assigned_retailer_id = "ret-farah-2"

    results = []
    q_lower = q.strip().lower() if q else ""

    for prod in PRODUCTS:
        # Category filter
        if category and category != "All":
            if prod["category_id"] != category and prod["category_name"] != category:
                continue

        # Search query matching name, brand, aliases
        if q_lower:
            name_match = q_lower in prod["name"].lower()
            brand_match = q_lower in prod["brand"].lower()
            alias_match = any(q_lower in a.lower() for a in prod.get("aliases", []))
            if not (name_match or brand_match or alias_match):
                continue

        # Look for active variants listed by assigned store (D13)
        available_variants = []
        min_selling_paise = None
        min_mrp_paise = None

        for v in prod["variants"]:
            listing = RETAILER_LISTINGS.get((assigned_retailer_id, v["id"]))
            if listing and listing.get("availability") == "active":
                v_copy = {
                    **v,
                    "selling_price_paise": listing["selling_price_paise"],
                    "mrp_paise": listing["mrp_paise"],
                }
                available_variants.append(v_copy)

                if min_selling_paise is None or listing["selling_price_paise"] < min_selling_paise:
                    min_selling_paise = listing["selling_price_paise"]
                    min_mrp_paise = listing["mrp_paise"]

        # Only products that have at least one active listed variant appear per D13
        if available_variants:
            # Per R3: explicit allow-list, never reveal store id, name, or SKU to customer!
            results.append({
                "id": prod["id"],
                "name": prod["name"],
                "brand": prod["brand"],
                "category_id": prod["category_id"],
                "category_name": prod["category_name"],
                "image_url": prod["image_url"],
                "est_unit_price_paise": min_selling_paise,
                "mrp_paise": min_mrp_paise,
                "variants": available_variants,
            })

    return {"products": results}


@router.get("/products/{product_id}")
def get_product(product_id: str):
    for prod in PRODUCTS:
        if prod["id"] == product_id:
            return {"product": prod}
    return {"error": {"code": "NOT_FOUND", "message": "Product not found"}}
