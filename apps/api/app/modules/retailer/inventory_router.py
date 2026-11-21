from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Cookie, Header, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.modules.auth.router import get_user_from_token
from app.modules.catalogue.router import PRODUCTS, RETAILER_LISTINGS

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


def get_current_retailer_id(
    authorization: str | None = None,
    pact_token: str | None = None,
) -> str:
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    elif pact_token:
        token = pact_token

    if token:
        user = get_user_from_token(token)
        if user and user.get("role") == "retailer":
            return user.get("retailer_id") or "ret-ravi-1"

    # Default to Sri Lakshmi Stores for dev
    return "ret-ravi-1"


@router.get("")
def list_retailer_inventory(
    q: str | None = Query(None),
    category: str | None = Query(None),
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    Returns full list of inventory items listed by the retailer (50-100 items).
    """
    retailer_id = get_current_retailer_id(authorization, pact_token)
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

    return {"inventory": items, "total_count": len(items)}


@router.patch("/{variant_id}")
def update_inventory_item(
    variant_id: str,
    req: UpdateInventoryItemRequest,
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    Updates price or stock quantity for an inventory item.
    Enforces selling_price <= mrp.
    """
    retailer_id = get_current_retailer_id(authorization, pact_token)
    key = (retailer_id, variant_id)
    listing = RETAILER_LISTINGS.get(key)
    if not listing:
        raise HTTPException(status_code=404, detail="Inventory item not found for this store")

    mrp = req.mrp_paise if req.mrp_paise is not None else listing.get("mrp_paise", 0)
    selling = req.selling_price_paise if req.selling_price_paise is not None else listing.get("selling_price_paise", 0)

    if selling > mrp:
        raise HTTPException(
            status_code=422,
            detail=f"Selling price (₹{selling/100:.2f}) cannot exceed MRP (₹{mrp/100:.2f})",
        )

    if req.stock_qty is not None:
        listing["stock_qty"] = req.stock_qty
    if req.selling_price_paise is not None:
        listing["selling_price_paise"] = req.selling_price_paise
    if req.mrp_paise is not None:
        listing["mrp_paise"] = req.mrp_paise

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
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    Records a new supplier inventory bill / inward receipt.
    Increases stock_qty for each received item.
    """
    retailer_id = get_current_retailer_id(authorization, pact_token)
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

    return {
        "success": True,
        "message": f"Successfully updated stock for {len(updated_items)} products from invoice {req.invoice_no}.",
        "inward_record": inward_record,
        "updated_items": updated_items,
    }


@router.get("/inward/history")
def list_inward_history():
    return {"inward_bills": list(reversed(INWARD_BILLS))}
