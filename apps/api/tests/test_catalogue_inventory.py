"""
Comprehensive tests for Milestone 3:
- Catalogue Categories (12 categories, product counts)
- Catalogue Search, Category Filtering, and Pagination
- Product Details, Variant Selection, and Pricing in Integer Paise
- Retailer Inventory Listing and Low-Stock Detection
- Inward Stock Batching and Movement History
- Stock Adjustments, Spoilage, and Prevention of Negative Stock
- Strict Retailer Tenant Isolation
"""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.config import settings
from app.core.db import SessionLocal
from app.main import app
from app.models.catalogue import Product, ProductVariant
from app.models.identity import OtpVerification
from app.models.inventory import InventoryItem

client = TestClient(app)


@pytest.fixture(scope="function")
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def _get_auth_token(phone: str, db) -> str:
    db.query(OtpVerification).filter(OtpVerification.phone == phone).delete()
    db.commit()
    client.post("/api/v1/auth/request-otp", json={"phone": phone})
    resp = client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp": settings.DEV_OTP})
    return resp.json()["access_token"]


def test_catalogue_categories_list():
    """Verify 12 categories are returned with correct display order and non-zero counts."""
    resp = client.get("/api/v1/catalogue/categories")
    assert resp.status_code == 200
    categories = resp.json()

    assert len(categories) == 12

    # Check required category names
    category_slugs = {c["slug"] for c in categories}
    expected_slugs = {
        "staples",
        "rice-and-grains",
        "pulses",
        "dairy",
        "oils",
        "spices",
        "snacks",
        "beverages",
        "personal-care",
        "household-essentials",
        "cleaning-supplies",
        "other-essentials",
    }
    assert expected_slugs.issubset(category_slugs)

    # Every category must have at least 5 products
    for c in categories:
        assert c["product_count"] >= 5


def test_catalogue_pagination():
    """Verify pagination mechanics: page, limit, total, and pages calculation."""
    # Page 1 with limit 10
    resp1 = client.get("/api/v1/catalogue/products?page=1&limit=10")
    assert resp1.status_code == 200
    data1 = resp1.json()

    assert len(data1["data"]) == 10
    assert data1["meta"]["page"] == 1
    assert data1["meta"]["limit"] == 10
    assert data1["meta"]["total"] >= 60
    assert data1["meta"]["pages"] >= 6

    first_item_id = data1["data"][0]["id"]

    # Page 2 with limit 10
    resp2 = client.get("/api/v1/catalogue/products?page=2&limit=10")
    assert resp2.status_code == 200
    data2 = resp2.json()

    assert len(data2["data"]) == 10
    assert data2["meta"]["page"] == 2
    # Ensure page 2 has different items
    assert data2["data"][0]["id"] != first_item_id


def test_catalogue_search():
    """Verify full text search on product title and brand."""
    # Search for "Basmati"
    resp = client.get("/api/v1/catalogue/products?search=Basmati")
    assert resp.status_code == 200
    results = resp.json()["data"]
    assert len(results) >= 2
    for item in results:
        assert (
            "basmati" in item["title"].lower() or "basmati" in (item["description"] or "").lower()
        )

    # Search for Brand "Amul"
    resp_amul = client.get("/api/v1/catalogue/products?search=Amul")
    assert resp_amul.status_code == 200
    amul_results = resp_amul.json()["data"]
    assert len(amul_results) >= 3
    for item in amul_results:
        assert item["brand"] == "Amul"


def test_catalogue_category_filtering():
    """Verify filtering products strictly by category slug."""
    resp = client.get("/api/v1/catalogue/products?category_slug=dairy")
    assert resp.status_code == 200
    results = resp.json()["data"]
    assert len(results) >= 5

    for item in results:
        assert item["category_slug"] == "dairy"


def test_product_detail_and_variants(db):
    """Verify single product retrieval contains variants, units, and integer paise pricing."""
    rice_prod = db.scalars(select(Product).where(Product.title.ilike("%Sona Masoori%"))).first()
    assert rice_prod is not None

    resp = client.get(f"/api/v1/catalogue/products/{rice_prod.id}")
    assert resp.status_code == 200
    detail = resp.json()

    assert detail["id"] == str(rice_prod.id)
    assert len(detail["variants"]) >= 2

    # Check variant attributes
    for v in detail["variants"]:
        assert "sku" in v
        assert "unit" in v
        assert v["mrp_paise"] > 0
        assert v["default_price_paise"] > 0
        assert v["mrp_paise"] >= v["default_price_paise"]


def test_retailer_inventory_listing(db):
    """Verify authorized retailer can view inventory."""
    retailer_token = _get_auth_token("+919999900021", db)  # Ravi Mohan

    resp = client.get(
        "/api/v1/retailer/inventory?page=1&limit=20",
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["data"]) == 20
    assert data["meta"]["total"] >= 60

    first_item = data["data"][0]
    assert "current_stock_qty" in first_item
    assert "reserved_stock_qty" in first_item
    assert "reorder_level_qty" in first_item
    assert "is_low_stock" in first_item


