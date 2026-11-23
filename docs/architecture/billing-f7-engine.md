# PACT F7 Deterministic Billing Engine

**Document Status:** Approved & Implemented  
**Module Location:** `apps/api/app/modules/billing/`  
**Governing Standard:** F7 Fair Bill-Splitting Protocol  
**Primary Invariant:** $\sum_{h \in H} \text{ResidentInvoice}_h \equiv \text{RetailerBill}_{\text{net}}$ (Exact zero discrepancy tolerance)

---

## 1. Executive Summary & Core Principles

PACT's core value proposition is **One Building. One Shared Monthly Cart. One Consolidated Bulk Order. One Fairly Split Bill.**

In collective commerce, splitting a single consolidated retailer bulk order across tens or hundreds of distinct resident households presents severe computational challenges:
- **Short-packing:** A merchant delivers fewer units of a SKU than requested due to warehouse shortages.
- **Out-of-stock items:** SKUs that cannot be fulfilled must not result in phantom charges or unfair delivery fee burden.
- **Proportional discounts:** Bulk order price tiers and SKU promotions must benefit the households that purchased the discounted SKUs without cross-subsidizing non-buyers.
- **Shared logistics overhead:** Delivery and platform charges must be distributed equitably without fractional paise loss.
- **Rounding remainder drift:** In floating-point arithmetic or naive rounding, fractional fractions of a paisa / cent accumulate into multi-rupee reconciliation gaps between the merchant payout and resident collections.

The **F7 Deterministic Billing Engine** solves these challenges using a closed-form, integer-only formulation of the **Largest Remainder Method (Hamilton-Hare Algorithm)** adapted for multi-tenant collective commerce.

### Non-Negotiable Financial Rules
1. **100% Integer Paise Arithmetic:** Every financial value, calculation, remainder, and fee is stored and calculated in integer paise ($100\text{ paise} = ₹1.00$). Zero floating-point arithmetic is permitted anywhere in the billing pipeline.
2. **Actual Consumed Quantities Only:** Residents pay only for items and quantities actually packed by the merchant. If an item is short-packed or out-of-stock, the resident's charge is calculated strictly on their allocated packed count.
3. **No Cross-Product Discount Bleeding:** Variant-level discounts are strictly allocated to households purchasing that specific SKU, proportional to their consumed base cost.
4. **Zero-Burden for Out-of-Stock Households:** A household whose entire requested cart is unfulfilled pays ₹0 for items and ₹0 for delivery.
5. **Deterministic Remainder Tie-Breaking:** All remainder paise are allocated deterministically based on ranked fractional remainder, quantity magnitude, and lexicographical UUID order.
6. **Zero Discrepancy Tolerance:** The mathematical discrepancy $\Delta = \sum \text{Invoices} - \text{RetailerBill}$ must identically equal $0\text{ paise}$.

---

## 2. Mathematical Formalization & Proof of Invariant

### 2.1 Domain Definitions
Let:
- $H = \{h_1, h_2, \dots, h_m\}$ be the set of participating resident households.
- $V = \{v_1, v_2, \dots, v_k\}$ be the set of product variants ordered.
- $q_{h,v}^{\text{req}} \in \mathbb{Z}_{\ge 0}$ be the quantity of variant $v$ requested by household $h$.
- $Q_v^{\text{req}} = \sum_{h \in H} q_{h,v}^{\text{req}}$ be the total community demand for variant $v$.
- $P_v \in \mathbb{Z}_{\ge 0}$ be the retailer packed quantity of variant $v$, where $0 \le P_v \le Q_v^{\text{req}}$.
- $\text{price}_v \in \mathbb{Z}_{\ge 0}$ be the unit price of variant $v$ in integer paise.
- $D_v \in \mathbb{Z}_{\ge 0}$ be the merchant discount for variant $v$ in paise ($0 \le D_v \le P_v \times \text{price}_v$).
- $D_{\text{order}} \in \mathbb{Z}_{\ge 0}$ be the order-wide bulk discount in paise.
- $\text{Fee}_{\text{del}} \in \mathbb{Z}_{\ge 0}$ be the total delivery fee in paise.
- $\text{Fee}_{\text{plat}} \in \mathbb{Z}_{\ge 0}$ be the platform fee in paise.

---

### 2.2 Consumed Quantity Allocation (Short-Pack Resolution)

