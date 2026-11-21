"""
Pure bill-splitting calculation engine for PACT.

Follows F7 and D7 specifications:
- Pure code: no database, no I/O, no framework dependencies.
- Integer paise only: strictly no floating-point calculations.
- Largest-remainder allocation with tie-breaking by customer key.
- Validates inputs (discounts, MRP bounds, negative amounts).
- Enforces exact invariant: sum(invoice_totals) == bill_total.
"""

from dataclasses import dataclass, field


class BillSplitValidationError(ValueError):
    """Raised when bill input values fail domain validation rules."""
    pass


class InvariantViolationError(RuntimeError):
    """Raised when bill total does not strictly match sum of customer invoice totals."""
    pass


def allocate(total: int, weights: list[int], keys: list[str]) -> list[int]:
    """
    Shares `total` in proportion to `weights` using largest remainder:
    1. Give each floor(total * w_i / sum(w)).
    2. Hand out leftover paise one at a time to largest fractional remainders.
    3. Ties broken by lower key (alphabetical/lexicographical order).

    The result always sums to `total`.
    """
    if len(weights) != len(keys):
        raise ValueError("weights and keys must have identical lengths")

    if total < 0:
        raise BillSplitValidationError(f"total cannot be negative: {total}")

    for w in weights:
        if w < 0:
            raise BillSplitValidationError(f"weight cannot be negative: {w}")

    if total == 0:
        return [0] * len(weights)

    sum_w = sum(weights)
    if sum_w == 0:
        raise BillSplitValidationError(f"Cannot allocate {total} across zero total weight")

    n = len(weights)
    base_shares: list[int] = []
    remainders: list[int] = []

    for w in weights:
        base = (total * w) // sum_w
        rem = (total * w) % sum_w
        base_shares.append(base)
        remainders.append(rem)

    allocated_sum = sum(base_shares)
    leftover = total - allocated_sum

    if leftover == 0:
        return base_shares

    # Sort indices by remainder descending, then keys ascending
    order = sorted(range(n), key=lambda i: (-remainders[i], keys[i]))

    shares = list(base_shares)
    for rank in range(leftover):
        idx = order[rank]
        shares[idx] += 1

    assert sum(shares) == total, f"Allocation sum {sum(shares)} != total {total}"
    return shares


@dataclass
class CustomerOrderLineInput:
    customer_id: str
    variant_id: str
    packed_qty: int
    requested_qty: int = 0
    item_id: str = ""


@dataclass
class VariantPriceInput:
    variant_id: str
    final_unit_price_paise: int
    mrp_paise: int
    product_discount_paise: int = 0


@dataclass
class BillSplitInput:
    lines: list[CustomerOrderLineInput]
    variant_prices: dict[str, VariantPriceInput]
    overall_discount_paise: int = 0
    delivery_charge_paise: int = 0


@dataclass
class CustomerInvoiceItemOutput:
    variant_id: str
    packed_qty: int
    final_unit_price_paise: int
    gross_paise: int
    line_discount_paise: int
    net_paise: int
    item_id: str = ""


@dataclass
class CustomerInvoiceOutput:
    customer_id: str
    items: list[CustomerInvoiceItemOutput] = field(default_factory=list)
    subtotal_paise: int = 0
    overall_discount_share_paise: int = 0
    delivery_share_paise: int = 0
    rounding_adjustment_paise: int = 0
    total_paise: int = 0
    status: str = "issued"  # "issued" or "void"


@dataclass
class BillSplitOutput:
    gross_total_paise: int
    product_discounts_total_paise: int
    overall_discount_paise: int
    delivery_charge_paise: int
    bill_total_paise: int
    invoices: list[CustomerInvoiceOutput]


