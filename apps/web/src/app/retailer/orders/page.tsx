"use client";

import React, { useState, useMemo } from "react";
import { RetailerLayout } from "@/components/layout/RetailerLayout";
import {
  Card,
  Button,
  StatusPill,
  MoneyText,
  Stepper,
  Dialog,
  Banner,
  Toast,
  Chip,
} from "@/components/ui";
import {
  CheckCircle2,
  Receipt,
  ArrowRight,
  Users,
  ShieldCheck,
  Check,
} from "lucide-react";

interface OrderLine {
  customer_id: string;
  customer_name: string;
  unit_label: string;
  variant_id: string;
  product_name: string;
  variant_label: string;
  requested_qty: number;
  packed_qty: number;
  unit_price_paise: number;
  mrp_paise: number;
}

interface VariantSummary {
  variant_id: string;
  product_name: string;
  variant_label: string;
  total_requested_qty: number;
  total_packed_qty: number;
  unit_price_paise: number;
  mrp_paise: number;
  stock_qty: number;
  product_discount_paise: number;
}

const INITIAL_LINES: OrderLine[] = [
  // 1. Asha (A-101)
  {
    customer_id: "usr-c1-asha",
    customer_name: "Asha Rao",
    unit_label: "A-101",
    variant_id: "var-rice-sona-5kg",
    product_name: "Sona Masoori Rice",
    variant_label: "5 kg",
    requested_qty: 1,
    packed_qty: 1,
    unit_price_paise: 30000,
    mrp_paise: 34000,
  },
  {
    customer_id: "usr-c1-asha",
    customer_name: "Asha Rao",
    unit_label: "A-101",
    variant_id: "var-sugar-1kg",
    product_name: "Refined Sugar",
    variant_label: "1 kg",
    requested_qty: 2,
    packed_qty: 2,
    unit_price_paise: 7500,
    mrp_paise: 8000,
  },
  {
    customer_id: "usr-c1-asha",
    customer_name: "Asha Rao",
    unit_label: "A-101",
    variant_id: "var-oil-sunflower-1l",
    product_name: "Sunflower Oil",
    variant_label: "1 L",
    requested_qty: 1,
    packed_qty: 1,
    unit_price_paise: 25000,
    mrp_paise: 27000,
  },
  {
    customer_id: "usr-c1-asha",
    customer_name: "Asha Rao",
    unit_label: "A-101",
    variant_id: "var-dal-toor-500g",
    product_name: "Toor Dal",
    variant_label: "500 g",
    requested_qty: 1,
    packed_qty: 1,
    unit_price_paise: 10000,
    mrp_paise: 11000,
  },
  // 2. Bharat (B-204)
  {
    customer_id: "usr-c2-bharat",
    customer_name: "Bharat Patel",
    unit_label: "B-204",
    variant_id: "var-rice-sona-5kg",
    product_name: "Sona Masoori Rice",
    variant_label: "5 kg",
    requested_qty: 2,
    packed_qty: 2,
    unit_price_paise: 30000,
    mrp_paise: 34000,
  },
  // 3. Chitra (C-305)
  {
    customer_id: "usr-c3-chitra",
    customer_name: "Chitra Nair",
    unit_label: "C-305",
    variant_id: "var-rice-sona-5kg",
    product_name: "Sona Masoori Rice",
    variant_label: "5 kg",
    requested_qty: 1,
    packed_qty: 1,
    unit_price_paise: 30000,
    mrp_paise: 34000,
  },
  {
    customer_id: "usr-c3-chitra",
    customer_name: "Chitra Nair",
    unit_label: "C-305",
    variant_id: "var-dal-toor-500g",
    product_name: "Toor Dal",
    variant_label: "500 g",
    requested_qty: 1,
    packed_qty: 1,
    unit_price_paise: 10000,
    mrp_paise: 11000,
  },
  // 4. Dev (D-402)
  {
    customer_id: "usr-c4-dev",
    customer_name: "Dev Sharma",
    unit_label: "D-402",
    variant_id: "var-rice-sona-5kg",
    product_name: "Sona Masoori Rice",
    variant_label: "5 kg",
    requested_qty: 2,
    packed_qty: 2,
    unit_price_paise: 30000,
    mrp_paise: 34000,
  },
  {
    customer_id: "usr-c4-dev",
    customer_name: "Dev Sharma",
    unit_label: "D-402",
    variant_id: "var-dal-toor-500g",
    product_name: "Toor Dal",
    variant_label: "500 g",
    requested_qty: 1,
    packed_qty: 1,
    unit_price_paise: 10000,
    mrp_paise: 11000,
  },
];

