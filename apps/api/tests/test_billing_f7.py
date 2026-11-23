"""
Comprehensive tests for Milestone 5: F7 Deterministic Billing Engine.

Covers:
1. Pure Functional Unit Tests:
   - Zero quantities (empty cart, zero requests)
   - Single household complete pack
   - Multiple households equal demand
   - Retailer short-packing with proportional allocation and remainder distribution
   - Out-of-stock items (0 packed) with zero charge to residents
   - Product-level and order-level discount distribution
   - Deterministic rounding remainder allocation (e.g., 100 paise delivery fee / 3 households)
   - Configurable delivery allocation mode (EQUAL vs PRO_RATA)
2. Property-Based Testing (Hypothesis):
   - Invariant: SUM(ALL RESIDENT INVOICES) == FINAL RETAILER BILL
   - 150 randomized test scenarios with varied households, variants, quantities, prices, discounts, and delivery fees
   - Zero discrepancy tolerance (discrepancy_paise == 0)
3. API & Database Integration Tests:
   - POST /api/v1/billing/calculate (standalone preview)
   - POST /api/v1/billing/bulk-orders/{order_id}/finalize (persistence & idempotency)
   - GET /api/v1/billing/invoices/me (resident's own invoices)
   - GET /api/v1/billing/invoices/{id} (invoice detail & tenant privacy)
   - GET /api/v1/billing/bills/{id} & /bulk-orders/{order_id}/bill (retailer bill retrieval)
"""

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from hypothesis import given
from hypothesis import settings as hyp_settings
from hypothesis import strategies as st
from sqlalchemy import select

from app.core.clock import set_clock_override
from app.core.config import settings
from app.core.db import SessionLocal
from app.main import app
from app.models.catalogue import ProductVariant
from app.models.identity import OtpVerification
from app.models.organization import Community
from app.modules.billing.engine import F7BillingEngine
from app.schemas.billing import (
    BillingCalculationInput,
    ResidentItemRequest,
    VariantPackInfo,
)

client = TestClient(app)


@pytest.fixture(scope="function")
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        set_clock_override(None)
        session.rollback()
        session.close()


def _get_auth_token(phone: str, db) -> str:
    db.query(OtpVerification).filter(OtpVerification.phone == phone).delete()
    db.commit()
    client.post("/api/v1/auth/request-otp", json={"phone": phone})
    resp = client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp": settings.DEV_OTP})
    return resp.json()["access_token"]


# ===========================================================================
# 1. PURE FUNCTIONAL UNIT TESTS
# ===========================================================================


def test_zero_quantities_and_empty_requests():
    """Empty or zero requests must result in 0 charges, 0 bill, 0 discrepancy."""
    inp = BillingCalculationInput(
        resident_requests=[],
        variant_packs=[],
        delivery_fee_paise=1000,
        order_discount_paise=200,
    )
    res = F7BillingEngine.calculate(inp)

    assert len(res.resident_invoices) == 0
    assert res.retailer_bill.gross_amount_paise == 0
    assert res.retailer_bill.net_amount_paise == 0
    assert res.audit_log.discrepancy_paise == 0
    assert res.audit_log.zero_discrepancy_verified is True


def test_single_household_full_packing():
    """Single resident ordering multiple items with 100% full packing."""
    u_id = "user_single_001"
    v1_id = "variant_rice_1kg"
    v2_id = "variant_milk_1l"

    inp = BillingCalculationInput(
        resident_requests=[
            ResidentItemRequest(user_id=u_id, variant_id=v1_id, requested_qty=3),
            ResidentItemRequest(user_id=u_id, variant_id=v2_id, requested_qty=2),
        ],
        variant_packs=[
            VariantPackInfo(
                variant_id=v1_id,
                packed_qty=3,
                unit_price_paise=6500,  # ₹65.00
                discount_paise=500,  # ₹5.00 discount
            ),
            VariantPackInfo(
                variant_id=v2_id,
                packed_qty=2,
                unit_price_paise=3200,  # ₹32.00
                discount_paise=0,
            ),
        ],
        delivery_fee_paise=1500,  # ₹15.00
        order_discount_paise=200,  # ₹2.00 order discount
    )

    res = F7BillingEngine.calculate(inp)

    assert len(res.resident_invoices) == 1
    inv = res.resident_invoices[0]

    # Gross: 3 * 6500 + 2 * 3200 = 19500 + 6400 = 25900 paise (₹259)
    # Discount: 500 (variant) + 200 (order) = 700 paise (₹7)
    # Delivery: 1500 paise
    # Total: 25900 - 700 + 1500 = 26700 paise (₹267)
    assert inv.base_amount_paise == 25900
    assert inv.discount_amount_paise == 700
    assert inv.delivery_fee_paise == 1500
    assert inv.total_amount_paise == 26700

    assert res.retailer_bill.gross_amount_paise == 25900
    assert res.retailer_bill.discount_amount_paise == 700
    assert res.retailer_bill.delivery_amount_paise == 1500
    assert res.retailer_bill.net_amount_paise == 26700

    assert res.audit_log.discrepancy_paise == 0
    assert res.audit_log.zero_discrepancy_verified is True


