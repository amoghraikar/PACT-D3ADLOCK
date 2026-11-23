import ast
import sys
import pytest
from hypothesis import given
from hypothesis import strategies as st

from app.modules.billing.split import (
    BillSplitInput,
    BillSplitValidationError,
    CustomerOrderLineInput,
    VariantPriceInput,
    allocate,
    split_bill,
)


def test_no_forbidden_imports():
    """P12: Done when tests pass and the module imports nothing from FastAPI or SQLAlchemy."""
    module = sys.modules["app.modules.billing.split"]
    with open(module.__file__) as f:
        tree = ast.parse(f.read())

    imported_names = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imported_names.append(alias.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imported_names.append(node.module)

    for name in imported_names:
        assert not name.startswith("fastapi"), f"Forbidden import: {name}"
        assert not name.startswith("sqlalchemy"), f"Forbidden import: {name}"


def test_f7_worked_example_1_specification():
    """
    Row 1: Specification example
    Subtotals: ₹800 · ₹600 · ₹400 · ₹700 (in paise: 80000, 60000, 40000, 70000)
    Discount: ₹250 overall (25000 paise)
    Shares: ₹80 · ₹60 · ₹40 · ₹70 (8000, 6000, 4000, 7000 paise)
    Invoices: ₹720 · ₹540 · ₹360 · ₹630 (72000, 54000, 36000, 63000 paise)
    Bill: ₹2,250 (225000 paise)
    """
    lines = [
        CustomerOrderLineInput("c1-asha", "var-rice-5kg", packed_qty=1),
        CustomerOrderLineInput("c1-asha", "var-sugar-1kg", packed_qty=2),
        CustomerOrderLineInput("c1-asha", "var-oil-1l", packed_qty=1),
        CustomerOrderLineInput("c1-asha", "var-dal-500g", packed_qty=1),
        CustomerOrderLineInput("c2-bharat", "var-rice-5kg", packed_qty=2),
        CustomerOrderLineInput("c3-chitra", "var-rice-5kg", packed_qty=1),
        CustomerOrderLineInput("c3-chitra", "var-dal-500g", packed_qty=1),
        CustomerOrderLineInput("c4-dev", "var-rice-5kg", packed_qty=2),
        CustomerOrderLineInput("c4-dev", "var-dal-500g", packed_qty=1),
    ]

    variant_prices = {
        "var-rice-5kg": VariantPriceInput("var-rice-5kg", 30000, 34000),
        "var-sugar-1kg": VariantPriceInput("var-sugar-1kg", 7500, 8000),
        "var-oil-1l": VariantPriceInput("var-oil-1l", 25000, 27000),
        "var-dal-500g": VariantPriceInput("var-dal-500g", 10000, 11000),
    }

    result = split_bill(
        BillSplitInput(
            lines=lines,
            variant_prices=variant_prices,
            overall_discount_paise=25000,
            delivery_charge_paise=0,
        )
    )

    assert result.gross_total_paise == 250000
    assert result.bill_total_paise == 225000

    inv_map = {inv.customer_id: inv for inv in result.invoices}
    assert inv_map["c1-asha"].subtotal_paise == 80000
    assert inv_map["c1-asha"].overall_discount_share_paise == 8000
    assert inv_map["c1-asha"].total_paise == 72000

    assert inv_map["c2-bharat"].subtotal_paise == 60000
    assert inv_map["c2-bharat"].overall_discount_share_paise == 6000
    assert inv_map["c2-bharat"].total_paise == 54000

    assert inv_map["c3-chitra"].subtotal_paise == 40000
    assert inv_map["c3-chitra"].overall_discount_share_paise == 4000
    assert inv_map["c3-chitra"].total_paise == 36000

    assert inv_map["c4-dev"].subtotal_paise == 70000
    assert inv_map["c4-dev"].overall_discount_share_paise == 7000
    assert inv_map["c4-dev"].total_paise == 63000

    assert sum(inv.total_paise for inv in result.invoices) == result.bill_total_paise


def test_f7_worked_example_2_short_pack():
    """
    Row 2: Short-pack (Dev's ₹100 line packed 0)
    Subtotals: ₹800 · ₹600 · ₹400 · ₹600 (80000, 60000, 40000, 60000 paise)
    Discount: ₹250 overall (25000 paise)
    Shares: ₹83.33 · ₹62.50 · ₹41.67 · ₹62.50 (8333, 6250, 4167, 6250 paise)
    Invoices: ₹716.67 · ₹537.50 · ₹358.33 · ₹537.50 (71667, 53750, 35833, 53750 paise)
    Bill: ₹2,150 (215000 paise)
    """
    lines = [
        CustomerOrderLineInput("c1-asha", "var-rice-5kg", packed_qty=1),
        CustomerOrderLineInput("c1-asha", "var-sugar-1kg", packed_qty=2),
        CustomerOrderLineInput("c1-asha", "var-oil-1l", packed_qty=1),
        CustomerOrderLineInput("c1-asha", "var-dal-500g", packed_qty=1),
        CustomerOrderLineInput("c2-bharat", "var-rice-5kg", packed_qty=2),
        CustomerOrderLineInput("c3-chitra", "var-rice-5kg", packed_qty=1),
        CustomerOrderLineInput("c3-chitra", "var-dal-500g", packed_qty=1),
        CustomerOrderLineInput("c4-dev", "var-rice-5kg", packed_qty=2),
        CustomerOrderLineInput("c4-dev", "var-dal-500g", packed_qty=0),  # short-packed
    ]

    variant_prices = {
        "var-rice-5kg": VariantPriceInput("var-rice-5kg", 30000, 34000),
        "var-sugar-1kg": VariantPriceInput("var-sugar-1kg", 7500, 8000),
        "var-oil-1l": VariantPriceInput("var-oil-1l", 25000, 27000),
        "var-dal-500g": VariantPriceInput("var-dal-500g", 10000, 11000),
    }

    result = split_bill(
        BillSplitInput(
            lines=lines,
            variant_prices=variant_prices,
            overall_discount_paise=25000,
            delivery_charge_paise=0,
        )
    )

    assert result.gross_total_paise == 240000
    assert result.bill_total_paise == 215000

    inv_map = {inv.customer_id: inv for inv in result.invoices}
    assert inv_map["c1-asha"].subtotal_paise == 80000
    assert inv_map["c1-asha"].overall_discount_share_paise == 8333
    assert inv_map["c1-asha"].total_paise == 71667

    assert inv_map["c2-bharat"].subtotal_paise == 60000
    assert inv_map["c2-bharat"].overall_discount_share_paise == 6250
    assert inv_map["c2-bharat"].total_paise == 53750

    assert inv_map["c3-chitra"].subtotal_paise == 40000
    assert inv_map["c3-chitra"].overall_discount_share_paise == 4167
    assert inv_map["c3-chitra"].total_paise == 35833

    assert inv_map["c4-dev"].subtotal_paise == 60000
    assert inv_map["c4-dev"].overall_discount_share_paise == 6250
    assert inv_map["c4-dev"].total_paise == 53750

    assert sum(inv.total_paise for inv in result.invoices) == result.bill_total_paise


def test_f7_worked_example_3_even_three_way():
    """
    Row 3: Even three-way
    Subtotals: ₹100 · ₹100 · ₹100 (10000, 10000, 10000 paise)
    Discount: ₹100 overall (10000 paise)
    Shares: ₹33.34 · ₹33.33 · ₹33.33 (3334, 3333, 3333 paise)
    Invoices: ₹66.66 · ₹66.67 · ₹66.67 (6666, 6667, 6667 paise)
    Bill: ₹200 (20000 paise)
    """
    lines = [
        CustomerOrderLineInput("c1", "var-item", packed_qty=1),
        CustomerOrderLineInput("c2", "var-item", packed_qty=1),
        CustomerOrderLineInput("c3", "var-item", packed_qty=1),
    ]
    variant_prices = {
        "var-item": VariantPriceInput("var-item", 10000, 12000),
    }

    result = split_bill(
        BillSplitInput(
            lines=lines,
            variant_prices=variant_prices,
            overall_discount_paise=10000,
        )
    )

    assert result.bill_total_paise == 20000
    inv_map = {inv.customer_id: inv for inv in result.invoices}
    assert inv_map["c1"].overall_discount_share_paise == 3334
    assert inv_map["c1"].total_paise == 6666

    assert inv_map["c2"].overall_discount_share_paise == 3333
    assert inv_map["c2"].total_paise == 6667

    assert inv_map["c3"].overall_discount_share_paise == 3333
    assert inv_map["c3"].total_paise == 6667

    assert sum(inv.total_paise for inv in result.invoices) == 20000


def test_f7_worked_example_4_product_discount():
    """
    Row 4: Product discount
    One pack each, three customers.
    ₹1.00 (100 paise) discount on that product.
    Shares: ₹0.34 · ₹0.33 · ₹0.33 (34, 33, 33 paise).
    """
    shares = allocate(100, [1, 1, 1], ["c1", "c2", "c3"])
    assert shares == [34, 33, 33]


def test_f7_worked_example_5_delivery_charge():
    """
    Row 5: Delivery charge
    Three customers.
    ₹50 (5000 paise) delivery charge.
    Shares: ₹16.67 · ₹16.67 · ₹16.66 (1667, 1667, 1666 paise).
    """
    shares = allocate(5000, [1, 1, 1], ["c1", "c2", "c3"])
    assert shares == [1667, 1667, 1666]


def test_validation_errors():
    """Validates domain guardrails and error raising."""
    # 1. Price above MRP
    with pytest.raises(BillSplitValidationError, match="exceeds MRP"):
        split_bill(
            BillSplitInput(
                lines=[CustomerOrderLineInput("c1", "v1", packed_qty=1)],
                variant_prices={"v1": VariantPriceInput("v1", 35000, 30000)},
            )
        )

    # 2. Overall discount larger than subtotals
    with pytest.raises(BillSplitValidationError, match="exceeds sum of customer subtotals"):
        split_bill(
            BillSplitInput(
                lines=[CustomerOrderLineInput("c1", "v1", packed_qty=1)],
                variant_prices={"v1": VariantPriceInput("v1", 10000, 10000)},
                overall_discount_paise=15000,
            )
        )

    # 3. Product discount larger than gross
    with pytest.raises(BillSplitValidationError, match="exceeds variant gross"):
        split_bill(
            BillSplitInput(
                lines=[CustomerOrderLineInput("c1", "v1", packed_qty=1)],
                variant_prices={
                    "v1": VariantPriceInput("v1", 10000, 10000, product_discount_paise=12000)
                },
            )
        )

    # 4. Negative inputs
    with pytest.raises(BillSplitValidationError):
        split_bill(
            BillSplitInput(
                lines=[CustomerOrderLineInput("c1", "v1", packed_qty=-1)],
                variant_prices={"v1": VariantPriceInput("v1", 10000, 10000)},
            )
        )


@given(
    total=st.integers(min_value=0, max_value=10_000_000),
    weights=st.lists(st.integers(min_value=1, max_value=10_000), min_size=1, max_size=20),
)
def test_hypothesis_allocate_always_sums_to_total(total: int, weights: list[int]):
    """Property test: allocate() always sums exactly to total."""
    keys = [f"key-{i:03d}" for i in range(len(weights))]
    result = allocate(total, weights, keys)
    assert sum(result) == total
    assert all(r >= 0 for r in result)