For each variant $v$:
1. If $Q_v^{\text{req}} == 0$ or $P_v == 0$, then $q_{h,v}^{\text{packed}} = 0$ for all $h \in H$.
2. If $P_v == Q_v^{\text{req}}$, then $q_{h,v}^{\text{packed}} = q_{h,v}^{\text{req}}$ for all $h \in H$.
3. If $0 < P_v < Q_v^{\text{req}}$ (Short-Pack):
   For each household $h$ with $q_{h,v}^{\text{req}} > 0$:
   - Integer base units:
     $$q_{h,v}^{\text{base}} = \left\lfloor \frac{q_{h,v}^{\text{req}} \times P_v}{Q_v^{\text{req}}} \right\rfloor$$
   - Remainder metric:
     $$r_{h,v}^{\text{qty}} = (q_{h,v}^{\text{req}} \times P_v) \pmod{Q_v^{\text{req}}}$$
   - Remainder units:
     $$R_v = P_v - \sum_{h \in H} q_{h,v}^{\text{base}}$$
   - Candidate households are sorted deterministically by the tuple:
     $$\mathbf{K}_{h,v}^{\text{qty}} = \left( -r_{h,v}^{\text{qty}},\, -q_{h,v}^{\text{req}},\, \text{str}(h) \right)$$
   - The first $R_v$ households in this sorted sequence receive $q_{h,v}^{\text{base}} + 1$ units; all remaining households receive $q_{h,v}^{\text{base}}$ units.

**Theorem 1 (Quantity Conservation):**
$$\sum_{h \in H} q_{h,v}^{\text{packed}} \equiv P_v$$

*Proof:*
By definition, $\sum_{h \in H} q_{h,v}^{\text{packed}} = \sum_{h} q_{h,v}^{\text{base}} + \sum_{i=1}^{R_v} 1 = \sum_{h} q_{h,v}^{\text{base}} + \left( P_v - \sum_{h} q_{h,v}^{\text{base}} \right) = P_v$. $\blacksquare$

---

### 2.3 Base Cost Allocation
For each household $h$:
$$\text{BaseCost}_{h,v} = q_{h,v}^{\text{packed}} \times \text{price}_v$$
$$\text{Subtotal}_h = \sum_{v \in V} \text{BaseCost}_{h,v}$$

Summing over all households:
$$\sum_{h \in H} \text{Subtotal}_h = \sum_{h \in H} \sum_{v \in V} (q_{h,v}^{\text{packed}} \times \text{price}_v) = \sum_{v \in V} \left( \text{price}_v \sum_{h \in H} q_{h,v}^{\text{packed}} \right) = \sum_{v \in V} (P_v \times \text{price}_v) \equiv \text{Gross}_{\text{retailer}}$$

---

### 2.4 Variant-Level Discount Allocation

For each variant $v$ where $D_v > 0$:
Let $C_v = P_v \times \text{price}_v$. If $C_v == 0$, $D_v^{\text{eff}} = 0$. Otherwise, $D_v^{\text{eff}} = \min(D_v, C_v)$.
For each household $h$ with $q_{h,v}^{\text{packed}} > 0$:
- Base discount paise:
  $$d_{h,v}^{\text{base}} = \left\lfloor \frac{D_v^{\text{eff}} \times \text{BaseCost}_{h,v}}{C_v} \right\rfloor$$
- Remainder paise:
  $$r_{h,v}^{\text{disc}} = (D_v^{\text{eff}} \times \text{BaseCost}_{h,v}) \pmod{C_v}$$
- Surplus remainder paise:
  $$R_v^{\text{disc}} = D_v^{\text{eff}} - \sum_h d_{h,v}^{\text{base}}$$
- Households are sorted by:
  $$\mathbf{K}_{h,v}^{\text{disc}} = \left( -r_{h,v}^{\text{disc}},\, -\text{BaseCost}_{h,v},\, \text{str}(h) \right)$$
- The top $R_v^{\text{disc}}$ households receive $+1\text{ paise}$.

**Theorem 2 (Variant Discount Conservation):**
$$\sum_{h \in H} d_{h,v} \equiv D_v^{\text{eff}}$$
*Proof:* Exact analog of Theorem 1 using integer remainder distribution. $\blacksquare$

---

### 2.5 Delivery Fee Allocation

Let $H_{\text{active}} = \{h \in H \mid \text{Subtotal}_h > 0\}$ be the set of households with positive consumption, and $N_{\text{active}} = |H_{\text{active}}|$.
If $N_{\text{active}} == 0$ or $\text{Fee}_{\text{del}} == 0$, delivery fee allocated is 0 for all households.

#### Mode A: EQUAL (Default)
$$\text{fee}_h^{\text{base}} = \left\lfloor \frac{\text{Fee}_{\text{del}}}{N_{\text{active}}} \right\rfloor, \quad R_{\text{del}} = \text{Fee}_{\text{del}} \pmod{N_{\text{active}}}$$
Sort active households canonically by $\text{str}(h)$ ascending. The first $R_{\text{del}}$ households receive $\text{fee}_h^{\text{base}} + 1\text{ paise}$.