def test_short_packing_deterministic_allocation():
    """
    Short-packing scenario:
    3 households request Rice 5kg:
      Household A requests 4 units
      Household B requests 3 units
      Household C requests 3 units
    Total requested = 10 units.
    Retailer only packed 6 units (short-pack of 4 units).

    Proportional math:
      A: 4 * 6 / 10 = 2.4  -> base = 2, rem = 4
      B: 3 * 6 / 10 = 1.8  -> base = 1, rem = 8
      C: 3 * 6 / 10 = 1.8  -> base = 1, rem = 8
      Base sum = 2 + 1 + 1 = 4. Surplus units = 6 - 4 = 2.
      Remainders: B(8), C(8), A(4).
      B and C get remainder units first (tie-break between B and C by user_id string).
      Result: B gets 2, C gets 2, A gets 2.
      Total packed allocated = 2 + 2 + 2 = 6 units!
    """
    v_id = "rice_5kg"
    unit_price = 30000  # ₹300.00

    inp = BillingCalculationInput(
        resident_requests=[
            ResidentItemRequest(user_id="user_A", variant_id=v_id, requested_qty=4),
            ResidentItemRequest(user_id="user_B", variant_id=v_id, requested_qty=3),
            ResidentItemRequest(user_id="user_C", variant_id=v_id, requested_qty=3),
        ],
        variant_packs=[
            VariantPackInfo(variant_id=v_id, packed_qty=6, unit_price_paise=unit_price)
        ],
        delivery_fee_paise=300,
    )

    res = F7BillingEngine.calculate(inp)

    # Check consumed quantities
    allocated_by_user = {}
    for inv in res.resident_invoices:
        allocated_by_user[inv.user_id] = inv.items[0].packed_qty

    assert sum(allocated_by_user.values()) == 6
    assert allocated_by_user["user_B"] == 2
    assert allocated_by_user["user_C"] == 2
    assert allocated_by_user["user_A"] == 2

    # Verify mathematical invariant
    assert res.audit_log.discrepancy_paise == 0
    assert (
        sum(inv.total_amount_paise for inv in res.resident_invoices)
        == res.retailer_bill.net_amount_paise
    )


def test_out_of_stock_item_zero_charge():
    """
    Out of stock variant (packed_qty = 0):
    Residents must pay 0 paise for unavailable items.
    If a resident's entire cart was out of stock, they pay 0 delivery fee as well.
    """
    v_available = "sugar_1kg"
    v_oos = "ghee_500g"

    inp = BillingCalculationInput(
        resident_requests=[
            ResidentItemRequest(user_id="user_1", variant_id=v_available, requested_qty=2),
            ResidentItemRequest(user_id="user_2", variant_id=v_oos, requested_qty=1),
        ],
        variant_packs=[
            VariantPackInfo(variant_id=v_available, packed_qty=2, unit_price_paise=4800),
            VariantPackInfo(variant_id=v_oos, packed_qty=0, unit_price_paise=35000),
        ],
        delivery_fee_paise=500,
    )

    res = F7BillingEngine.calculate(inp)

    inv_map = {inv.user_id: inv for inv in res.resident_invoices}

    # user_2 ordered only ghee which was out of stock -> pays 0
    assert inv_map["user_2"].base_amount_paise == 0
    assert inv_map["user_2"].delivery_fee_paise == 0
    assert inv_map["user_2"].total_amount_paise == 0

    # user_1 is the sole active household -> pays for sugar + full delivery fee
    assert inv_map["user_1"].base_amount_paise == 9600
    assert inv_map["user_1"].delivery_fee_paise == 500
    assert inv_map["user_1"].total_amount_paise == 10100

    assert res.retailer_bill.net_amount_paise == 10100
    assert res.audit_log.discrepancy_paise == 0