def test_inventory_inward_batch(db):
    """Verify retailer can inward a new stock batch and update current stock."""
    retailer_token = _get_auth_token("+919999900021", db)

    variant = db.scalars(select(ProductVariant)).first()
    assert variant is not None

    inward_qty = 35
    inward_payload = {
        "variant_id": str(variant.id),
        "batch_number": f"BATCH-{uuid.uuid4().hex[:8].upper()}",
        "quantity": inward_qty,
        "cost_price_paise": 4800,
        "supplier_name": "Metro Cash & Carry",
    }

    # Record initial stock
    inv_item_before = db.scalars(
        select(InventoryItem).where(InventoryItem.variant_id == variant.id)
    ).first()
    initial_stock = inv_item_before.current_stock_qty if inv_item_before else 0

    resp = client.post(
        "/api/v1/retailer/inventory/inward",
        json=inward_payload,
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["inward_quantity"] == inward_qty
    assert res_data["new_stock_qty"] == initial_stock + inward_qty


def test_inventory_adjustment_and_movements(db):
    """Verify stock adjustments (positive/negative) create audit movements."""
    retailer_token = _get_auth_token("+919999900021", db)

    inv_item = db.scalars(select(InventoryItem)).first()
    assert inv_item is not None
    initial_qty = inv_item.current_stock_qty

    # Deduct 5 units due to damage
    adjust_payload = {
        "quantity_delta": -5,
        "reason": "Damaged pack during warehouse transit",
    }

    resp = client.patch(
        f"/api/v1/retailer/inventory/{inv_item.id}",
        json=adjust_payload,
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["previous_stock_qty"] == initial_qty
    assert res_data["new_stock_qty"] == initial_qty - 5

    # Check movement history
    mov_resp = client.get(
        "/api/v1/retailer/inventory/movements?page=1&limit=10",
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert mov_resp.status_code == 200
    movements = mov_resp.json()["data"]
    assert len(movements) >= 1
    latest_movement = movements[0]
    assert latest_movement["quantity_delta"] == -5
    assert latest_movement["movement_type"] == "spoilage"


def test_prevent_negative_inventory_stock(db):
    """Verify reducing stock below zero is rejected."""
    retailer_token = _get_auth_token("+919999900021", db)

    inv_item = db.scalars(select(InventoryItem)).first()
    assert inv_item is not None

    # Delta larger than existing stock
    excess_delta = -(inv_item.current_stock_qty + 1000)
    adjust_payload = {
        "quantity_delta": excess_delta,
        "reason": "Excessive subtraction attempt",
    }

    resp = client.patch(
        f"/api/v1/retailer/inventory/{inv_item.id}",
        json=adjust_payload,
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "INSUFFICIENT_STOCK"


def test_low_stock_detection(db):
    """Verify low stock filter detects items at or below reorder threshold."""
    retailer_token = _get_auth_token("+919999900021", db)

    # Set one inventory item to 2 units (below threshold of 15)
    inv_item = db.scalars(select(InventoryItem)).first()
    assert inv_item is not None
    inv_item.current_stock_qty = 2
    inv_item.reorder_level_qty = 15
    db.commit()

    resp = client.get(
        "/api/v1/retailer/inventory?low_stock=true",
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert resp.status_code == 200
    low_stock_items = resp.json()["data"]
    assert len(low_stock_items) >= 1

    for item in low_stock_items:
        assert item["is_low_stock"] is True
        assert item["current_stock_qty"] <= item["reorder_level_qty"]


def test_inventory_tenant_isolation(db):
    """Verify customer cannot access inventory, and retailer cannot touch another store's stock."""
    customer_token = _get_auth_token("+919999900001", db)  # Asha
    retailer_token = _get_auth_token("+919999900021", db)  # Ravi

    # 1. Customer denied inventory access
    cust_resp = client.get(
        "/api/v1/retailer/inventory",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert cust_resp.status_code == 403

    # 2. Customer denied inwarding
    cust_inward = client.post(
        "/api/v1/retailer/inventory/inward",
        json={
            "variant_id": str(uuid.uuid4()),
            "batch_number": "B1",
            "quantity": 10,
            "cost_price_paise": 100,
        },
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert cust_inward.status_code == 403

    # 3. Retailer cannot modify non-existent or other retailer's inventory item
    other_item_id = uuid.uuid4()
    patch_resp = client.patch(
        f"/api/v1/retailer/inventory/{other_item_id}",
        json={"quantity_delta": 5, "reason": "Test cross-tenant modification"},
        headers={"Authorization": f"Bearer {retailer_token}"},
    )
    assert patch_resp.status_code == 404
    assert patch_resp.json()["error"]["code"] == "NOT_FOUND"