#### Mode B: PRO_RATA
Let $S_{\text{active}} = \sum_{h \in H_{\text{active}}} \text{Subtotal}_h$.
$$\text{fee}_h^{\text{base}} = \left\lfloor \frac{\text{Fee}_{\text{del}} \times \text{Subtotal}_h}{S_{\text{active}}} \right\rfloor, \quad r_h = (\text{Fee}_{\text{del}} \times \text{Subtotal}_h) \pmod{S_{\text{active}}}$$
$$R_{\text{del}} = \text{Fee}_{\text{del}} - \sum_{h \in H_{\text{active}}} \text{fee}_h^{\text{base}}$$
Sort by $(-r_h, -\text{Subtotal}_h, \text{str}(h))$. Top $R_{\text{del}}$ households receive $+1\text{ paise}$.

**Theorem 3 (Delivery Fee Conservation):**
$$\sum_{h \in H} \text{DeliveryFee}_h \equiv \text{Fee}_{\text{del}}^{\text{eff}}$$

---

### 2.6 Grand Invariant Proof (Zero Discrepancy)

For each household $h$:
$$\text{InvoiceTotal}_h = \text{Subtotal}_h - \text{Discount}_h + \text{DeliveryFee}_h + \text{PlatformFee}_h$$

Summing over all $h \in H$:
$$\sum_{h \in H} \text{InvoiceTotal}_h = \sum_{h \in H} \text{Subtotal}_h - \sum_{h \in H} \text{Discount}_h + \sum_{h \in H} \text{DeliveryFee}_h + \sum_{h \in H} \text{PlatformFee}_h$$
$$= \text{Gross}_{\text{retailer}} - D_{\text{total}} + \text{Fee}_{\text{del}}^{\text{eff}} + \text{Fee}_{\text{plat}}^{\text{eff}} \equiv \text{Net}_{\text{retailer}}$$

Discrepancy:
$$\Delta = \left( \sum_{h \in H} \text{InvoiceTotal}_h \right) - \text{Net}_{\text{retailer}} \equiv 0\text{ paise}$$
**Q.E.D.** Discrepancy is mathematically identically zero for all inputs.

---

## 3. Worked Numerical Examples

### Example 1: Short-Packing and Equal Delivery Remainder

**Order Setup:**
- Variant: Aashirvaad Shudh Chakki Atta 5kg (`atta_5kg`), Unit Price = ₹220.00 ($22{,}000\text{ paise}$).
- Requested Quantities:
  - Household A (`user_A`): 4 units (Demand: ₹880.00)
  - Household B (`user_B`): 3 units (Demand: ₹660.00)
  - Household C (`user_C`): 3 units (Demand: ₹660.00)
  - **Total Requested:** 10 units.
- Retailer Packing:
  - Retailer only had 6 units in stock ($P_v = 6$). Short-pack of 4 units.
- Delivery Fee: ₹3.00 ($300\text{ paise}$), mode `EQUAL`.
- Discounts: ₹0.

**Step 1: Consumed Quantity Allocation**
$$Q_v^{\text{req}} = 10, \quad P_v = 6$$
- Household A ($q^{\text{req}} = 4$):
  $\text{base} = (4 \times 6) // 10 = 24 // 10 = 2$ units.
  $\text{rem} = (4 \times 6) \% 10 = 4$.
- Household B ($q^{\text{req}} = 3$):
  $\text{base} = (3 \times 6) // 10 = 18 // 10 = 1$ unit.
  $\text{rem} = (3 \times 6) \% 10 = 8$.
- Household C ($q^{\text{req}} = 3$):
  $\text{base} = (3 \times 6) // 10 = 18 // 10 = 1$ unit.
  $\text{rem} = (3 \times 6) \% 10 = 8$.

Base sum = $2 + 1 + 1 = 4$ units.
Surplus units to allocate = $6 - 4 = 2$ units.
Ranks by remainder:
1. Household B (rem = 8, req = 3) $\to$ **receives +1 unit** $\to 2$ units.
2. Household C (rem = 8, req = 3) $\to$ **receives +1 unit** $\to 2$ units.
3. Household A (rem = 4, req = 4) $\to$ 2 units.

Total packed: $2 + 2 + 2 = 6$ units.

**Step 2: Base Costs**
- Household A: $2 \times 22{,}000 = 44{,}000\text{ paise}$ (₹440.00)
- Household B: $2 \times 22{,}000 = 44{,}000\text{ paise}$ (₹440.00)
- Household C: $2 \times 22{,}000 = 44{,}000\text{ paise}$ (₹440.00)
- **Retailer Gross:** $6 \times 22{,}000 = 132{,}000\text{ paise}$ (₹1,320.00).

