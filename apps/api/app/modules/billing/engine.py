from collections import defaultdict

from app.schemas.billing import (
    AllocatedItem,
    BillingCalculationInput,
    BillingCalculationResult,
    MathematicalAuditLog,
    ResidentInvoiceBreakdown,
    RetailerBillSummary,
)


class ZeroDiscrepancyViolationError(Exception):
    """Raised when the mathematical invariant sum(invoices) == retailer_bill is violated."""

    pass


class F7BillingEngine:
    """
    F7 Deterministic Fair Bill-Splitting Engine.

    Guarantees:
    1. 100% Integer Paise arithmetic — Zero floating point operations.
    2. Actual Consumed Quantities — Residents only pay for items actually packed.
    3. Proportionate Short-Pack Allocation — Remainder units distributed deterministically.
    4. Fair Discount Allocation — Bulk discounts applied to purchasing households.
    5. Delivery Fee Allocation — Equal or pro-rata split among active households.
    6. Rounding Remainder Distribution — Deterministic tie-breaking using canonical order.
    7. Mathematical Invariant: SUM(ALL RESIDENT INVOICES) == FINAL RETAILER BILL.
    """

    @classmethod
    def calculate(cls, input_data: BillingCalculationInput) -> BillingCalculationResult:
        # 1. Normalize identifiers to strings for stable canonical tie-breaking
        user_requests_by_variant: dict[str, dict[str, int]] = defaultdict(
            lambda: defaultdict(int)
        )
        for req in input_data.resident_requests:
            u_id = str(req.user_id)
            v_id = str(req.variant_id)
            if req.requested_qty > 0:
                user_requests_by_variant[v_id][u_id] += req.requested_qty

        # Map variant packs by variant_id
        variant_packs = {str(vp.variant_id): vp for vp in input_data.variant_packs}

        # Track all unique households
        all_user_ids = sorted(
            {
                str(req.user_id)
                for req in input_data.resident_requests
                if req.requested_qty > 0
            }
        )

        # -------------------------------------------------------------------
        # STEP 1: Consumed Quantity Allocation (Short-Pack Handling)
        # -------------------------------------------------------------------
        # allocated_quantities[variant_id][user_id] = packed_qty
        allocated_qty: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        total_requested_units = 0
        total_packed_units = 0

        for v_id, user_reqs in user_requests_by_variant.items():
            vp = variant_packs.get(v_id)
            req_sum = sum(user_reqs.values())
            total_requested_units += req_sum

            if not vp or vp.packed_qty <= 0 or req_sum == 0:
                # Variant not packed or 0 requested
                continue

            # Actual packed quantity available to allocate cannot exceed requested
            actual_packed = min(vp.packed_qty, req_sum)
            total_packed_units += actual_packed

            if actual_packed == req_sum:
                # Full pack: each resident gets their requested quantity
                for u_id, q_req in user_reqs.items():
                    allocated_qty[v_id][u_id] = q_req
            else:
                # Short pack: proportional allocation using integer math
                base_allocated: dict[str, int] = {}
                remainders: dict[str, int] = {}
                base_sum = 0

                for u_id, q_req in user_reqs.items():
                    base = (q_req * actual_packed) // req_sum
                    rem = (q_req * actual_packed) % req_sum
                    base_allocated[u_id] = base
                    remainders[u_id] = rem
                    base_sum += base

                surplus_units = actual_packed - base_sum
                assert 0 <= surplus_units <= len(user_reqs)

                # Deterministic tie-breaker:
                # 1. Largest remainder first (-rem)
                # 2. Largest requested quantity (-q_req)
                # 3. Canonical user_id ascending (u_id)
                sorted_candidates = sorted(
                    user_reqs.keys(),
                    key=lambda u: (-remainders[u], -user_reqs[u], u),
                )

                for idx, u_id in enumerate(sorted_candidates):
                    bonus = 1 if idx < surplus_units else 0
                    allocated_qty[v_id][u_id] = base_allocated[u_id] + bonus

                # Verification
                variant_packed_sum = sum(allocated_qty[v_id].values())
                assert (
                    variant_packed_sum == actual_packed
                ), f"Short-pack mismatch on {v_id}: {variant_packed_sum} != {actual_packed}"

        # -------------------------------------------------------------------
        # STEP 2: Base Cost Allocation
        # -------------------------------------------------------------------
        # user_item_base[user_id][variant_id] = cost_paise
        user_item_base: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        user_subtotal_paise: dict[str, int] = defaultdict(int)

        for v_id, users in allocated_qty.items():
            vp = variant_packs[v_id]
            unit_price = vp.unit_price_paise
            for u_id, p_qty in users.items():
                if p_qty > 0:
                    cost = p_qty * unit_price
                    user_item_base[u_id][v_id] = cost
                    user_subtotal_paise[u_id] += cost

        retailer_gross_paise = sum(user_subtotal_paise.values())

        # -------------------------------------------------------------------
        # STEP 3: Variant-Level Discount Allocation
        # -------------------------------------------------------------------
        # user_variant_discount[user_id][variant_id] = discount_paise
        user_variant_discount: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        variant_discount_remainders: dict[str, int] = {}
        total_variant_discounts_allocated = 0

        for v_id, vp in variant_packs.items():
            if vp.discount_paise <= 0:
                continue

            # Variant total packed cost
            variant_total_cost = sum(
                user_item_base[u_id].get(v_id, 0) for u_id in all_user_ids
            )
            if variant_total_cost <= 0:
                variant_discount_remainders[v_id] = 0
                continue

            # Discount cannot exceed actual consumed cost of this variant
            eff_discount = min(vp.discount_paise, variant_total_cost)

            eligible_users = [
                u_id
                for u_id in all_user_ids
                if user_item_base[u_id].get(v_id, 0) > 0
            ]
            if not eligible_users:
                continue

            base_disc: dict[str, int] = {}
            disc_rem: dict[str, int] = {}
            disc_base_sum = 0

            for u_id in eligible_users:
                u_cost = user_item_base[u_id][v_id]
                base = (eff_discount * u_cost) // variant_total_cost
                rem = (eff_discount * u_cost) % variant_total_cost
                base_disc[u_id] = base
                disc_rem[u_id] = rem
                disc_base_sum += base

            surplus_paise = eff_discount - disc_base_sum
            variant_discount_remainders[v_id] = surplus_paise

            # Deterministic tie-breaker:
            # 1. Largest remainder first (-rem)
            # 2. Largest base cost (-u_cost)
            # 3. Canonical user_id ascending (u)
            sorted_disc_users = sorted(
                eligible_users,
                key=lambda u: (-disc_rem[u], -user_item_base[u][v_id], u),
            )

            for idx, u_id in enumerate(sorted_disc_users):
                bonus = 1 if idx < surplus_paise else 0
                assigned = base_disc[u_id] + bonus
                user_variant_discount[u_id][v_id] = assigned

            v_disc_sum = sum(user_variant_discount[u][v_id] for u in eligible_users)
            assert (
                v_disc_sum == eff_discount
            ), f"Variant discount mismatch on {v_id}: {v_disc_sum} != {eff_discount}"
            total_variant_discounts_allocated += eff_discount

        # -------------------------------------------------------------------
        # STEP 4: Order-Wide Bulk Discount Allocation
        # -------------------------------------------------------------------
        # user_order_discount[user_id] = discount_paise
        user_order_discount: dict[str, int] = defaultdict(int)
        order_discount_remainder_paise = 0

        # Remaining net subtotal before order discount for active users
        user_net_before_order: dict[str, int] = {}
        for u_id in all_user_ids:
            sub = user_subtotal_paise[u_id]
            v_disc = sum(user_variant_discount[u_id].values())
            net_before = max(0, sub - v_disc)
            if net_before > 0:
                user_net_before_order[u_id] = net_before

        active_net_sum = sum(user_net_before_order.values())
        eff_order_discount = 0

        if input_data.order_discount_paise > 0 and active_net_sum > 0:
            eff_order_discount = min(input_data.order_discount_paise, active_net_sum)
            base_ord_disc: dict[str, int] = {}
            ord_rem: dict[str, int] = {}
            ord_base_sum = 0

            for u_id, u_net in user_net_before_order.items():
                base = (eff_order_discount * u_net) // active_net_sum
                rem = (eff_order_discount * u_net) % active_net_sum
                base_ord_disc[u_id] = base
                ord_rem[u_id] = rem
                ord_base_sum += base

            surplus_ord = eff_order_discount - ord_base_sum
            order_discount_remainder_paise = surplus_ord

            sorted_ord_users = sorted(
                user_net_before_order.keys(),
                key=lambda u: (-ord_rem[u], -user_net_before_order[u], u),
            )

            for idx, u_id in enumerate(sorted_ord_users):
                bonus = 1 if idx < surplus_ord else 0
                user_order_discount[u_id] = base_ord_disc[u_id] + bonus

            ord_disc_sum = sum(user_order_discount.values())
            assert (
                ord_disc_sum == eff_order_discount
            ), f"Order discount mismatch: {ord_disc_sum} != {eff_order_discount}"

        total_discount_paise = (
            total_variant_discounts_allocated + eff_order_discount
        )

        # -------------------------------------------------------------------
        # STEP 5: Delivery Fee Allocation
        # -------------------------------------------------------------------
        # Active participating households receive actual items (subtotal > 0)
        active_user_ids = sorted(
            [u_id for u_id in all_user_ids if user_subtotal_paise[u_id] > 0]
        )
        active_households_count = len(active_user_ids)

        user_delivery_fee: dict[str, int] = defaultdict(int)
        delivery_remainder_paise = 0
        eff_delivery_fee = 0

        if input_data.delivery_fee_paise > 0 and active_households_count > 0:
            eff_delivery_fee = input_data.delivery_fee_paise

            if input_data.delivery_allocation_mode == "EQUAL":
                base_fee = eff_delivery_fee // active_households_count
                rem_fee = eff_delivery_fee % active_households_count
                delivery_remainder_paise = rem_fee

                # Deterministic tie-breaker: canonical user_id ascending
                for idx, u_id in enumerate(active_user_ids):
                    bonus = 1 if idx < rem_fee else 0
                    user_delivery_fee[u_id] = base_fee + bonus
            else:
                # PRO_RATA based on resident subtotal
                active_gross = sum(user_subtotal_paise[u] for u in active_user_ids)
                base_fees: dict[str, int] = {}
                fee_rems: dict[str, int] = {}
                base_sum = 0

                for u_id in active_user_ids:
                    u_sub = user_subtotal_paise[u_id]
                    b = (eff_delivery_fee * u_sub) // active_gross
                    r = (eff_delivery_fee * u_sub) % active_gross
                    base_fees[u_id] = b
                    fee_rems[u_id] = r
                    base_sum += b

                surplus_fee = eff_delivery_fee - base_sum
                delivery_remainder_paise = surplus_fee

                sorted_fee_users = sorted(
                    active_user_ids,
                    key=lambda u: (-fee_rems[u], -user_subtotal_paise[u], u),
                )
                for idx, u_id in enumerate(sorted_fee_users):
                    bonus = 1 if idx < surplus_fee else 0
                    user_delivery_fee[u_id] = base_fees[u_id] + bonus

            del_sum = sum(user_delivery_fee.values())
            assert (
                del_sum == eff_delivery_fee
            ), f"Delivery fee mismatch: {del_sum} != {eff_delivery_fee}"

        # -------------------------------------------------------------------
        # STEP 6: Platform Fee Allocation (if applicable)
        # -------------------------------------------------------------------
        user_platform_fee: dict[str, int] = defaultdict(int)
        eff_platform_fee = 0

        if input_data.platform_fee_paise > 0 and active_households_count > 0:
            eff_platform_fee = input_data.platform_fee_paise
            base_plat = eff_platform_fee // active_households_count
            rem_plat = eff_platform_fee % active_households_count

            for idx, u_id in enumerate(active_user_ids):
                bonus = 1 if idx < rem_plat else 0
                user_platform_fee[u_id] = base_plat + bonus

            plat_sum = sum(user_platform_fee.values())
            assert (
                plat_sum == eff_platform_fee
            ), f"Platform fee mismatch: {plat_sum} != {eff_platform_fee}"

        # -------------------------------------------------------------------
        # STEP 7: Assembly of Resident Invoices & Retailer Bill
        # -------------------------------------------------------------------
        resident_invoices: list[ResidentInvoiceBreakdown] = []

        for u_id in all_user_ids:
            # Build item breakdown
            items: list[AllocatedItem] = []

            # Gather all variants requested by this user
            user_requested_variants = [
                str(req.variant_id)
                for req in input_data.resident_requests
                if str(req.user_id) == u_id and req.requested_qty > 0
            ]
            unique_vids = sorted(set(user_requested_variants))

            for v_id in unique_vids:
                req_qty = user_requests_by_variant[v_id].get(u_id, 0)
                pack_qty = allocated_qty[v_id].get(u_id, 0)
                vp = variant_packs.get(v_id)
                unit_price = vp.unit_price_paise if vp else 0
                base_c = pack_qty * unit_price
                v_disc = user_variant_discount[u_id].get(v_id, 0)
                net_c = base_c - v_disc

                items.append(
                    AllocatedItem(
                        variant_id=v_id,
                        requested_qty=req_qty,
                        packed_qty=pack_qty,
                        unit_price_paise=unit_price,
                        base_cost_paise=base_c,
                        discount_paise=v_disc,
                        net_cost_paise=net_c,
                    )
                )

            u_base = user_subtotal_paise[u_id]
            u_disc = (
                sum(user_variant_discount[u_id].values())
                + user_order_discount[u_id]
            )
            u_del = user_delivery_fee[u_id]
            u_plat = user_platform_fee[u_id]
            u_total = u_base - u_disc + u_del + u_plat

            resident_invoices.append(
                ResidentInvoiceBreakdown(
                    user_id=u_id,
                    items=items,
                    base_amount_paise=u_base,
                    discount_amount_paise=u_disc,
                    delivery_fee_paise=u_del,
                    platform_fee_paise=u_plat,
                    total_amount_paise=u_total,
                )
            )

        # Retailer Bill Summary
        retailer_net_paise = (
            retailer_gross_paise
            - total_discount_paise
            + eff_delivery_fee
            + eff_platform_fee
        )

        retailer_summary = RetailerBillSummary(
            gross_amount_paise=retailer_gross_paise,
            discount_amount_paise=total_discount_paise,
            delivery_amount_paise=eff_delivery_fee,
            platform_fee_paise=eff_platform_fee,
            net_amount_paise=retailer_net_paise,
        )

        # -------------------------------------------------------------------
        # STEP 8: Zero Discrepancy Verification & Audit Log
        # -------------------------------------------------------------------
        sum_resident_invoices_paise = sum(
            inv.total_amount_paise for inv in resident_invoices
        )
        discrepancy_paise = sum_resident_invoices_paise - retailer_net_paise

        if discrepancy_paise != 0:
            raise ZeroDiscrepancyViolationError(
                f"F7 Invariant Violated! Sum of invoices ({sum_resident_invoices_paise}p) "
                f"!= Retailer Net ({retailer_net_paise}p). Discrepancy: {discrepancy_paise}p"
            )

        audit_log = MathematicalAuditLog(
            total_requested_units=total_requested_units,
            total_packed_units=total_packed_units,
            active_households_count=active_households_count,
            sum_resident_invoices_paise=sum_resident_invoices_paise,
            retailer_net_paise=retailer_net_paise,
            discrepancy_paise=discrepancy_paise,
            zero_discrepancy_verified=(discrepancy_paise == 0),
            delivery_remainder_paise=delivery_remainder_paise,
            variant_discount_remainders=variant_discount_remainders,
            order_discount_remainder_paise=order_discount_remainder_paise,
        )

        return BillingCalculationResult(
            resident_invoices=resident_invoices,
            retailer_bill=retailer_summary,
            audit_log=audit_log,
        )