def split_bill(data: BillSplitInput) -> BillSplitOutput:
    """
    Executes F7 Steps 1–7:
    1. Line gross = packed_qty * final_unit_price, per customer line.
    2. Product discount Dv on a variant: allocate(Dv, packed quantities of that variant's lines).
    3. Customer subtotal = sum(gross - line_discount).
    4. Overall discount O: allocate(O, subtotals).
    5. Delivery charge C: allocate(C, 1 for each customer whose subtotal > 0).
    6. Invoice total = subtotal - overall share + delivery share. Subtotal == 0 => void.
    7. Bill total = sum(gross) - sum(Dv) - O + C.
    Assert sum(invoice totals) == bill total.
    """
    # 0. Global Validations
    if data.overall_discount_paise < 0:
        raise BillSplitValidationError("Overall discount cannot be negative")
    if data.delivery_charge_paise < 0:
        raise BillSplitValidationError("Delivery charge cannot be negative")

    # Validate variant prices and MRP
    for var_id, vp in data.variant_prices.items():
        if vp.final_unit_price_paise < 0:
            raise BillSplitValidationError(
                f"Variant {var_id} final unit price cannot be negative"
            )
        if vp.mrp_paise < 0:
            raise BillSplitValidationError(
                f"Variant {var_id} MRP cannot be negative"
            )
        if vp.final_unit_price_paise > vp.mrp_paise:
            raise BillSplitValidationError(
                f"Variant {var_id} final unit price ({vp.final_unit_price_paise} paise) "
                f"exceeds MRP ({vp.mrp_paise} paise)"
            )
        if vp.product_discount_paise < 0:
            raise BillSplitValidationError(
                f"Variant {var_id} product discount cannot be negative"
            )

    # 1. Step 1: Calculate Line Gross per customer line
    # Group lines by variant to allocate product discounts
    variant_lines: dict[str, list[CustomerOrderLineInput]] = {}
    customer_ids_set = set()

    for line in data.lines:
        if line.packed_qty < 0:
            raise BillSplitValidationError(f"Packed quantity cannot be negative: {line.packed_qty}")
        if line.variant_id not in data.variant_prices:
            raise BillSplitValidationError(f"Missing price for variant {line.variant_id}")
        customer_ids_set.add(line.customer_id)
        variant_lines.setdefault(line.variant_id, []).append(line)

    sorted_customer_ids = sorted(customer_ids_set)

    # 2. Step 2: Product Discounts Allocation
    # allocate(Dv, packed quantities of that variant's lines) -> line_discount
    line_discounts: dict[int, int] = {}  # id(line) -> discount_paise
    line_rounding_adj: dict[int, int] = {}  # id(line) -> extra paise received in step 2

    gross_total_paise = 0
    total_product_discounts_paise = 0

    for var_id, vp in data.variant_prices.items():
        v_lines = variant_lines.get(var_id, [])
        var_packed_qty = sum(l.packed_qty for l in v_lines)
        var_gross = var_packed_qty * vp.final_unit_price_paise
        gross_total_paise += var_gross

        if vp.product_discount_paise > 0:
            if vp.product_discount_paise > var_gross:
                raise BillSplitValidationError(
                    f"Product discount for variant {var_id} ({vp.product_discount_paise} paise) "
                    f"exceeds variant gross ({var_gross} paise)"
                )
            if var_packed_qty == 0:
                raise BillSplitValidationError(
                    f"Product discount given for variant {var_id} with 0 packed items"
                )

            total_product_discounts_paise += vp.product_discount_paise

            # Allocate across lines that have packed_qty > 0
            weights = [l.packed_qty for l in v_lines]
            keys = [l.customer_id for l in v_lines]
            allocated_discounts = allocate(vp.product_discount_paise, weights, keys)

            # Informational rounding: difference from exact proportional share
            for l, disc in zip(v_lines, allocated_discounts):
                line_discounts[id(l)] = disc
                exact_share = (vp.product_discount_paise * l.packed_qty) // var_packed_qty
                line_rounding_adj[id(l)] = disc - exact_share
        else:
            for l in v_lines:
                line_discounts[id(l)] = 0
                line_rounding_adj[id(l)] = 0

    # 3. Step 3: Customer Subtotals
    # subtotal = sum(line.gross - line_discount)
    customer_lines_map: dict[str, list[CustomerInvoiceItemOutput]] = {
        cid: [] for cid in sorted_customer_ids
    }
    customer_subtotals: dict[str, int] = {cid: 0 for cid in sorted_customer_ids}
    customer_step2_adj: dict[str, int] = {cid: 0 for cid in sorted_customer_ids}

    for line in data.lines:
        vp = data.variant_prices[line.variant_id]
        gross = line.packed_qty * vp.final_unit_price_paise
        disc = line_discounts.get(id(line), 0)
        net = gross - disc

        item_out = CustomerInvoiceItemOutput(
            variant_id=line.variant_id,
            packed_qty=line.packed_qty,
            final_unit_price_paise=vp.final_unit_price_paise,
            gross_paise=gross,
            line_discount_paise=disc,
            net_paise=net,
            item_id=line.item_id,
        )
        customer_lines_map[line.customer_id].append(item_out)
        customer_subtotals[line.customer_id] += net
        customer_step2_adj[line.customer_id] += line_rounding_adj.get(id(line), 0)

    total_subtotals = sum(customer_subtotals.values())

    # 4. Step 4: Overall Discount Allocation
    if data.overall_discount_paise > total_subtotals:
        raise BillSplitValidationError(
            f"Overall discount ({data.overall_discount_paise} paise) exceeds "
            f"sum of customer subtotals ({total_subtotals} paise)"
        )

    customer_subtotal_weights = [customer_subtotals[cid] for cid in sorted_customer_ids]
    overall_shares = allocate(
        data.overall_discount_paise, customer_subtotal_weights, sorted_customer_ids
    )
    customer_overall_shares = dict(zip(sorted_customer_ids, overall_shares))

    # Step 4 rounding adjustment: extra discount received (negative for customer)
    customer_step4_adj: dict[str, int] = {}
    if total_subtotals > 0:
        for cid, share in customer_overall_shares.items():
            exact_share = (data.overall_discount_paise * customer_subtotals[cid]) // total_subtotals
            customer_step4_adj[cid] = share - exact_share
    else:
        for cid in sorted_customer_ids:
            customer_step4_adj[cid] = 0

    # 5. Step 5: Delivery Charge Allocation
    # Equal split among customers whose subtotal > 0
    active_customers = [cid for cid in sorted_customer_ids if customer_subtotals[cid] > 0]
    delivery_weights = [1 if customer_subtotals[cid] > 0 else 0 for cid in sorted_customer_ids]

    if active_customers and data.delivery_charge_paise > 0:
        delivery_shares = allocate(
            data.delivery_charge_paise, delivery_weights, sorted_customer_ids
        )
        customer_delivery_shares = dict(zip(sorted_customer_ids, delivery_shares))
    else:
        customer_delivery_shares = {cid: 0 for cid in sorted_customer_ids}

    # Step 5 rounding adjustment: extra delivery charge paid (positive for customer)
    customer_step5_adj: dict[str, int] = {}
    if active_customers:
        base_delivery = data.delivery_charge_paise // len(active_customers)
        for cid in sorted_customer_ids:
            if customer_subtotals[cid] > 0:
                customer_step5_adj[cid] = customer_delivery_shares[cid] - base_delivery
            else:
                customer_step5_adj[cid] = 0
    else:
        for cid in sorted_customer_ids:
            customer_step5_adj[cid] = 0

    # 6. Step 6: Invoice Total per customer
    invoices: list[CustomerInvoiceOutput] = []

    for cid in sorted_customer_ids:
        subtotal = customer_subtotals[cid]
        ov_share = customer_overall_shares[cid]
        del_share = customer_delivery_shares[cid]

        if subtotal == 0:
            inv = CustomerInvoiceOutput(
                customer_id=cid,
                items=customer_lines_map[cid],
                subtotal_paise=0,
                overall_discount_share_paise=0,
                delivery_share_paise=0,
                rounding_adjustment_paise=0,
                total_paise=0,
                status="void",
            )
        else:
            inv_total = subtotal - ov_share + del_share
            # net rounding adjustment:
            # negative for extra discount received (step 2 & 4), positive for extra delivery (step 5)
            net_rounding = (
                -customer_step2_adj[cid]
                - customer_step4_adj[cid]
                + customer_step5_adj[cid]
            )
            inv = CustomerInvoiceOutput(
                customer_id=cid,
                items=customer_lines_map[cid],
                subtotal_paise=subtotal,
                overall_discount_share_paise=ov_share,
                delivery_share_paise=del_share,
                rounding_adjustment_paise=net_rounding,
                total_paise=inv_total,
                status="issued",
            )
        invoices.append(inv)

    # 7. Step 7: Bill Total & Invariant Assertion
    # Bill total = sum(gross) - sum(Dv) - O + C
    bill_total_paise = (
        gross_total_paise
        - total_product_discounts_paise
        - data.overall_discount_paise
        + data.delivery_charge_paise
    )

    sum_invoices_paise = sum(inv.total_paise for inv in invoices if inv.status != "void")

    if sum_invoices_paise != bill_total_paise:
        raise InvariantViolationError(
            f"Financial Invariant Broken: Sum of invoices ({sum_invoices_paise} paise) "
            f"!= Bill Total ({bill_total_paise} paise)"
        )

    return BillSplitOutput(
        gross_total_paise=gross_total_paise,
        product_discounts_total_paise=total_product_discounts_paise,
        overall_discount_paise=data.overall_discount_paise,
        delivery_charge_paise=data.delivery_charge_paise,
        bill_total_paise=bill_total_paise,
        invoices=invoices,
    )