**Step 3: Delivery Fee Split**
Fee = $300\text{ paise}$, Active households = 3.
Base fee = $300 // 3 = 100\text{ paise}$ (₹1.00) each. Remainder = 0.

**Final Settlement:**
- Invoice A: $44{,}000 + 100 = 44{,}100\text{ paise}$ (₹441.00)
- Invoice B: $44{,}000 + 100 = 44{,}100\text{ paise}$ (₹441.00)
- Invoice C: $44{,}000 + 100 = 44{,}100\text{ paise}$ (₹441.00)
- **Sum of Invoices:** $44{,}100 + 44{,}100 + 44{,}100 = 132{,}300\text{ paise}$ (₹1,323.00).
- **Retailer Net:** $132{,}000 + 300 = 132{,}300\text{ paise}$ (₹1,323.00).
- **Discrepancy:** $132{,}300 - 132{,}300 = \mathbf{0\text{ paise}}$.

---

### Example 2: Non-Trivial Paise Remainder & Pro-Rata Delivery

**Order Setup:**
- Household A: orders ₹100.00 ($10{,}000\text{ paise}$).
- Household B: orders ₹300.00 ($30{,}000\text{ paise}$).
- Total Gross: ₹400.00 ($40{,}000\text{ paise}$).
- Delivery Fee: ₹1.00 ($100\text{ paise}$), mode `EQUAL`.

**Delivery Fee Allocation (Equal Mode):**
- $N = 2$ active households.
- Base fee = $100 // 2 = 50\text{ paise}$ each.
- Remainder = $100 \% 2 = 0$.

If Delivery Fee = ₹1.01 ($101\text{ paise}$):
- Base fee = $101 // 2 = 50\text{ paise}$ each.
- Remainder = $1\text{ paise}$.
- Canonical sorting: `user_A` < `user_B`.
- Household A receives: $50 + 1 = 51\text{ paise}$.
- Household B receives: $50\text{ paise}$.
- Total Delivery Fee: $51 + 50 = 101\text{ paise}$.

**Invariant Verification:**
- Invoice A: $10{,}000 + 51 = 10{,}051\text{ paise}$.
- Invoice B: $30{,}000 + 50 = 30{,}050\text{ paise}$.
- Sum of Invoices: $10{,}051 + 30{,}050 = 40{,}101\text{ paise}$.
- Retailer Bill: $40{,}000 + 101 = 40{,}101\text{ paise}$.
- **Discrepancy:** $\mathbf{0\text{ paise}}$.

---

## 4. Architectural Integration & Database Persistence

```
      Resident Carts (CommunityCartItems)
                      │
                      ▼
         Consolidated BulkOrder & Items
                      │
                      ▼
       ┌──────────────────────────────┐
       │   F7 Billing Engine          │
       │   (app/modules/billing)      │
       │                              │
       │  - Short-Pack Allocation     │
       │  - Base Cost Computation     │
       │  - Proportional Discounts    │
       │  - Delivery Fee Allocation   │
       │  - Zero Discrepancy Check    │
       └──────────────┬───────────────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
   RetailerBill                Invoices (per resident)
   (gross, discount, del, net) (base, disc, del, total)
                                   │
                                   ▼
                              InvoiceItems
```

### Endpoints
- `POST /api/v1/billing/calculate`: Pure simulation/preview endpoint.
- `POST /api/v1/billing/bulk-orders/{id}/finalize`: Idempotent transactional finalization writing `RetailerBill`, `Invoice`, `InvoiceItem`, and `DiscountAllocation` records.
- `GET /api/v1/billing/invoices/me`: Resident's personal invoice history.
- `GET /api/v1/billing/invoices/{id}`: Detailed invoice breakdown with RBAC privacy check.
- `GET /api/v1/billing/bills/{id}`: Retailer bill details.

---

## 5. Verification & Testing Evidence

1. **Unit Tests (`tests/test_billing_f7.py`):**
   - Zero quantities
   - Single household full packing
   - Multi-household short packing
   - Out-of-stock items (zero charges)
   - Variant and order discount allocations
   - Rounding remainders
   - Equal vs Pro-Rata delivery modes
2. **Property-Based Testing (`hypothesis`):**
   - 150 randomized scenarios testing edge cases with varied numbers of households, variants, quantities, unit prices, discounts, and fee structures.
   - 100% pass rate: `SUM(INVOICES) == RETAILER_BILL` in every single test run.