def test_rounding_remainder_deterministic_paise():
    """
    Delivery fee of 100 paise split equally among 3 households:
    100 // 3 = 33 paise each.
    100 % 3 = 1 remainder paise.
    The 1 remainder paise must be deterministically allocated to the first household (alphabetical user_id).
    Households get: 34p, 33p, 33p.
    Sum = 100 paise.
    """
    v_id = "atta_5kg"
    inp = BillingCalculationInput(
        resident_requests=[
            ResidentItemRequest(user_id="user_01", variant_id=v_id, requested_qty=1),
            ResidentItemRequest(user_id="user_02", variant_id=v_id, requested_qty=1),
            ResidentItemRequest(user_id="user_03", variant_id=v_id, requested_qty=1),
        ],
        variant_packs=[
            VariantPackInfo(variant_id=v_id, packed_qty=3, unit_price_paise=22000)
        ],
        delivery_fee_paise=100,
        delivery_allocation_mode="EQUAL",
    )

    res = F7BillingEngine.calculate(inp)

    fees = {inv.user_id: inv.delivery_fee_paise for inv in res.resident_invoices}
    assert fees["user_01"] == 34
    assert fees["user_02"] == 33
    assert fees["user_03"] == 33
    assert sum(fees.values()) == 100

    assert res.audit_log.discrepancy_paise == 0
    assert res.audit_log.delivery_remainder_paise == 1


def test_delivery_pro_rata_allocation_mode():
    """
    Delivery fee allocated PRO_RATA based on resident subtotal.
    Resident A subtotal: ₹100 (10000 paise)
    Resident B subtotal: ₹300 (30000 paise)
    Delivery fee: 400 paise.
    Resident A fee: 100 paise.
    Resident B fee: 300 paise.
    """
    v1 = "item_1"
    v2 = "item_2"

    inp = BillingCalculationInput(
        resident_requests=[
            ResidentItemRequest(user_id="user_small", variant_id=v1, requested_qty=1),
            ResidentItemRequest(user_id="user_large", variant_id=v2, requested_qty=1),
        ],
        variant_packs=[
            VariantPackInfo(variant_id=v1, packed_qty=1, unit_price_paise=10000),
            VariantPackInfo(variant_id=v2, packed_qty=1, unit_price_paise=30000),
        ],
        delivery_fee_paise=400,
        delivery_allocation_mode="PRO_RATA",
    )

    res = F7BillingEngine.calculate(inp)

    invs = {inv.user_id: inv for inv in res.resident_invoices}
    assert invs["user_small"].delivery_fee_paise == 100
    assert invs["user_large"].delivery_fee_paise == 300
    assert res.audit_log.discrepancy_paise == 0


