from datetime import datetime, timedelta

from fastapi import APIRouter, status
from pydantic import BaseModel

from app.core.clock import BUSINESS_TZ, now_utc, set_clock_override
from app.core.config import settings
from app.core.errors import AppError
from app.modules.cart.cutoff import perform_cutoff_for_cart
from app.modules.cart.cycle import (
    CART_ITEMS,
    ensure_open_cart,
)

router = APIRouter(prefix="/dev", tags=["dev"])


class LockNowIn(BaseModel):
    community_id: str = "comm-green-1"


class ClockSetIn(BaseModel):
    iso_time: str | None = None
    offset_hours: int | None = None


@router.post("/cycle/lock-now")
def dev_lock_now(body: LockNowIn):
    if settings.ENVIRONMENT not in ("dev", "test"):
        raise AppError(
            code="FORBIDDEN",
            message="Dev endpoints are not available outside dev environment.",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    # Find community's cart
    assigned_retailer = "ret-ravi-1" if body.community_id == "comm-green-1" else "ret-farah-2"
    cart = ensure_open_cart(body.community_id, assigned_retailer)

    # Perform cutoff
    order = perform_cutoff_for_cart(cart)
    return {
        "message": "Cutoff executed",
        "cart_status": cart["status"],
        "order": order,
    }


@router.post("/clock/set")
def dev_set_clock(body: ClockSetIn):
    if settings.ENVIRONMENT not in ("dev", "test"):
        raise AppError(
            code="FORBIDDEN",
            message="Dev endpoints are not available outside dev environment.",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    if body.iso_time:
        dt = datetime.fromisoformat(body.iso_time.replace("Z", "+00:00"))
        set_clock_override(dt)
    elif body.offset_hours is not None:
        new_time = now_utc() + timedelta(hours=body.offset_hours)
        set_clock_override(new_time)
    else:
        set_clock_override(None)

    return {
        "message": "Clock updated",
        "current_utc": now_utc().isoformat(),
        "current_ist": now_utc().astimezone(BUSINESS_TZ).isoformat(),
    }


@router.post("/seed/golden")
def dev_seed_golden():
    """Seeds the 4 residents' cart lines from Golden Scenario G."""
    if settings.ENVIRONMENT not in ("dev", "test"):
        raise AppError(
            code="FORBIDDEN",
            message="Dev endpoints are not available outside dev environment.",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    comm_id = "comm-green-1"
    cart = ensure_open_cart(comm_id, "ret-ravi-1")
    cart_id = cart["id"]

    # G Residents:
    # Asha: Rice 5kg x 1, Sugar 1kg x 2, Sunflower Oil 1L x 1, Toor Dal 500g x 1 -> ₹800
    # Bharat: Rice 5kg x 2 -> ₹600
    # Chitra: Rice 5kg x 1, Toor Dal 500g x 1 -> ₹400
    # Dev: Rice 5kg x 2, Toor Dal 500g x 1 -> ₹700

    g_lines = [
        # Asha (usr-asha-1)
        (cart_id, "usr-asha-1", "var-rice-sona-5kg", 1),
        (cart_id, "usr-asha-1", "var-sugar-1kg", 2),
        (cart_id, "usr-asha-1", "var-oil-sunflower-1l", 1),
        (cart_id, "usr-asha-1", "var-dal-toor-500g", 1),
        # Bharat (usr-bharat-2)
        (cart_id, "usr-bharat-2", "var-rice-sona-5kg", 2),
        # Chitra (usr-chitra-3)
        (cart_id, "usr-chitra-3", "var-rice-sona-5kg", 1),
        (cart_id, "usr-chitra-3", "var-dal-toor-500g", 1),
        # Dev (usr-dev-4)
        (cart_id, "usr-dev-4", "var-rice-sona-5kg", 2),
        (cart_id, "usr-dev-4", "var-dal-toor-500g", 1),
    ]

    for c_id, cust_id, var_id, qty in g_lines:
        CART_ITEMS[(c_id, cust_id, var_id)] = {
            "cart_id": c_id,
            "customer_id": cust_id,
            "variant_id": var_id,
            "quantity": qty,
        }

    return {"message": "Golden Scenario G cart lines seeded", "line_count": len(g_lines)}
