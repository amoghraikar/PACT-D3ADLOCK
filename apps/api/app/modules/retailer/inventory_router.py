from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Cookie, Depends, Header, Query, status
from pydantic import BaseModel, Field

from app.core.deps import get_retailer_id
from app.core.errors import AppError
from app.modules.catalogue.router import (
    PRODUCTS,
    RETAILER_LISTINGS,
    CreateProductRequest,
    create_new_product_and_listing,
    save_catalogue_store,
)

router = APIRouter(prefix="/retailer/inventory", tags=["retailer-inventory"])


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


INWARD_BILLS: list[dict[str, Any]] = []


class UpdateInventoryItemRequest(BaseModel):
    stock_qty: int | None = Field(default=None, ge=0)
    selling_price_paise: int | None = Field(default=None, gt=0)
    mrp_paise: int | None = Field(default=None, gt=0)


class InwardItem(BaseModel):
    variant_id: str
    added_stock: int = Field(gt=0)
    purchase_price_paise: int | None = Field(default=None, ge=0)


class StockInwardRequest(BaseModel):
    supplier_name: str = Field(min_length=1)
    invoice_no: str = Field(min_length=1)
    invoice_date: str = Field(min_length=4)
    items: list[InwardItem] = Field(min_length=1)


class AutoReorderItem(BaseModel):
    variant_id: str
    reorder_qty: int = Field(gt=0)
    supplier_name: str = Field(default="Preferred Wholesale Partner")
    wholesale_rate_paise: int | None = Field(default=None, ge=0)


class AutoReorderRequest(BaseModel):
    items: list[AutoReorderItem] = Field(min_length=1)


