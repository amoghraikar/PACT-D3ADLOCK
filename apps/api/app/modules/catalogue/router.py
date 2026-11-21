
from fastapi import APIRouter, Cookie, Header, Query

from app.modules.auth.router import get_user_from_token
from app.modules.catalogue.products_data import EXPANDED_PRODUCTS, EXPANDED_RETAILER_LISTINGS

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

# Central Products and Variants (60+ across 12 categories)
PRODUCTS = EXPANDED_PRODUCTS

# Retailer Inventory Listings: (retailer_id, variant_id) -> dict
RETAILER_LISTINGS: dict[tuple[str, str], dict] = EXPANDED_RETAILER_LISTINGS


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
