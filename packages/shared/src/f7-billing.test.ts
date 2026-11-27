import { describe, expect, it } from "vitest";
import { calculateF7Billing, formatPaise, getCycleWindowIST } from "./index.js";

describe("formatPaise & cycle IST window", () => {
  it("formats paise accurately using Indian numbering", () => {
    expect(formatPaise(0)).toBe("₹0");
    expect(formatPaise(10500)).toBe("₹105");
    expect(formatPaise(10550)).toBe("₹105.50");
    expect(formatPaise(12500000)).toBe("₹1,25,000");
    expect(formatPaise(500, { approx: true })).toBe("~₹5");
  });

  it("computes IST 22nd 17:27 cutoff in UTC accurately", () => {
    // 2026-11-10T10:00:00Z -> Nov 2026 in IST -> 22 Nov 2026 17:27 IST == 11:57:00 UTC
    const res = getCycleWindowIST(new Date("2026-11-10T10:00:00Z"), 22, 17, 27);
    expect(res.cycleMonth).toBe("2026-11");
    expect(res.cutoffAt.toISOString()).toBe("2026-11-22T11:57:00.000Z");
  });
});

describe("F7 Deterministic Billing Engine", () => {
  it("guarantees zero discrepancy with short-packing, discounts, and indivisible delivery remainder", () => {
    const res = calculateF7Billing({
      resident_requests: [
        { user_id: "u1", variant_id: "rice", requested_qty: 2 },
        { user_id: "u2", variant_id: "rice", requested_qty: 2 },
        { user_id: "u3", variant_id: "rice", requested_qty: 1 },
        { user_id: "u1", variant_id: "milk", requested_qty: 3 },
        { user_id: "u2", variant_id: "milk", requested_qty: 1 },
      ],
      variant_packs: [
        // 5 requested -> 3 packed (short pack!), ₹100 each + ₹40 variant discount
        { variant_id: "rice", packed_qty: 3, unit_price_paise: 10000, discount_paise: 4000 },
        // Milk out of stock -> 0 packed
        { variant_id: "milk", packed_qty: 0, unit_price_paise: 6000, discount_paise: 500 },
      ],
      delivery_fee_paise: 10001, // ₹100.01 split unequally across 3 households
      order_discount_paise: 1000,
      platform_fee_paise: 500,
      delivery_allocation_mode: "EQUAL",
    });

    expect(res.audit_log.zero_discrepancy_verified).toBe(true);
    expect(res.audit_log.discrepancy_paise).toBe(0);
    expect(res.audit_log.total_packed_units).toBe(3);
    expect(res.retailer_bill.gross_amount_paise).toBe(30000);
    // Out-of-stock milk discount must not be applied since consumed cost is 0
    expect(res.retailer_bill.discount_amount_paise).toBe(5000);
    expect(res.retailer_bill.delivery_amount_paise).toBe(10001);

    const sumInvoices = res.resident_invoices.reduce((acc, inv) => acc + inv.total_amount_paise, 0);
    expect(sumInvoices).toBe(res.retailer_bill.net_amount_paise);
  });

  it("allocates delivery pro-rata with deterministic remainder distribution", () => {
    const res = calculateF7Billing({
      resident_requests: [
        { user_id: "u_a", variant_id: "v1", requested_qty: 1 },
        { user_id: "u_b", variant_id: "v1", requested_qty: 2 },
        { user_id: "u_c", variant_id: "v1", requested_qty: 4 },
      ],
      variant_packs: [{ variant_id: "v1", packed_qty: 7, unit_price_paise: 5000 }],
      delivery_fee_paise: 10000,
      delivery_allocation_mode: "PRO_RATA",
    });

    expect(res.audit_log.zero_discrepancy_verified).toBe(true);
    const totalDel = res.resident_invoices.reduce((a, b) => a + b.delivery_fee_paise, 0);
    expect(totalDel).toBe(10000);
  });

  it("excludes households whose items were completely out of stock from equal delivery fees", () => {
    const res = calculateF7Billing({
      resident_requests: [
        { user_id: "u1", variant_id: "v1", requested_qty: 1 },
        { user_id: "u2", variant_id: "v2", requested_qty: 2 }, // v2 is 0 packed
      ],
      variant_packs: [
        { variant_id: "v1", packed_qty: 1, unit_price_paise: 5000 },
        { variant_id: "v2", packed_qty: 0, unit_price_paise: 4000 },
      ],
      delivery_fee_paise: 5000,
      delivery_allocation_mode: "EQUAL",
    });

    const inv1 = res.resident_invoices.find((i) => i.user_id === "u1")!;
    const inv2 = res.resident_invoices.find((i) => i.user_id === "u2")!;
    expect(inv1.delivery_fee_paise).toBe(5000);
    expect(inv2.delivery_fee_paise).toBe(0);
    expect(inv2.total_amount_paise).toBe(0);
    expect(res.audit_log.zero_discrepancy_verified).toBe(true);
  });
});
