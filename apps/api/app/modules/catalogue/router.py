
import json
import os
from pathlib import Path
import re
import uuid
from fastapi import APIRouter, Cookie, Header, Query
from pydantic import BaseModel, Field

from app.core.errors import AppError
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
PRODUCTS = list(EXPANDED_PRODUCTS)

# Retailer Inventory Listings: (retailer_id, variant_id) -> dict
RETAILER_LISTINGS: dict[tuple[str, str], dict] = dict(EXPANDED_RETAILER_LISTINGS)

CATALOGUE_STORE_FILE = Path(__file__).parent / "catalogue_store.json"


def save_catalogue_store():
    try:
        listings_serialized = {
            f"{k[0]}::{k[1]}": v
            for k, v in RETAILER_LISTINGS.items()
        }
        data = {
            "PRODUCTS": PRODUCTS,
            "RETAILER_LISTINGS": listings_serialized,
        }
        with open(CATALOGUE_STORE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)
    except Exception:
        pass


def load_catalogue_store():
    if CATALOGUE_STORE_FILE.exists():
        try:
            with open(CATALOGUE_STORE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data.get("PRODUCTS"):
                    PRODUCTS.clear()
                    PRODUCTS.extend(data["PRODUCTS"])
                if data.get("RETAILER_LISTINGS"):
                    RETAILER_LISTINGS.clear()
                    for k_str, v in data["RETAILER_LISTINGS"].items():
                        parts = k_str.split("::")
                        if len(parts) == 2:
                            RETAILER_LISTINGS[(parts[0], parts[1])] = v
        except Exception:
            pass


load_catalogue_store()


class CreateProductRequest(BaseModel):
    name: str = Field(min_length=2)
    brand: str = Field(min_length=1)
    category_id: str | None = None
    category_name: str = Field(min_length=2)
    variant_label: str = Field(min_length=1)
    pack_size: float = Field(default=1.0, gt=0)
    pack_unit: str = Field(default="kg")
    mrp_paise: int = Field(gt=0)
    selling_price_paise: int = Field(gt=0)
    stock_qty: int = Field(default=50, ge=0)
    image_url: str | None = None


def create_new_product_and_listing(req: CreateProductRequest, retailer_id: str = "ret-ravi-1") -> dict:
    if req.selling_price_paise > req.mrp_paise:
        raise AppError(
            code="INVALID_PRICE",
            message=f"Selling price (₹{req.selling_price_paise/100:.2f}) cannot exceed MRP (₹{req.mrp_paise/100:.2f}).",
            status_code=422,
        )

    slug = re.sub(r"[^a-z0-9]+", "-", req.name.lower()).strip("-")
    v_slug = re.sub(r"[^a-z0-9]+", "-", req.variant_label.lower()).strip("-")
    uid = uuid.uuid4().hex[:6]
    prod_id = f"prod-{slug}-{uid}"
    variant_id = f"var-{slug}-{v_slug}-{uid}"

    matched_cat = None
    for c in CATEGORIES:
        if c["name"].lower() == req.category_name.lower() or c["id"] == req.category_id or c["slug"] == req.category_name.lower():
            matched_cat = c
            break

    cat_id = matched_cat["id"] if matched_cat else (req.category_id or "cat-1")
    cat_name = matched_cat["name"] if matched_cat else req.category_name

    img = req.image_url or "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80"

    new_variant = {
        "id": variant_id,
        "label": req.variant_label,
        "pack_size": req.pack_size,
        "pack_unit": req.pack_unit,
        "base_qty": int(req.pack_size * (1000 if req.pack_unit in ("kg", "l") else 1)),
        "base_unit": "g" if req.pack_unit == "kg" else ("ml" if req.pack_unit == "l" else req.pack_unit),
    }

    new_product = {
        "id": prod_id,
        "category_id": cat_id,
        "category_name": cat_name,
        "name": req.name,
        "brand": req.brand,
        "image_url": img,
        "aliases": [req.name.lower(), req.brand.lower(), req.variant_label.lower()],
        "variants": [new_variant],
    }

    PRODUCTS.append(new_product)

    listing = {
        "mrp_paise": req.mrp_paise,
        "selling_price_paise": req.selling_price_paise,
        "stock_qty": req.stock_qty,
        "availability": "active",
    }
    RETAILER_LISTINGS[(retailer_id, variant_id)] = listing
    RETAILER_LISTINGS[("ret-ravi-1", variant_id)] = listing
    RETAILER_LISTINGS[("ret-farah-2", variant_id)] = listing

    save_catalogue_store()

    return {
        "success": True,
        "product_id": prod_id,
        "variant_id": variant_id,
        "product": new_product,
        "variant": new_variant,
        "listing": listing,
    }


@router.post("/products")
def add_catalogue_product(req: CreateProductRequest):
    return create_new_product_and_listing(req)


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
            if not listing or listing.get("availability") != "active":
                # Fallback to general retailer inventory listing
                listing = RETAILER_LISTINGS.get(("ret-ravi-1", v["id"])) or RETAILER_LISTINGS.get(("ret-farah-2", v["id"]))

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