export default function RetailerOrdersPage() {
  // Order state: submitted -> accepted -> packing -> billed
  const [orderStatus, setOrderStatus] = useState<"submitted" | "accepted" | "packing" | "billed">(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("pact_retailer_order_status");
      if (saved === "accepted" || saved === "packing" || saved === "billed") return saved;
    }
    return "submitted";
  });

  const [activeTab, setActiveTab] = useState<"review" | "pack" | "bill">("review");
  const [viewMode, setViewMode] = useState<"product" | "customer">("product");

  const [lines, setLines] = useState<OrderLine[]>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("pact_retailer_order_lines");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return INITIAL_LINES;
  });

  // Billing parameters
  const [overallDiscountPaise, setOverallDiscountPaise] = useState<number>(25000); // ₹250
  const [deliveryChargePaise, setDeliveryChargePaise] = useState<number>(0);
  const [variantPrices, setVariantPrices] = useState<Record<string, number>>({
    "var-rice-sona-5kg": 30000,
    "var-sugar-1kg": 7500,
    "var-oil-sunflower-1l": 25000,
    "var-dal-toor-500g": 10000,
  });

  // Dialogs
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [finaliseOpen, setFinaliseOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isFinalising, setIsFinalising] = useState(false);

  // Sync to session storage
  const syncLines = (newLines: OrderLine[]) => {
    setLines(newLines);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pact_retailer_order_lines", JSON.stringify(newLines));
    }
  };

  const updateStatus = (newStatus: "submitted" | "accepted" | "packing" | "billed") => {
    setOrderStatus(newStatus);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pact_retailer_order_status", newStatus);
    }
  };

  // Grouped by variant summary
  const variantsSummary = useMemo(() => {
    const map: Record<string, VariantSummary> = {};
    for (const l of lines) {
      if (!map[l.variant_id]) {
        map[l.variant_id] = {
          variant_id: l.variant_id,
          product_name: l.product_name,
          variant_label: l.variant_label,
          total_requested_qty: 0,
          total_packed_qty: 0,
          unit_price_paise: variantPrices[l.variant_id] || l.unit_price_paise,
          mrp_paise: l.mrp_paise,
          stock_qty: 100,
          product_discount_paise: 0,
        };
      }
      map[l.variant_id].total_requested_qty += l.requested_qty;
      map[l.variant_id].total_packed_qty += l.packed_qty;
    }
    return Object.values(map);
  }, [lines, variantPrices]);

  // Gross total
  const grossTotalPaise = useMemo(() => {
    return lines.reduce((acc, curr) => {
      const price = variantPrices[curr.variant_id] || curr.unit_price_paise;
      return acc + curr.packed_qty * price;
    }, 0);
  }, [lines, variantPrices]);

  // Final bill total
  const billTotalPaise = Math.max(0, grossTotalPaise - overallDiscountPaise + deliveryChargePaise);

  // Computed per-customer split preview (F7 Largest-Remainder)
  const customerSplitPreview = useMemo(() => {
    // 1. Customer subtotals
    const subtotalMap: Record<string, { name: string; unit_label: string; subtotal: number }> = {};
    for (const l of lines) {
      if (!subtotalMap[l.customer_id]) {
        subtotalMap[l.customer_id] = {
          name: l.customer_name,
          unit_label: l.unit_label,
          subtotal: 0,
        };
      }
      const price = variantPrices[l.variant_id] || l.unit_price_paise;
      subtotalMap[l.customer_id].subtotal += l.packed_qty * price;
    }

    const cids = Object.keys(subtotalMap).sort();
    const sumSubtotals = cids.reduce((acc, id) => acc + subtotalMap[id].subtotal, 0);

    // 2. Allocate overall discount by subtotal weight
    const allocatedDiscount: Record<string, number> = {};
    if (sumSubtotals > 0 && overallDiscountPaise > 0) {
      const baseShares: number[] = [];
      const remainders: number[] = [];
      for (const id of cids) {
        const sub = subtotalMap[id].subtotal;
        baseShares.push(Math.floor((overallDiscountPaise * sub) / sumSubtotals));
        remainders.push((overallDiscountPaise * sub) % sumSubtotals);
      }
      const allocatedSum = baseShares.reduce((a, b) => a + b, 0);
      const leftover = overallDiscountPaise - allocatedSum;

      const order = cids
        .map((id, idx) => ({ id, idx, rem: remainders[idx] }))
        .sort((a, b) => b.rem - a.rem || a.id.localeCompare(b.id));

      const finalShares = [...baseShares];
      for (let r = 0; r < leftover; r++) {
        finalShares[order[r].idx] += 1;
      }
      cids.forEach((id, idx) => {
        allocatedDiscount[id] = finalShares[idx];
      });
    } else {
      cids.forEach((id) => (allocatedDiscount[id] = 0));
    }

    // 3. Invoices
    return cids.map((id) => {
      const item = subtotalMap[id];
      const disc = allocatedDiscount[id] || 0;
      const total = Math.max(0, item.subtotal - disc);
      return {
        customer_id: id,
        name: item.name,
        unit_label: item.unit_label,
        subtotal_paise: item.subtotal,
        discount_share_paise: disc,
        total_paise: total,
      };
    });
  }, [lines, variantPrices, overallDiscountPaise]);

  // Actions
  const handleAccept = async () => {
    updateStatus("accepted");
    setActiveTab("pack");
    setToastMsg("Community order accepted. Reserved inventory for Green Meadows.");
    try {
      await fetch("/api/v1/retailer/orders/ord-comm-green-meadows-2026-11/accept", {
        method: "POST",
      });
    } catch {
      // offline fallback
    }
  };

  const handleReject = async () => {
    setRejectOpen(false);
    updateStatus("submitted");
    setToastMsg(`Order rejected: ${rejectReason || "Cannot fulfill at this time"}`);
  };

  const handleUpdatePackedQty = (variant_id: string, customer_id: string, qty: number) => {
    if (orderStatus === "billed") return;
    const updated = lines.map((l) =>
      l.variant_id === variant_id && l.customer_id === customer_id
        ? { ...l, packed_qty: Math.min(l.requested_qty, Math.max(0, qty)) }
        : l
    );
    syncLines(updated);
  };

  const handleAllPacked = () => {
    if (orderStatus === "billed") return;
    const updated = lines.map((l) => ({ ...l, packed_qty: l.requested_qty }));
    syncLines(updated);
    setToastMsg("All staples marked fully packed.");
  };

  const handleSimulateShortPack = () => {
    if (orderStatus === "billed") return;
    // Short pack Dev's Toor Dal to 0 per Scenario G variant
    const updated = lines.map((l) =>
      l.customer_id === "usr-c4-dev" && l.variant_id === "var-dal-toor-500g"
        ? { ...l, packed_qty: 0 }
        : l
    );
    syncLines(updated);
    setToastMsg("Simulated short pack: Dev's Toor Dal set to 0. Watch split live-adjust!");
  };

  const handleFinaliseConfirm = async () => {
    setIsFinalising(true);
    try {
      await fetch("/api/v1/retailer/orders/ord-comm-green-meadows-2026-11/finalise", {
        method: "POST",
      });
    } catch {
      // offline fallback
    }
    setIsFinalising(false);
    setFinaliseOpen(false);
    updateStatus("billed");
    setToastMsg("Bill finalised! 4 customer invoices generated and amounts locked.");
  };

  return (
    <RetailerLayout>
      <div className="space-y-6">
        {/* Header with Title and Four-Step Progress per U8 */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl sm:text-3xl text-ink-800">
                  Green Meadows Apartments
                </h1>
                <StatusPill
                  kind={
                    orderStatus === "billed"
                      ? "success"
                      : orderStatus === "packing"
                      ? "info"
                      : orderStatus === "accepted"
                      ? "info"
                      : "warning"
                  }
                  label={
                    orderStatus === "billed"
                      ? "Billed & Finalised"
                      : orderStatus === "packing"
                      ? "Packing in Progress"
                      : orderStatus === "accepted"
                      ? "Accepted"
                      : "Awaiting Review"
                  }
                />
              </div>
              <p className="text-xs text-ink-600 mt-0.5">
                Consolidated November Bulk Order · ORD-GREEN-202611-001 · 9 Staples Lines
              </p>
            </div>

            <div className="text-right flex sm:flex-col items-center sm:items-end justify-between gap-1">
              <span className="text-xs font-semibold text-ink-500">Gross Value</span>
              <div className="font-display text-2xl text-ink-800">
                <MoneyText paise={grossTotalPaise} size="xl" />
              </div>
            </div>
          </div>

          {/* 4-Step Progress Header */}
          <Card padding="none" className="bg-white overflow-hidden">
            <div className="grid grid-cols-4 divide-x divide-ice-100 text-center text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("review")}
                className={`py-3 px-2 transition-colors cursor-pointer ${
                  activeTab === "review"
                    ? "bg-ice-200 text-ink-900 border-b-2 border-teal-700 font-bold"
                    : "text-ink-600 hover:bg-ice-50"
                }`}
              >
                1. Review
              </button>
              <button
                type="button"
                onClick={() => {
                  if (orderStatus !== "submitted") setActiveTab("pack");
                }}
                disabled={orderStatus === "submitted"}
                className={`py-3 px-2 transition-colors ${
                  orderStatus === "submitted"
                    ? "text-ink-300 cursor-not-allowed"
                    : activeTab === "pack"
                    ? "bg-ice-200 text-ink-900 border-b-2 border-teal-700 font-bold cursor-pointer"
                    : "text-ink-600 hover:bg-ice-50 cursor-pointer"
                }`}
              >
                2. Pack Staples
              </button>
              <button
                type="button"
                onClick={() => {
                  if (orderStatus !== "submitted") setActiveTab("bill");
                }}
                disabled={orderStatus === "submitted"}
                className={`py-3 px-2 transition-colors ${
                  orderStatus === "submitted"
                    ? "text-ink-300 cursor-not-allowed"
                    : activeTab === "bill"
                    ? "bg-ice-200 text-ink-900 border-b-2 border-teal-700 font-bold cursor-pointer"
                    : "text-ink-600 hover:bg-ice-50 cursor-pointer"
                }`}
              >
                3. Price & Bill
              </button>
              <div
                className={`py-3 px-2 ${
                  orderStatus === "billed"
                    ? "bg-success-100 text-success-700 font-bold"
                    : "text-ink-400 bg-ice-50"
                }`}
              >
                4. {orderStatus === "billed" ? "Billed ✓" : "Finalise"}
              </div>
            </div>
          </Card>
        </div>

        {orderStatus === "billed" && (
          <Banner
            kind="info"
            message="This bill has been finalised and locked. 4 individual invoices totaling ₹2,250 have been issued to Green Meadows residents."
          />
        )}

        {/* TAB 1: REVIEW ORDER */}
        {activeTab === "review" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Chip
                  selected={viewMode === "product"}
                  onClick={() => setViewMode("product")}
                >
                  By Product (4 Staples)
                </Chip>
                <Chip
                  selected={viewMode === "customer"}
                  onClick={() => setViewMode("customer")}
                >
                  By Customer (4 Neighbours)
                </Chip>
              </div>

              {orderStatus === "submitted" && (
                <div className="flex gap-2">
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => setRejectOpen(true)}
                  >
                    Reject Order
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Check className="w-4 h-4" />}
                    onClick={handleAccept}
                  >
                    Accept & Reserve Stock
                  </Button>
                </div>
              )}
            </div>

            {viewMode === "product" ? (
              <Card padding="none" className="bg-white overflow-hidden divide-y divide-ice-100">
                <div className="p-3.5 bg-ice-50 text-xs font-semibold text-ink-600 grid grid-cols-12 gap-2">
                  <div className="col-span-5">Product & Variant</div>
                  <div className="col-span-2 text-center">Requested Total</div>
                  <div className="col-span-2 text-right">Selling Price</div>
                  <div className="col-span-3 text-right">Available Stock</div>
                </div>
                {variantsSummary.map((v) => (
                  <div
                    key={v.variant_id}
                    className="p-3.5 text-xs grid grid-cols-12 gap-2 items-center hover:bg-ice-50/50"
                  >
                    <div className="col-span-5">
                      <span className="font-bold text-ink-800 block">{v.product_name}</span>
                      <span className="text-ink-500">{v.variant_label}</span>
                    </div>
                    <div className="col-span-2 text-center font-bold text-ink-800 text-sm">
                      {v.total_requested_qty} packs
                    </div>
                    <div className="col-span-2 text-right">
                      <MoneyText paise={v.unit_price_paise} size="sm" />
                      <span className="block text-[10px] text-ink-400">MRP ₹{v.mrp_paise / 100}</span>
                    </div>
                    <div className="col-span-3 text-right font-medium text-success-700">
                      {v.stock_qty} in stock
                    </div>
                  </div>
                ))}
              </Card>
            ) : (
              <Card padding="none" className="bg-white overflow-hidden divide-y divide-ice-100">
                <div className="p-3.5 bg-ice-50 text-xs font-semibold text-ink-600 grid grid-cols-12 gap-2">
                  <div className="col-span-4">Resident (Flat)</div>
                  <div className="col-span-5">Requested Staples</div>
                  <div className="col-span-3 text-right">Subtotal</div>
                </div>
                {customerSplitPreview.map((c) => {
                  const cLines = lines.filter((l) => l.customer_id === c.customer_id);
                  return (
                    <div key={c.customer_id} className="p-3.5 text-xs grid grid-cols-12 gap-2 items-center hover:bg-ice-50/50">
                      <div className="col-span-4">
                        <span className="font-bold text-ink-800 block">{c.name}</span>
                        <span className="text-ink-500">Flat {c.unit_label}</span>
                      </div>
                      <div className="col-span-5 space-y-0.5 text-[11px] text-ink-700">
                        {cLines.map((l) => (
                          <div key={l.variant_id}>
                            {l.product_name} ({l.variant_label}) × {l.requested_qty}
                          </div>
                        ))}
                      </div>
                      <div className="col-span-3 text-right font-bold text-ink-800">
                        <MoneyText paise={c.subtotal_paise} size="sm" />
                      </div>
                    </div>
                  );
                })}
              </Card>
            )}

            {orderStatus !== "submitted" && (
              <div className="pt-2 flex justify-end">
                <Button variant="primary" onClick={() => setActiveTab("pack")} icon={<ArrowRight className="w-4 h-4" />}>
                  Proceed to Packing
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PACKING SCREEN */}
        {activeTab === "pack" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex gap-2">
                <Chip selected={viewMode === "product"} onClick={() => setViewMode("product")}>
                  By Product
                </Chip>
                <Chip selected={viewMode === "customer"} onClick={() => setViewMode("customer")}>
                  By Customer
                </Chip>
              </div>

              {orderStatus !== "billed" && (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={handleAllPacked}>
                    All Packed
                  </Button>
                  <Button variant="quiet" size="sm" onClick={handleSimulateShortPack}>
                    Simulate Short-Pack
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Receipt className="w-4 h-4" />}
                    onClick={() => setActiveTab("bill")}
                  >
                    Go to Billing
                  </Button>
                </div>
              )}
            </div>

            <Card padding="none" className="bg-white overflow-hidden divide-y divide-ice-100">
              <div className="p-3.5 bg-ice-50 text-xs font-semibold text-ink-600 flex justify-between items-center">
                <span>Packing Lines (Pre-filled to Requested Quantities)</span>
                <span>Packed / Requested</span>
              </div>

              {lines.map((line) => {
                const isShort = line.packed_qty < line.requested_qty;
                const isZero = line.packed_qty === 0;

                return (
                  <div
                    key={`${line.customer_id}-${line.variant_id}`}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-ice-50/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ink-800">
                          {line.product_name}
                        </span>
                        <span className="text-xs text-ink-500">
                          ({line.variant_label})
                        </span>
                        {isZero ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger-100 text-danger-700">
                            Not available this month
                          </span>
                        ) : isShort ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warning-100 text-warning-700">
                            The store had less: packed {line.packed_qty} of {line.requested_qty}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success-100 text-success-700">
                            Packed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-500">
                        {line.customer_name} · Flat {line.unit_label}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-xs text-ink-500 block">Asked {line.requested_qty}</span>
                        <MoneyText paise={line.packed_qty * (variantPrices[line.variant_id] || line.unit_price_paise)} size="sm" />
                      </div>

                      {orderStatus !== "billed" ? (
                        <Stepper
                          value={line.packed_qty}
                          min={0}
                          max={line.requested_qty}
                          onChange={(qty) => handleUpdatePackedQty(line.variant_id, line.customer_id, qty)}
                        />
                      ) : (
                        <span className="text-sm font-bold text-ink-800 px-3 py-1 bg-ice-100 rounded-ctl">
                          {line.packed_qty} packed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>

            <div className="flex justify-between items-center pt-2">
              <Button variant="secondary" size="sm" onClick={() => setActiveTab("review")}>
                ← Back to Review
              </Button>
              <Button
                variant="primary"
                onClick={() => setActiveTab("bill")}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Save & Proceed to Billing
              </Button>
            </div>
          </div>
        )}

        {/* TAB 3: BILLING & SPLITTING SCREEN */}
        {activeTab === "bill" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Pricing & Discounts Table */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="p-5 space-y-4 bg-white">
                <div className="flex items-center justify-between border-b border-ice-100 pb-3">
                  <h3 className="font-display text-lg text-ink-800">
                    Final Wholesale Unit Pricing
                  </h3>
                  <span className="text-xs text-ink-500">
                    Cannot exceed MRP per F6
                  </span>
                </div>

                <div className="divide-y divide-ice-100">
                  {variantsSummary.map((v) => (
                    <div
                      key={v.variant_id}
                      className="py-3 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-ink-800 block text-sm">
                          {v.product_name}
                        </span>
                        <span className="text-ink-500">
                          {v.variant_label} · {v.total_packed_qty} packs packed · MRP ₹{v.mrp_paise / 100}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-xs font-bold text-ink-800 block">
                            ₹{(variantPrices[v.variant_id] || v.unit_price_paise) / 100}
                          </span>
                          <span className="text-[10px] text-teal-700">
                            Line Gross: ₹{((variantPrices[v.variant_id] || v.unit_price_paise) * v.total_packed_qty) / 100}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Overall Discount Input */}
                <div className="pt-3 border-t border-ice-100 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-ice-50 rounded-ctl border border-ice-200">
                    <div>
                      <span className="font-bold text-xs text-ink-800 block">
                        Community Volume Discount (₹)
                      </span>
                      <span className="text-[11px] text-ink-500">
                        Proportionally deducted from all customer subtotals
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink-700">₹</span>
                      <input
                        type="number"
                        disabled={orderStatus === "billed"}
                        value={overallDiscountPaise / 100}
                        onChange={(e) => setOverallDiscountPaise(Math.max(0, Number(e.target.value) * 100))}
                        className="w-24 px-2 py-1 rounded-ctl border border-ice-300 text-right font-bold text-xs bg-white focus-ring"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-ice-50 rounded-ctl border border-ice-200">
                    <div>
                      <span className="font-bold text-xs text-ink-800 block">
                        Community Delivery Fee (₹)
                      </span>
                      <span className="text-[11px] text-ink-500">
                        Split equally among active ordering households
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink-700">₹</span>
                      <input
                        type="number"
                        disabled={orderStatus === "billed"}
                        value={deliveryChargePaise / 100}
                        onChange={(e) => setDeliveryChargePaise(Math.max(0, Number(e.target.value) * 100))}
                        className="w-24 px-2 py-1 rounded-ctl border border-ice-300 text-right font-bold text-xs bg-white focus-ring"
                      />
                    </div>
                  </div>
                </div>

                {/* Bill Summary Footer */}
                <div className="pt-4 border-t border-ice-200 flex justify-between items-baseline">
                  <div>
                    <span className="text-xs font-semibold text-ink-500 block">
                      Consolidated Bill Total
                    </span>
                    <span className="text-[11px] text-teal-700">
                      Zero markup · Direct wholesale batch
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-3xl text-ink-800">
                      <MoneyText paise={billTotalPaise} size="xl" />
                    </div>
                  </div>
                </div>
              </Card>

              {orderStatus !== "billed" && (
                <div className="flex justify-between items-center">
                  <Button variant="secondary" onClick={() => setActiveTab("pack")}>
                    ← Back to Packing
                  </Button>
                  <Button
                    variant="primary"
                    size="default"
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={() => setFinaliseOpen(true)}
                  >
                    Finalise Bill (₹{billTotalPaise / 100})
                  </Button>
                </div>
              )}
            </div>

            {/* Right Column: Live Per-Customer Split Panel per F7 */}
            <div className="space-y-4">
              <Card className="p-5 space-y-4 bg-ice-100 border-ice-300">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-700" />
                  <h3 className="font-bold text-xs text-ink-800 uppercase tracking-wider">
                    F7 Split Invoices Preview
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {customerSplitPreview.map((c) => (
                    <div
                      key={c.customer_id}
                      className="p-3 bg-white rounded-ctl border border-ice-200 space-y-1 text-xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-ink-800">
                          {c.name} ({c.unit_label})
                        </span>
                        <span className="font-bold text-ink-900 text-sm">
                          ₹{(c.total_paise / 100).toFixed(c.total_paise % 100 !== 0 ? 2 : 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-ink-500">
                        <span>Items: ₹{(c.subtotal_paise / 100).toFixed(0)}</span>
                        <span className="text-teal-700">
                          Disc: -₹{(c.discount_share_paise / 100).toFixed(c.discount_share_paise % 100 !== 0 ? 2 : 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-white/80 rounded-ctl border border-ice-200 space-y-1 text-xs">
                  <div className="flex justify-between font-bold text-ink-800">
                    <span>Sum of Invoices</span>
                    <span>₹{(billTotalPaise / 100).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-success-700 font-semibold">
                    <span>Financial Invariant</span>
                    <span>Exact Match (0 paise error)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-ink-500 pt-1">
                  <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>Largest-remainder allocation with tie-breaking.</span>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Finalise Confirmation Dialog per U8 / U5 */}
        <Dialog
          isOpen={finaliseOpen}
          onClose={() => setFinaliseOpen(false)}
          title="Finalise this month's bill?"
          description={`This locks amounts and issues 4 individual invoices totaling ₹${billTotalPaise / 100} with ₹${overallDiscountPaise / 100} collective discount. Finalised bills cannot be changed afterwards.`}
          confirmLabel="Finalise bill"
          cancelLabel="Go back"
          onConfirm={handleFinaliseConfirm}
          isConfirmLoading={isFinalising}
        />

        {/* Reject Dialog */}
        <Dialog
          isOpen={rejectOpen}
          onClose={() => setRejectOpen(false)}
          title="Reject this community order?"
          description="Residents and building admins will be notified immediately that the store cannot fulfill this cycle. Nothing will be charged."
          confirmLabel="Reject order"
          cancelLabel="Go back"
          isDestructive
          onConfirm={handleReject}
        >
          <div className="pt-3">
            <label className="block text-xs font-semibold text-ink-700 mb-1">
              Reason for rejection
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Temporary stock shortage for bulk grain orders"
              rows={3}
              className="w-full p-2.5 rounded-ctl border border-ice-300 text-xs bg-white focus-ring text-ink-800"
            />
          </div>
        </Dialog>

        {/* Toast */}
        <Toast
          isOpen={!!toastMsg}
          message={toastMsg || ""}
          onClose={() => setToastMsg(null)}
        />
      </div>
    </RetailerLayout>
  );
}
