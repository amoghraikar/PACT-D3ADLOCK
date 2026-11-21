"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  ProgressBar,
} from "@/components/ui";
import {
  CheckCircle2,
  Receipt,
  ArrowRight,
  Users,
  ShieldCheck,
  Check,
  Layers,
  ShoppingBag,
  Percent,
  Clock,
  PackageCheck,
  Truck,
  Send,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";

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
  // Main Lifecycle Stage Tabs: to_pack | billed | completed
  const [lifecycleTab, setLifecycleTab] = useState<"to_pack" | "billed" | "completed">("to_pack");

  // Packing View Mode: bulk ("all at once") vs individual ("per resident")
  const [packingMode, setPackingMode] = useState<"bulk" | "individual">("bulk");

  // Sub-tabs in to_pack: review | pack | bill
  const [packingStep, setPackingStep] = useState<"review" | "pack" | "bill">("review");

  // Order state: submitted -> accepted -> packing -> billed -> completed
  const [orderStatus, setOrderStatus] = useState<"submitted" | "accepted" | "packing" | "billed" | "completed">(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("pact_retailer_order_status");
      if (saved === "accepted" || saved === "packing" || saved === "billed" || saved === "completed") {
        return saved;
      }
    }
    return "submitted";
  });

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

  // Per-item discount percentages
  const [itemDiscountPct, setItemDiscountPct] = useState<Record<string, number>>({
    "var-rice-sona-5kg": 12,
    "var-sugar-1kg": 6,
    "var-oil-sunflower-1l": 7,
    "var-dal-toor-500g": 9,
  });

  // Variant selling prices in paise (calculated from MRP & discount %)
  const [variantPrices, setVariantPrices] = useState<Record<string, number>>({
    "var-rice-sona-5kg": 30000,
    "var-sugar-1kg": 7500,
    "var-oil-sunflower-1l": 25000,
    "var-dal-toor-500g": 10000,
  });

  // Overall Discount: in percentage & rupees
  const [overallDiscountPct, setOverallDiscountPct] = useState<number>(10); // 10%
  const [overallDiscountPaise, setOverallDiscountPaise] = useState<number>(25000); // ₹250
  const [deliveryChargePaise, setDeliveryChargePaise] = useState<number>(0);

  // Packed checklist state for store staff
  const [checkedBulkItems, setCheckedBulkItems] = useState<Record<string, boolean>>({});
  const [checkedResidentBags, setCheckedResidentBags] = useState<Record<string, boolean>>({});

  // Dialogs
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [finaliseOpen, setFinaliseOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isFinalising, setIsFinalising] = useState(false);

  // Check paid status from session / localStorage
  const [paidCustomers, setPaidCustomers] = useState<Record<string, boolean>>({
    "usr-c1-asha": true,
    "usr-c2-bharat": true,
    "usr-c4-dev": true,
    "usr-c3-chitra": false,
  });

  // Automatically update lifecycleTab when order is billed or completed
  useEffect(() => {
    if (orderStatus === "billed") {
      setLifecycleTab("billed");
    } else if (orderStatus === "completed") {
      setLifecycleTab("completed");
    } else {
      setLifecycleTab("to_pack");
    }
  }, [orderStatus]);

  // Connect Retailer to live backend data (Order lines & Collections)
  useEffect(() => {
    async function loadBackendOrder() {
      try {
        const res = await fetch("/api/v1/retailer/orders/ord-comm-green-2026-11", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.order && data.order.status) {
            setOrderStatus(data.order.status);
          }
          if (data.customer_lines && data.customer_lines.length > 0) {
            setLines(data.customer_lines);
            if (typeof window !== "undefined") {
              sessionStorage.setItem("pact_retailer_order_lines", JSON.stringify(data.customer_lines));
            }
          }
        }
      } catch {
        // fallback
      }

      try {
        const cRes = await fetch("/api/v1/retailer/orders/ord-comm-green-2026-11/collections", { credentials: "include" });
        if (cRes.ok) {
          const cData = await cRes.json();
          if (cData.customers && cData.customers.length > 0) {
            const pMap: Record<string, boolean> = {};
            cData.customers.forEach((c: any) => {
              pMap[c.customer_id] = c.status === "paid";
            });
            setPaidCustomers(pMap);
          }
        }
      } catch {
        // fallback
      }
    }

    loadBackendOrder();
  }, []);

  const syncLines = (newLines: OrderLine[]) => {
    setLines(newLines);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pact_retailer_order_lines", JSON.stringify(newLines));
    }
  };

  const updateStatus = (newStatus: "submitted" | "accepted" | "packing" | "billed" | "completed") => {
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
        };
      }
      map[l.variant_id].total_requested_qty += l.requested_qty;
      map[l.variant_id].total_packed_qty += l.packed_qty;
    }
    return Object.values(map);
  }, [lines, variantPrices]);

  // Gross total of packed items
  const grossTotalPaise = useMemo(() => {
    return lines.reduce((acc, curr) => {
      const price = variantPrices[curr.variant_id] || curr.unit_price_paise;
      return acc + curr.packed_qty * price;
    }, 0);
  }, [lines, variantPrices]);

  // Recalculate overall discount when percentage or gross changes
  const handleOverallDiscountPctChange = (pct: number) => {
    const validPct = Math.max(0, Math.min(100, pct));
    setOverallDiscountPct(validPct);
    const calculatedPaise = Math.round((grossTotalPaise * validPct) / 100);
    setOverallDiscountPaise(calculatedPaise);
  };

  const handleOverallDiscountRupeesChange = (rupees: number) => {
    const paise = Math.max(0, rupees * 100);
    setOverallDiscountPaise(paise);
    if (grossTotalPaise > 0) {
      setOverallDiscountPct(Math.round((paise / grossTotalPaise) * 100));
    }
  };

  // Update item-level discount percentage
  const handleItemDiscountPctChange = (variant_id: string, mrp_paise: number, pct: number) => {
    const validPct = Math.max(0, Math.min(99, pct));
    setItemDiscountPct((prev) => ({ ...prev, [variant_id]: validPct }));
    const newPricePaise = Math.round(mrp_paise * (1 - validPct / 100));
    setVariantPrices((prev) => ({ ...prev, [variant_id]: newPricePaise }));
  };

  // Final Net Consolidated Bill
  const billTotalPaise = useMemo(() => {
    return Math.max(0, grossTotalPaise - overallDiscountPaise + deliveryChargePaise);
  }, [grossTotalPaise, overallDiscountPaise, deliveryChargePaise]);

  // F7 Split Preview for individual households
  const customerSplitPreview = useMemo(() => {
    const customerMap: Record<
      string,
      { customer_id: string; name: string; unit_label: string; subtotal_paise: number }
    > = {};

    for (const l of lines) {
      if (!customerMap[l.customer_id]) {
        customerMap[l.customer_id] = {
          customer_id: l.customer_id,
          name: l.customer_name,
          unit_label: l.unit_label,
          subtotal_paise: 0,
        };
      }
      const price = variantPrices[l.variant_id] || l.unit_price_paise;
      customerMap[l.customer_id].subtotal_paise += l.packed_qty * price;
    }

    const customers = Object.values(customerMap);
    const sumGross = customers.reduce((acc, c) => acc + c.subtotal_paise, 0);

    return customers.map((c) => {
      let discountShare = 0;
      if (sumGross > 0) {
        discountShare = Math.round((c.subtotal_paise / sumGross) * overallDiscountPaise);
      }
      const netPayable = Math.max(0, c.subtotal_paise - discountShare);
      return {
        ...c,
        discount_share_paise: discountShare,
        total_paise: netPayable,
      };
    });
  }, [lines, variantPrices, overallDiscountPaise]);

  // Handlers for Order Lifecycle
  const handleAccept = async () => {
    try {
      await fetch("/api/v1/retailer/orders/ord-comm-green-2026-11/accept", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // offline fallback
    }
    updateStatus("accepted");
    setToastMsg("Community order accepted! Stock reserved on shelves.");
    setPackingStep("pack");
  };

  const handleReject = () => {
    setRejectOpen(false);
    updateStatus("submitted");
    setToastMsg("Order rejected. Notification sent to community coordinator.");
  };

  const handleUpdatePackedQty = (variant_id: string, customer_id: string, qty: number) => {
    const updated = lines.map((l) =>
      l.variant_id === variant_id && l.customer_id === customer_id
        ? { ...l, packed_qty: qty }
        : l
    );
    syncLines(updated);
    if (orderStatus === "accepted") updateStatus("packing");
  };

  const handleAllPacked = () => {
    const updated = lines.map((l) => ({ ...l, packed_qty: l.requested_qty }));
    syncLines(updated);
    setToastMsg("All requested staples packed to 100% full quantities.");
  };

  const handleSimulateShortPack = () => {
    const updated = lines.map((l) => {
      if (l.variant_id === "var-sugar-1kg" && l.customer_id === "usr-c1-asha") {
        return { ...l, packed_qty: 0 };
      }
      return l;
    });
    syncLines(updated);
    setToastMsg("Simulated short-pack: Sugar marked unavailable this month.");
  };

  const handleFinaliseConfirm = async () => {
    setIsFinalising(true);
    try {
      // 1. Post draft bill pricing & discount structure to backend
      const draftLines = Object.entries(variantPrices).map(([vid, price]) => ({
        variant_id: vid,
        final_unit_price_paise: price,
        product_discount_paise: 0,
      }));

      await fetch("/api/v1/retailer/orders/ord-comm-green-2026-11/draft-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          lines: draftLines,
          overall_discount_paise: overallDiscountPaise,
          delivery_charge_paise: deliveryChargePaise,
        }),
      });

      // 2. Send bills on backend to create real customer invoices
      await fetch("/api/v1/retailer/orders/ord-comm-green-2026-11/send-bill", {
        method: "POST",
        credentials: "include",
      });

      updateStatus("billed");
      setFinaliseOpen(false);
      setToastMsg(`🎉 Final bills sent to all customers individually totaling ₹${billTotalPaise / 100}!`);
    } catch {
      updateStatus("billed");
      setFinaliseOpen(false);
      setToastMsg(`🎉 Final bills sent to all customers individually totaling ₹${billTotalPaise / 100}!`);
    } finally {
      setIsFinalising(false);
    }
  };

  const handleResetOrder = async () => {
    try {
      await fetch("/api/v1/retailer/orders/ord-comm-green-2026-11/reset", {
        method: "POST",
        credentials: "include",
      });
      updateStatus("packing");
      setLifecycleTab("to_pack");
      setPackingStep("bill");
      setToastMsg("Order reset to unbilled state. Invoices removed so you can test sending again.");
    } catch {
      updateStatus("packing");
      setLifecycleTab("to_pack");
    }
  };

  const handleCompleteOrder = () => {
    updateStatus("completed");
    setToastMsg("Order marked completed! Handover to coordinator ready.");
  };

  const paidCount = Object.values(paidCustomers).filter(Boolean).length;
  const totalReceivedPaise = useMemo(() => {
    return customerSplitPreview.reduce((sum: number, c: any) => {
      return paidCustomers[c.customer_id] ? sum + c.total_paise : sum;
    }, 0);
  }, [customerSplitPreview, paidCustomers]);

  return (
    <RetailerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl text-ink-800">
              Wholesale Community Orders
            </h1>
            <p className="text-xs sm:text-sm text-ink-600">
              Batch order processing, itemised packing, percentage discounts, and final bill delivery.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="quiet"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={handleResetOrder}
              title="Reset order state to unbilled packing for testing"
            >
              Reset to Unbilled State
            </Button>
          </div>
        </div>

        {/* 3 HIGH-LEVEL LIFECYCLE SECTIONS (Req 3) */}
        <div className="flex border-b border-ice-200 gap-6">
          <button
            onClick={() => setLifecycleTab("to_pack")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              lifecycleTab === "to_pack"
                ? "border-teal-700 text-teal-700"
                : "border-transparent text-ink-500 hover:text-ink-800"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>1. Incoming & To Pack</span>
            {orderStatus !== "billed" && orderStatus !== "completed" && (
              <span className="w-2 h-2 rounded-full bg-warning-700" />
            )}
          </button>

          <button
            onClick={() => setLifecycleTab("billed")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              lifecycleTab === "billed"
                ? "border-teal-700 text-teal-700"
                : "border-transparent text-ink-500 hover:text-ink-800"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>2. Billed (Awaiting Payment)</span>
            {orderStatus === "billed" && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-teal-700 text-white font-bold">
                Active
              </span>
            )}
          </button>

          <button
            onClick={() => setLifecycleTab("completed")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              lifecycleTab === "completed"
                ? "border-teal-700 text-teal-700"
                : "border-transparent text-ink-500 hover:text-ink-800"
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>3. Completed Batches</span>
          </button>
        </div>

        {/* SECTION 1: INCOMING & TO PACK */}
        {lifecycleTab === "to_pack" && (
          <div className="space-y-6">
            {orderStatus === "billed" || orderStatus === "completed" ? (
              <Card className="p-6 text-center space-y-3 bg-white">
                <CheckCircle2 className="w-8 h-8 text-teal-700 mx-auto" />
                <h3 className="font-display text-lg text-ink-800">
                  This batch is already finalised and billed!
                </h3>
                <p className="text-xs text-ink-600 max-w-md mx-auto">
                  Order #ORD-GREEN-202611-001 has been calculated and individual invoices were issued to all 4 households.
                </p>
                <Button variant="primary" onClick={() => setLifecycleTab("billed")}>
                  View Billed Order & Payment Status →
                </Button>
              </Card>
            ) : (
              <>
                {/* 3 Packing Workflow Steps */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPackingStep("review")}
                    className={`px-3 py-1.5 rounded-ctl text-xs font-semibold ${
                      packingStep === "review" ? "bg-ink-800 text-white" : "bg-white text-ink-700 border"
                    }`}
                  >
                    Step 1: Review Requested Staples
                  </button>
                  <button
                    onClick={() => setPackingStep("pack")}
                    className={`px-3 py-1.5 rounded-ctl text-xs font-semibold ${
                      packingStep === "pack" ? "bg-ink-800 text-white" : "bg-white text-ink-700 border"
                    }`}
                  >
                    Step 2: Pack Quantities
                  </button>
                  <button
                    onClick={() => setPackingStep("bill")}
                    className={`px-3 py-1.5 rounded-ctl text-xs font-semibold ${
                      packingStep === "bill" ? "bg-ink-800 text-white" : "bg-white text-ink-700 border"
                    }`}
                  >
                    Step 3: Pricing & Percentage Discounts
                  </button>
                </div>

                {/* SUB-STEP 1: REVIEW */}
                {packingStep === "review" && (
                  <Card className="p-6 bg-white space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ice-100 pb-3">
                      <div>
                        <h3 className="font-display text-lg text-ink-800">
                          Green Meadows November Order
                        </h3>
                        <p className="text-xs text-ink-500">
                          4 ordering households · Consolidated wholesale bulk list
                        </p>
                      </div>

                      {orderStatus === "submitted" && (
                        <div className="flex gap-2">
                          <Button variant="quiet" size="sm" onClick={() => setRejectOpen(true)}>
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

                    <div className="divide-y divide-ice-100 text-xs">
                      {variantsSummary.map((v) => (
                        <div key={v.variant_id} className="py-3 flex justify-between items-center">
                          <div>
                            <span className="font-bold text-ink-800 block text-sm">{v.product_name}</span>
                            <span className="text-ink-500">{v.variant_label} · MRP ₹{v.mrp_paise / 100}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-ink-800 text-sm block">{v.total_requested_qty} packs</span>
                            <span className="text-success-700 text-[11px]">{v.stock_qty} available in store</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-ice-100 flex justify-end">
                      <Button
                        variant="primary"
                        onClick={() => {
                          if (orderStatus === "submitted") updateStatus("accepted");
                          setPackingStep("pack");
                        }}
                        icon={<ArrowRight className="w-4 h-4" />}
                      >
                        Proceed to Packing
                      </Button>
                    </div>
                  </Card>
                )}

                {/* SUB-STEP 2: PACK */}
                {packingStep === "pack" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={handleAllPacked}>
                          Pack All (100%)
                        </Button>
                        <Button variant="quiet" size="sm" onClick={handleSimulateShortPack}>
                          Simulate Short-Pack
                        </Button>
                      </div>

                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Receipt className="w-4 h-4" />}
                        onClick={() => setPackingStep("bill")}
                      >
                        Proceed to Pricing & Discounts
                      </Button>
                    </div>

                    <Card padding="none" className="bg-white overflow-hidden divide-y divide-ice-100">
                      <div className="p-3 bg-ice-50 text-xs font-semibold text-ink-600 flex justify-between">
                        <span>Resident Item Line</span>
                        <span>Packed / Requested</span>
                      </div>

                      {lines.map((line) => {
                        const isShort = line.packed_qty < line.requested_qty;
                        const isZero = line.packed_qty === 0;

                        return (
                          <div
                            key={`${line.customer_id}-${line.variant_id}`}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-ice-50/50"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-ink-800">{line.product_name}</span>
                                <span className="text-xs text-ink-500">({line.variant_label})</span>
                                {isZero ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger-100 text-danger-700">
                                    Not available
                                  </span>
                                ) : isShort ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warning-100 text-warning-700">
                                    Short-packed: {line.packed_qty} of {line.requested_qty}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success-100 text-success-700">
                                    Full
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-ink-500">
                                {line.customer_name} · Flat {line.unit_label}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <Stepper
                                value={line.packed_qty}
                                min={0}
                                max={line.requested_qty}
                                onChange={(qty) => handleUpdatePackedQty(line.variant_id, line.customer_id, qty)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </Card>
                  </div>
                )}

                {/* SUB-STEP 3: PRICING & PERCENTAGE DISCOUNTS (Req 1) */}
                {packingStep === "bill" && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                      <Card className="p-5 bg-white space-y-4">
                        <div className="flex items-center justify-between border-b border-ice-100 pb-3">
                          <div>
                            <h3 className="font-display text-lg text-ink-800">
                              Item-Level Percentage Discounts & Pricing
                            </h3>
                            <p className="text-xs text-ink-500">
                              Enter discount in percentage (%) for each staple or adjust selling price
                            </p>
                          </div>
                          <span className="text-xs text-ink-500">Cannot exceed MRP</span>
                        </div>

                        {/* Per-Item Discount Table */}
                        <div className="divide-y divide-ice-100">
                          {variantsSummary.map((v) => {
                            const currentPct = itemDiscountPct[v.variant_id] || 0;
                            const sellingRupees = (variantPrices[v.variant_id] || v.unit_price_paise) / 100;
                            const mrpRupees = v.mrp_paise / 100;

                            return (
                              <div
                                key={v.variant_id}
                                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                              >
                                <div className="space-y-0.5">
                                  <span className="font-bold text-sm text-ink-800 block">
                                    {v.product_name}
                                  </span>
                                  <span className="text-ink-500">
                                    {v.variant_label} · Packed: <strong>{v.total_packed_qty}</strong> packs · MRP: ₹{mrpRupees}
                                  </span>
                                </div>

                                <div className="flex items-center gap-4">
                                  {/* Item Discount in Percentage */}
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-semibold text-ink-700">Disc:</span>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        min="0"
                                        max="50"
                                        value={currentPct}
                                        onChange={(e) =>
                                          handleItemDiscountPctChange(
                                            v.variant_id,
                                            v.mrp_paise,
                                            parseInt(e.target.value) || 0
                                          )
                                        }
                                        className="w-16 h-8 px-2 pr-5 rounded-ctl border border-ice-300 text-xs font-bold text-ink-800 text-right bg-white"
                                      />
                                      <Percent className="w-3 h-3 text-ink-400 absolute right-1.5 top-1/2 -translate-y-1/2" />
                                    </div>
                                  </div>

                                  {/* Unit Price */}
                                  <div className="text-right min-w-[90px]">
                                    <span className="text-xs font-bold text-ink-800 block">
                                      ₹{sellingRupees.toFixed(2)}
                                    </span>
                                    <span className="text-[10px] text-teal-700 font-medium">
                                      Total: ₹{(sellingRupees * v.total_packed_qty).toFixed(0)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Total Bill Discount in Percentage & Rupees (Req 1) */}
                        <div className="pt-4 border-t border-ice-200 space-y-3">
                          <div className="p-4 bg-ice-50 rounded-ctl border border-ice-200 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-bold text-xs text-ink-800 block">
                                  Total Bill Wholesale Discount
                                </span>
                                <span className="text-[11px] text-ink-500">
                                  Volume discount applied to the entire community batch
                                </span>
                              </div>
                              <span className="text-xs font-bold text-teal-700">
                                -₹{(overallDiscountPaise / 100).toFixed(0)}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-ice-100">
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-ink-600 flex items-center gap-1">
                                  <span>Discount in Percentage (%)</span>
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    max="50"
                                    value={overallDiscountPct}
                                    onChange={(e) =>
                                      handleOverallDiscountPctChange(parseFloat(e.target.value) || 0)
                                    }
                                    className="w-full h-9 px-3 pr-6 rounded-ctl border border-ice-300 bg-white font-bold text-xs text-ink-800"
                                  />
                                  <Percent className="w-3.5 h-3.5 text-ink-400 absolute right-2 top-1/2 -translate-y-1/2" />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-ink-600">
                                  Discount Amount in Rupees (₹)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={overallDiscountPaise / 100}
                                  onChange={(e) =>
                                    handleOverallDiscountRupeesChange(parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full h-9 px-3 rounded-ctl border border-ice-300 bg-white font-bold text-xs text-ink-800"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Final Amount */}
                          <div className="flex justify-between items-baseline pt-2">
                            <div>
                              <span className="text-xs font-bold text-ink-800 block">
                                Net Consolidated Bill
                              </span>
                              <span className="text-[11px] text-ink-500">
                                Exact sum split across the 4 households
                              </span>
                            </div>
                            <div className="font-display text-3xl text-ink-800">
                              <MoneyText paise={billTotalPaise} size="xl" />
                            </div>
                          </div>
                        </div>
                      </Card>

                      <div className="flex justify-between items-center">
                        <Button variant="secondary" onClick={() => setPackingStep("pack")}>
                          ← Back to Packing
                        </Button>
                        <Button
                          variant="primary"
                          icon={<Send className="w-4 h-4" />}
                          onClick={() => setFinaliseOpen(true)}
                        >
                          Send Bill to Customers (₹{billTotalPaise / 100})
                        </Button>
                      </div>
                    </div>

                    {/* F7 Split Preview */}
                    <Card className="p-5 bg-ice-100 border-ice-300 space-y-3 h-fit">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-teal-700" />
                        <h4 className="font-bold text-xs text-ink-800 uppercase tracking-wider">
                          Fair Bill Split Invoices
                        </h4>
                      </div>

                      <div className="space-y-2">
                        {customerSplitPreview.map((c) => (
                          <div key={c.customer_id} className="p-3 bg-white rounded-ctl border border-ice-200 text-xs">
                            <div className="flex justify-between font-bold text-ink-800">
                              <span>{c.name} ({c.unit_label})</span>
                              <span>₹{(c.total_paise / 100).toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between text-[11px] text-ink-500 mt-0.5">
                              <span>Items: ₹{(c.subtotal_paise / 100).toFixed(0)}</span>
                              <span className="text-teal-700">Disc: -₹{(c.discount_share_paise / 100).toFixed(0)}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-ice-200 flex justify-between font-bold text-xs text-ink-800">
                        <span>Total of Invoices:</span>
                        <span>₹{(billTotalPaise / 100).toFixed(0)}</span>
                      </div>
                    </Card>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* SECTION 2: BILLED (AWAITING PAYMENT) (Req 3 & Req 4) */}
        {lifecycleTab === "billed" && (
          <div className="space-y-6">
            <Card className="p-6 bg-white space-y-5 border-ice-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ice-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-xl text-ink-800">
                      Billed Batch #ORD-GREEN-202611-001
                    </h3>
                    <StatusPill kind="info" label="Invoices Issued · Awaiting Resident Payments" />
                  </div>
                  <p className="text-xs text-ink-500 mt-0.5">
                    Consolidated amount: <strong>₹2,250</strong> · Split across 4 households
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<PackageCheck className="w-4 h-4" />}
                    onClick={handleCompleteOrder}
                  >
                    Mark Batch Ready for Delivery
                  </Button>
                </div>
              </div>

              {/* Live Payment Collection Tracker */}
              <div className="space-y-2 p-4 bg-ice-50 rounded-ctl border border-ice-200">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-ink-800">Payment Collection Progress</span>
                  <span className="text-teal-700">₹1,890 of ₹2,250 received (84%)</span>
                </div>
                <ProgressBar value={84} />
                <div className="flex justify-between text-[11px] text-ink-500 pt-1">
                  <span>3 of 4 neighbours paid (Asha, Bharat, Dev)</span>
                  <span className="text-warning-700 font-semibold">1 flat pending (Chitra · ₹270)</span>
                </div>
              </div>

              {/* REQ 4: PACK ALL AT ONCE VS PACK INDIVIDUALLY */}
              <div className="pt-2 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-display text-base text-ink-800">
                      Store Packaging & Handover Mode
                    </h4>
                    <p className="text-xs text-ink-500">
                      Choose how your store staff prepares this order for building delivery
                    </p>
                  </div>

                  <div className="flex p-1 bg-ice-100 rounded-ctl border border-ice-200">
                    <button
                      onClick={() => setPackingMode("bulk")}
                      className={`px-3 py-1.5 rounded-ctl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        packingMode === "bulk"
                          ? "bg-white text-ink-800 shadow-2xs font-bold"
                          : "text-ink-600 hover:text-ink-800"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Pack All at Once (Warehouse Total)</span>
                    </button>

                    <button
                      onClick={() => setPackingMode("individual")}
                      className={`px-3 py-1.5 rounded-ctl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        packingMode === "individual"
                          ? "bg-white text-ink-800 shadow-2xs font-bold"
                          : "text-ink-600 hover:text-ink-800"
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Pack Individually (Per-Flat Bagging)</span>
                    </button>
                  </div>
                </div>

                {/* MODE A: PACK ALL AT ONCE (Consolidated Warehouse Sheet) */}
                {packingMode === "bulk" ? (
                  <Card padding="none" className="bg-white overflow-hidden divide-y divide-ice-100 border border-ice-200">
                    <div className="p-3 bg-ice-100 text-xs font-bold text-ink-700 grid grid-cols-12 gap-2">
                      <div className="col-span-1 text-center">Done</div>
                      <div className="col-span-6">Total Wholesale Bulk Items to Pull from Shelves</div>
                      <div className="col-span-3 text-center">Consolidated Pack Count</div>
                      <div className="col-span-2 text-right">Wholesale Value</div>
                    </div>

                    {variantsSummary.map((v) => {
                      const isChecked = !!checkedBulkItems[v.variant_id];
                      return (
                        <div
                          key={v.variant_id}
                          className="p-3.5 text-xs grid grid-cols-12 gap-2 items-center hover:bg-ice-50/50"
                        >
                          <div className="col-span-1 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) =>
                                setCheckedBulkItems((prev) => ({
                                  ...prev,
                                  [v.variant_id]: e.target.checked,
                                }))
                              }
                              className="w-4 h-4 rounded text-teal-700"
                            />
                          </div>

                          <div className="col-span-6">
                            <span className={`font-bold block ${isChecked ? "line-through text-ink-400" : "text-ink-800"}`}>
                              {v.product_name}
                            </span>
                            <span className="text-[11px] text-ink-500">{v.variant_label}</span>
                          </div>

                          <div className="col-span-3 text-center">
                            <span className="font-display text-sm font-bold text-teal-700 px-2 py-0.5 bg-ice-100 rounded-ctl">
                              {v.total_packed_qty} sacks / packs
                            </span>
                          </div>

                          <div className="col-span-2 text-right font-bold text-ink-800 tabular-nums">
                            ₹{((variantPrices[v.variant_id] || v.unit_price_paise) * v.total_packed_qty) / 100}
                          </div>
                        </div>
                      );
                    })}
                  </Card>
                ) : (
                  /* MODE B: PACK INDIVIDUALLY (Resident Bagging Checklist) */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {customerSplitPreview.map((c) => {
                      const cLines = lines.filter((l) => l.customer_id === c.customer_id);
                      const isBagPacked = !!checkedResidentBags[c.customer_id];

                      return (
                        <Card
                          key={c.customer_id}
                          className={`p-4 space-y-3 transition-colors ${
                            isBagPacked ? "bg-success-100/40 border-success-700/30" : "bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between border-b border-ice-100 pb-2">
                            <div>
                              <div className="font-bold text-sm text-ink-800">{c.name}</div>
                              <span className="text-xs text-ink-500">Flat {c.unit_label}</span>
                            </div>

                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isBagPacked}
                                onChange={(e) =>
                                  setCheckedResidentBags((prev) => ({
                                    ...prev,
                                    [c.customer_id]: e.target.checked,
                                  }))
                                }
                                className="w-4 h-4 rounded text-teal-700"
                              />
                              <span className="text-xs font-bold text-teal-700">Bag Ready</span>
                            </label>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            {cLines.map((l) => (
                              <div key={l.variant_id} className="flex justify-between items-center text-ink-700">
                                <span>{l.product_name} ({l.variant_label})</span>
                                <span className="font-bold tabular-nums">× {l.packed_qty}</span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-ice-100 flex justify-between text-xs font-bold text-ink-800">
                            <span>Invoice Total</span>
                            <span>₹{(c.total_paise / 100).toFixed(0)}</span>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* SECTION 3: COMPLETED ORDERS (Req 3) */}
        {lifecycleTab === "completed" && (
          <Card className="p-6 bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-ice-100 pb-3">
              <div>
                <h3 className="font-display text-lg text-ink-800">
                  Completed Wholesale Batches
                </h3>
                <p className="text-xs text-ink-500">
                  Orders where packing was fulfilled and all customer payments were reconciled.
                </p>
              </div>

              <StatusPill kind="success" label="Fully Paid & Dispatched" />
            </div>

            <div className="p-4 bg-ice-50 rounded-ctl border border-ice-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-sm text-ink-800 block">
                  Green Meadows Apartments · Nov 2026
                </span>
                <span className="text-xs text-ink-500">
                  Delivered by Coordinator Meera · 4 flats served · Total ₹2,250
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Link href="/retailer/payments">
                  <Button variant="secondary" size="sm">
                    View Settlement Sheet
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* Finalise & Send Bill Confirmation Dialog */}
        <Dialog
          isOpen={finaliseOpen}
          onClose={() => setFinaliseOpen(false)}
          title="Send Final Individual Bills to Customers?"
          description={`This locks order calculations and automatically sends individual fair-share bills totaling ₹${billTotalPaise / 100} with ${overallDiscountPct}% wholesale volume discount (₹${overallDiscountPaise / 100}) directly to all 4 households (Asha Rao, Bharat Patel, Chitra Nair, Dev Sharma). Each customer will receive their exact invoice and payment options. Once sent, amounts cannot be modified.`}
          confirmLabel="Send Bills to Customers"
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