@router.get("")
def list_retailer_inventory(
    q: str | None = Query(None, description="Search by name, brand, or variant"),
    category: str | None = Query(None, description="Filter by category ID or name"),
    low_stock: bool = Query(False, description="Show only low-stock / out-of-stock items"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=50, ge=1, le=200, description="Items per page"),
    retailer_id: str = Depends(get_retailer_id),
):
    """
    Returns full list of inventory items listed by the retailer.
    Supports search, category filter, low-stock filter, and pagination.
    """
    items = []
    q_lower = q.strip().lower() if q else ""

    for prod in PRODUCTS:
        if category and category != "All":
            if prod["category_id"] != category and prod["category_name"] != category:
                continue

        p_name = prod["name"]
        p_brand = prod["brand"]

        for v in prod["variants"]:
            vid = v["id"]
            listing = RETAILER_LISTINGS.get((retailer_id, vid))
            if not listing:
                continue

            # Search filter
            if q_lower:
                match = (
                    q_lower in p_name.lower()
                    or q_lower in p_brand.lower()
                    or q_lower in v["label"].lower()
                    or any(q_lower in a.lower() for a in prod.get("aliases", []))
                )
                if not match:
                    continue

            stock = listing.get("stock_qty", 0)
            status_label = "in_stock"
            if stock == 0:
                status_label = "out_of_stock"
            elif stock <= 25:
                status_label = "low_stock"

            # Low-stock filter
            if low_stock and status_label == "in_stock":
                continue

            items.append({
                "variant_id": vid,
                "product_id": prod["id"],
                "product_name": p_name,
                "brand": p_brand,
                "category_id": prod["category_id"],
                "category_name": prod["category_name"],
                "variant_label": v["label"],
                "pack_size": v.get("pack_size", 1),
                "pack_unit": v.get("pack_unit", "kg"),
                "mrp_paise": listing.get("mrp_paise", 0),
                "selling_price_paise": listing.get("selling_price_paise", 0),
                "stock_qty": stock,
                "status": status_label,
                "availability": listing.get("availability", "active"),
                "low_stock_threshold": 25,
            })

    total = len(items)
    offset = (page - 1) * limit
    paged = items[offset : offset + limit]
    pages = max(1, (total + limit - 1) // limit)

    return {
        "inventory": paged,
        "meta": {"total": total, "page": page, "limit": limit, "pages": pages},
    }


@router.patch("/{variant_id}")
def update_inventory_item(
    variant_id: str,
    req: UpdateInventoryItemRequest,
    retailer_id: str = Depends(get_retailer_id),
):
    """
    Updates price or stock quantity for an inventory item.
    Enforces selling_price <= mrp.
    """
    key = (retailer_id, variant_id)
    listing = RETAILER_LISTINGS.get(key)
    if not listing:
        raise AppError(
            code="NOT_FOUND",
            message="Inventory item not found for this store",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    mrp = req.mrp_paise if req.mrp_paise is not None else listing.get("mrp_paise", 0)
    selling = req.selling_price_paise if req.selling_price_paise is not None else listing.get("selling_price_paise", 0)

    if selling > mrp:
        raise AppError(
            code="INVALID_PRICE",
            message=f"Selling price (₹{selling/100:.2f}) cannot exceed MRP (₹{mrp/100:.2f})",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    if req.stock_qty is not None:
        listing["stock_qty"] = req.stock_qty
    if req.selling_price_paise is not None:
        listing["selling_price_paise"] = req.selling_price_paise
    if req.mrp_paise is not None:
        listing["mrp_paise"] = req.mrp_paise

    save_catalogue_store()

    return {
        "success": True,
        "variant_id": variant_id,
        "stock_qty": listing["stock_qty"],
        "selling_price_paise": listing["selling_price_paise"],
        "mrp_paise": listing["mrp_paise"],
    }


@router.post("/inward")
def record_stock_inward(
    req: StockInwardRequest,
    retailer_id: str = Depends(get_retailer_id),
):
    """
    Records a new supplier inventory bill / inward receipt.
    Increases stock_qty for each received item.
    """
    updated_items = []

    for item in req.items:
        key = (retailer_id, item.variant_id)
        listing = RETAILER_LISTINGS.get(key)
        if listing:
            listing["stock_qty"] = listing.get("stock_qty", 0) + item.added_stock
            updated_items.append({
                "variant_id": item.variant_id,
                "added_stock": item.added_stock,
                "new_stock_qty": listing["stock_qty"],
            })

    inward_record = {
        "id": f"inward-{len(INWARD_BILLS) + 1}",
        "retailer_id": retailer_id,
        "supplier_name": req.supplier_name,
        "invoice_no": req.invoice_no,
        "invoice_date": req.invoice_date,
        "items_count": len(req.items),
        "total_units_added": sum(it.added_stock for it in req.items),
        "created_at": now_utc().isoformat(),
    }
    INWARD_BILLS.append(inward_record)

    save_catalogue_store()

    return {
        "success": True,
        "message": f"Successfully updated stock for {len(updated_items)} products from invoice {req.invoice_no}.",
        "inward_record": inward_record,
        "updated_items": updated_items,
    }


@router.post("/auto-reorder")
def auto_reorder_low_stock(
    req: AutoReorderRequest,
    retailer_id: str = Depends(get_retailer_id),
):
    """
    1-Click Auto Restock for low stock items.
    Places consolidated purchase orders and increments inventory stock counts immediately.
    """
    updated_items = []
    suppliers_map: dict[str, list[dict]] = {}

    for item in req.items:
        key = (retailer_id, item.variant_id)
        listing = RETAILER_LISTINGS.get(key)
        if listing:
            prev_stock = listing.get("stock_qty", 0)
            listing["stock_qty"] = prev_stock + item.reorder_qty
            updated_info = {
                "variant_id": item.variant_id,
                "reordered_qty": item.reorder_qty,
                "prev_stock": prev_stock,
                "new_stock_qty": listing["stock_qty"],
                "supplier_name": item.supplier_name,
            }
            updated_items.append(updated_info)
            suppliers_map.setdefault(item.supplier_name, []).append(updated_info)

    # Generate inward bill entries for each supplier
    today_str = now_utc().strftime("%Y-%m-%d")
    batch_records = []
    for sup_name, sup_items in suppliers_map.items():
        inv_no = f"PO-RESTOCK-{now_utc().strftime('%m%d%H%M')}-{len(batch_records)+1}"
        record = {
            "id": f"inward-{len(INWARD_BILLS) + 1}",
            "retailer_id": retailer_id,
            "supplier_name": sup_name,
            "invoice_no": inv_no,
            "invoice_date": today_str,
            "items_count": len(sup_items),
            "total_units_added": sum(it["reordered_qty"] for it in sup_items),
            "created_at": now_utc().isoformat(),
        }
        INWARD_BILLS.append(record)
        batch_records.append(record)

    total_units = sum(it.reorder_qty for it in req.items)
    supplier_names_list = list(suppliers_map.keys())

    save_catalogue_store()

    return {
        "success": True,
        "message": f"Successfully confirmed restock purchase orders! Added {total_units} units across {len(updated_items)} items from {len(supplier_names_list)} distributors.",
        "total_units_restocked": total_units,
        "suppliers_notified": supplier_names_list,
        "purchase_orders": batch_records,
        "updated_items": updated_items,
    }


@router.get("/inward/history")
def list_inward_history(retailer_id: str = Depends(get_retailer_id)):
    retailer_bills = [b for b in INWARD_BILLS if b.get("retailer_id") == retailer_id]
    return {"inward_bills": list(reversed(retailer_bills))}


@router.post("/add-product")
def add_inventory_product(
    req: CreateProductRequest,
    retailer_id: str = Depends(get_retailer_id),
):
    """
    Retailer adds a new product to catalogue and lists it in their inventory.
    Saves to store and makes it immediately available to community customers.
    """
    return create_new_product_and_listing(req, retailer_id)