def test_multiple_discounts_variant_and_order():
    """
    Product-level discount applied only to purchasers of that variant.
    Order-level bulk discount applied across active households.
    """
    v_tea = "tea_250g"
    v_biscuit = "biscuit_pack"

    inp = BillingCalculationInput(
        resident_requests=[
            ResidentItemRequest(user_id="user_tea_only", variant_id=v_tea, requested_qty=2),
            ResidentItemRequest(user_id="user_both", variant_id=v_tea, requested_qty=1),
            ResidentItemRequest(user_id="user_both", variant_id=v_biscuit, requested_qty=2),
        ],
        variant_packs=[
            VariantPackInfo(
                variant_id=v_tea,
                packed_qty=3,
                unit_price_paise=15000,
                discount_paise=3000,  # ₹30 off tea only
            ),
            VariantPackInfo(
                variant_id=v_biscuit,
                packed_qty=2,
                unit_price_paise=3000,
                discount_paise=0,
            ),
        ],
        delivery_fee_paise=600,
        order_discount_paise=500,  # ₹5 general discount
    )

    res = F7BillingEngine.calculate(inp)

    # Tea gross: 3 * 15000 = 45000p.
    # Tea discount 3000p:
    # user_tea_only (2 units = 30000p): 2/3 of 3000 = 2000p
    # user_both (1 unit = 15000p): 1/3 of 3000 = 1000p
    invs = {inv.user_id: inv for inv in res.resident_invoices}

    assert invs["user_tea_only"].items[0].discount_paise == 2000
    tea_item_user_both = next(it for it in invs["user_both"].items if it.variant_id == v_tea)
    assert tea_item_user_both.discount_paise == 1000

    # Total discount across invoices must equal total discount on retailer bill
    total_inv_disc = sum(inv.discount_amount_paise for inv in res.resident_invoices)
    assert total_inv_disc == 3500
    assert res.retailer_bill.discount_amount_paise == 3500
    assert res.audit_log.discrepancy_paise == 0


# ===========================================================================
# 2. PROPERTY-BASED TESTING WITH HYPOTHESIS
# ===========================================================================


@given(
    num_households=st.integers(min_value=1, max_value=8),
    num_variants=st.integers(min_value=1, max_value=6),
    unit_prices=st.lists(
        st.integers(min_value=100, max_value=50000), min_size=6, max_size=6
    ),
    delivery_fee=st.integers(min_value=0, max_value=25000),
    order_discount=st.integers(min_value=0, max_value=10000),
    delivery_mode=st.sampled_from(["EQUAL", "PRO_RATA"]),
    data=st.data(),
)
@hyp_settings(max_examples=150, deadline=None)
def test_f7_mathematical_invariant_hypothesis(
    num_households: int,
    num_variants: int,
    unit_prices: list[int],
    delivery_fee: int,
    order_discount: int,
    delivery_mode: str,
    data: st.DataObject,
):
    """
    Hypothesis Property Test:
    Generates 150 randomized combinations of households, variants, requests,
    packed amounts, prices, discounts, and fee structures.

    INVARIANT UNDER TEST:
    SUM(ALL RESIDENT INVOICES) == FINAL RETAILER BILL
    Zero discrepancy tolerance: discrepancy_paise == 0.
    """
    user_ids = [f"usr_{i:02d}" for i in range(num_households)]
    variant_ids = [f"var_{j:02d}" for j in range(num_variants)]

    requests: list[ResidentItemRequest] = []
    variant_requested_totals: dict[str, int] = dict.fromkeys(variant_ids, 0)

    for u_id in user_ids:
        for v_id in variant_ids:
            qty = data.draw(st.integers(min_value=0, max_value=10))
            if qty > 0:
                requests.append(
                    ResidentItemRequest(user_id=u_id, variant_id=v_id, requested_qty=qty)
                )
                variant_requested_totals[v_id] += qty

    variant_packs: list[VariantPackInfo] = []
    for idx, v_id in enumerate(variant_ids):
        req_total = variant_requested_totals[v_id]
        packed_qty = data.draw(st.integers(min_value=0, max_value=max(1, req_total)))
        price = unit_prices[idx]
        max_disc = (packed_qty * price) // 2 if (packed_qty * price) > 0 else 0
        disc = data.draw(st.integers(min_value=0, max_value=max(0, max_disc)))

        variant_packs.append(
            VariantPackInfo(
                variant_id=v_id,
                packed_qty=packed_qty,
                unit_price_paise=price,
                discount_paise=disc,
            )
        )

    calc_input = BillingCalculationInput(
        resident_requests=requests,
        variant_packs=variant_packs,
        delivery_fee_paise=delivery_fee,
        order_discount_paise=order_discount,
        delivery_allocation_mode=delivery_mode,
    )

    result = F7BillingEngine.calculate(calc_input)

    # 1. INVARIANT CHECK: Sum of invoices == Retailer net bill
    sum_invoices = sum(inv.total_amount_paise for inv in result.resident_invoices)
    assert (
        sum_invoices == result.retailer_bill.net_amount_paise
    ), f"Mismatch: sum(inv)={sum_invoices}p != ret_net={result.retailer_bill.net_amount_paise}p"

    # 2. Audit log zero discrepancy verified
    assert result.audit_log.discrepancy_paise == 0
    assert result.audit_log.zero_discrepancy_verified is True

    # 3. Sum of consumed items per variant must not exceed packed_qty
    for vp in variant_packs:
        v_consumed = sum(
            next((it.packed_qty for it in inv.items if it.variant_id == vp.variant_id), 0)
            for inv in result.resident_invoices
        )
        assert (
            v_consumed <= vp.packed_qty
        ), f"Consumed {v_consumed} exceeds packed {vp.packed_qty} for {vp.variant_id}"

    # 4. No negative totals
    for inv in result.resident_invoices:
        assert (
            inv.total_amount_paise >= 0
        ), f"Resident {inv.user_id} invoice is negative: {inv.total_amount_paise}"


# ===========================================================================
# 3. FASTAPI API & PERSISTENCE INTEGRATION TESTS
# ===========================================================================


def test_api_calculate_preview_endpoint():
    """POST /api/v1/billing/calculate returns deterministic calculation preview."""
    payload = {
        "resident_requests": [
            {"user_id": "u1", "variant_id": "v1", "requested_qty": 5},
            {"user_id": "u2", "variant_id": "v1", "requested_qty": 3},
        ],
        "variant_packs": [
            {"variant_id": "v1", "packed_qty": 8, "unit_price_paise": 2000, "discount_paise": 400}
        ],
        "delivery_fee_paise": 500,
        "delivery_allocation_mode": "EQUAL",
    }
    resp = client.post("/api/v1/billing/calculate", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["audit_log"]["zero_discrepancy_verified"] is True
    assert data["audit_log"]["discrepancy_paise"] == 0
    assert len(data["resident_invoices"]) == 2
    assert data["retailer_bill"]["gross_amount_paise"] == 16000
    assert data["retailer_bill"]["discount_amount_paise"] == 400
    assert data["retailer_bill"]["delivery_amount_paise"] == 500
    assert data["retailer_bill"]["net_amount_paise"] == 16100


def test_api_finalize_bulk_order_billing(db):
    """
    Full end-to-end flow:
    1. Consolidate a bulk order
    2. Finalize billing via POST /api/v1/billing/bulk-orders/{order_id}/finalize
    3. Verify RetailerBill and Invoices persisted in database
    4. Verify resident can fetch invoice via /invoices/me and /invoices/{id}
    5. Verify idempotency on second call
    """
    from app.models.billing import (
        DiscountAllocation,
        Invoice,
        InvoiceItem,
        PaymentRecord,
        Refund,
        RetailerBill,
    )
    from app.models.commerce import BulkOrder
    from app.repositories.cycle_repository import CycleRepository

    cust_token = _get_auth_token("+919999900001", db)  # Asha Sharma (Resident)
    admin_token = _get_auth_token("+919999900099", db)  # Platform Admin

    # 1. Set clock before cutoff, reset cycle state to OPEN and clean existing test orders
    set_clock_override(datetime(2026, 11, 15, 10, 0, tzinfo=UTC))
    green_meadows = db.scalars(select(Community).where(Community.code == "GREEN_MEADOWS")).first()
    cycle = CycleRepository.get_or_create_current_cycle(db, green_meadows.id)
    cycle.status = "OPEN"
    db.commit()

    existing_orders = list(db.scalars(select(BulkOrder).where(BulkOrder.cycle_id == cycle.id)).all())
    for bo in existing_orders:
        db.query(RetailerBill).filter(RetailerBill.bulk_order_id == bo.id).delete()
        invoices = list(db.scalars(select(Invoice).where(Invoice.bulk_order_id == bo.id)).all())
        for inv in invoices:
            db.query(Refund).filter(Refund.invoice_id == inv.id).delete()
            db.query(PaymentRecord).filter(PaymentRecord.invoice_id == inv.id).delete()
            db.query(InvoiceItem).filter(InvoiceItem.invoice_id == inv.id).delete()
            db.query(DiscountAllocation).filter(DiscountAllocation.invoice_id == inv.id).delete()
            db.delete(inv)
        db.delete(bo)
    db.commit()

    # 2. Add item to cart
    variant = db.scalars(select(ProductVariant)).first()
    cart_add_resp = client.put(
        f"/api/v1/cart/items/{variant.id}",
        json={"quantity": 3},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert cart_add_resp.status_code == 200

    # 3. Consolidate bulk order
    cons_resp = client.post(
        f"/api/v1/cycles/{cycle.id}/consolidate",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert cons_resp.status_code == 200
    bulk_order_id = cons_resp.json()["id"]

    # 4. Finalize billing
    finalize_payload = {
        "delivery_fee_paise": 1500,
        "order_discount_paise": 100,
        "delivery_allocation_mode": "EQUAL",
    }
    fin_resp = client.post(
        f"/api/v1/billing/bulk-orders/{bulk_order_id}/finalize",
        json=finalize_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert fin_resp.status_code == 200
    fin_data = fin_resp.json()

    assert "retailer_bill" in fin_data
    assert "invoices" in fin_data
    retailer_bill = fin_data["retailer_bill"]
    assert retailer_bill["status"] == "finalized"
    assert fin_data["audit_log"]["zero_discrepancy_verified"] is True

    # 5. Check resident invoices endpoint
    my_inv_resp = client.get(
        "/api/v1/billing/invoices/me",
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert my_inv_resp.status_code == 200
    my_invoices = my_inv_resp.json()
    assert len(my_invoices) >= 1
    my_inv = my_invoices[0]

    # Check invoice detail
    inv_detail_resp = client.get(
        f"/api/v1/billing/invoices/{my_inv['id']}",
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert inv_detail_resp.status_code == 200
    inv_detail = inv_detail_resp.json()
    assert inv_detail["id"] == my_inv["id"]
    assert len(inv_detail["items"]) >= 1

    # Check retailer bill endpoints
    bill_id = retailer_bill["id"]
    bill_resp = client.get(
        f"/api/v1/billing/bills/{bill_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert bill_resp.status_code == 200
    assert bill_resp.json()["id"] == bill_id

    bo_bill_resp = client.get(
        f"/api/v1/billing/bulk-orders/{bulk_order_id}/bill",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert bo_bill_resp.status_code == 200
    assert bo_bill_resp.json()["id"] == bill_id

    # 6. Test Idempotency: Calling finalize again returns existing bill
    fin_again = client.post(
        f"/api/v1/billing/bulk-orders/{bulk_order_id}/finalize",
        json=finalize_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert fin_again.status_code == 200
    assert fin_again.json()["already_finalized"] is True

    # 7. Clean up test bulk order, invoices, and bill
    db.query(RetailerBill).filter(RetailerBill.bulk_order_id == bulk_order_id).delete()
    invs = list(db.scalars(select(Invoice).where(Invoice.bulk_order_id == bulk_order_id)).all())
    for inv in invs:
        db.query(Refund).filter(Refund.invoice_id == inv.id).delete()
        db.query(PaymentRecord).filter(PaymentRecord.invoice_id == inv.id).delete()
        db.query(InvoiceItem).filter(InvoiceItem.invoice_id == inv.id).delete()
        db.query(DiscountAllocation).filter(DiscountAllocation.invoice_id == inv.id).delete()
        db.delete(inv)
    bo_to_delete = db.get(BulkOrder, bulk_order_id)
    if bo_to_delete:
        db.delete(bo_to_delete)
    db.commit()


def test_invoice_tenant_isolation(db):
    """Verify customer cannot view another resident's invoice (privacy protection)."""
    from app.models.billing import Invoice
    token_bharat = _get_auth_token("+919999900002", db)  # Bharat Patel

    # Pick an invoice belonging to another user (e.g. Asha)
    invoices = db.scalars(select(Invoice)).all()
    if invoices:
        other_inv = next((inv for inv in invoices if str(inv.user_id) != "bharat"), invoices[0])
        resp = client.get(
            f"/api/v1/billing/invoices/{other_inv.id}",
            headers={"Authorization": f"Bearer {token_bharat}"},
        )
        # If the invoice does not belong to Bharat, it must return 403
        if other_inv.user.phone != "+919999900002":
            assert resp.status_code == 403
            assert resp.json()["error"]["code"] == "COMMUNITY_ACCESS_DENIED"
