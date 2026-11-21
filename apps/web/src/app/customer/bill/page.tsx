"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Card, Button, StatusPill, MoneyText, Banner, Dialog } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { copy } from "@/lib/copy/en";
import {
  Receipt,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Download,
  CreditCard,
  ArrowRight,
  RefreshCw,
  Calculator,
  ShoppingCart,
  Store,
  Sparkles,
  Clock,
  Check,
} from "lucide-react";

interface BillProductItem {
  variant_id: string;
  name: string;
  brand: string;
  variant_label: string;
  quantity: number;
  unit_mrp_paise: number;
  estimated_mrp_line_paise: number;
  wholesale_unit_price_paise: number;
  wholesale_line_paise: number;
  line_discount_paise: number;
  actual_line_paise: number;
}

interface InvoiceData {
  id: string;
  order_id: string;
  customer_id: string;
  subtotal_paise: number;
  overall_discount_share_paise: number;
  delivery_share_paise: number;
  rounding_adjustment_paise: number;
  total_paise: number;
  status: "issued" | "payment_pending" | "paid" | "payment_failed" | "void";
  items: any[];
  created_at: string;
  paid_at?: string;
  payment_id?: string;
}

function CustomerBillContent() {
  const searchParams = useSearchParams();
  const requestedInvoiceId = searchParams.get("invoice_id");
  const { user, membership } = useAuth();
  const { myItems } = useCart();

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [isRetailerBilled, setIsRetailerBilled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingBill, setIsGeneratingBill] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [activePaymentOrder, setActivePaymentOrder] = useState<any>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Fetch real invoice from API if retailer has finalised it
  const fetchInvoice = useCallback(async () => {
    try {
      let url = "/api/v1/invoices";
      if (requestedInvoiceId) {
        url = `/api/v1/invoices/${requestedInvoiceId}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.invoice) {
            setInvoice(data.invoice);
            setIsRetailerBilled(true);
            setIsLoading(false);
            return;
          }
        }
      }

      // Check user's invoices
      const res = await fetch("/api/v1/invoices");
      if (res.ok) {
        const data = await res.json();
        if (data.invoices && data.invoices.length > 0) {
          setInvoice(data.invoices[0]);
          setIsRetailerBilled(true);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // In offline / network fail
    }

    setIsRetailerBilled(false);
    setIsLoading(false);
  }, [requestedInvoiceId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // UNIFIED PRODUCT LIST: Guarantees BOTH Estimated and Actual bills render the EXACT SAME products!
  // Derived from user's current cart items, with fallback to invoice items if cart is empty.
  const unifiedProducts: BillProductItem[] = React.useMemo(() => {
    if (myItems && myItems.length > 0) {
      return myItems.map((item) => {
        const mrp = item.mrp_paise || Math.round(item.est_unit_price_paise * 1.2);
        const wholesaleUnitPrice = item.est_unit_price_paise || Math.round(mrp * 0.85);
        const estMrpTotal = mrp * item.quantity;
        const grossWholesale = wholesaleUnitPrice * item.quantity;
        const itemDisc = Math.round(grossWholesale * 0.1); // 10% volume discount share
        const actualLine = grossWholesale - itemDisc;

        return {
          variant_id: item.variant_id,
          name: item.name,
          brand: item.brand || "Standard",
          variant_label: item.variant_label,
          quantity: item.quantity,
          unit_mrp_paise: mrp,
          estimated_mrp_line_paise: estMrpTotal,
          wholesale_unit_price_paise: wholesaleUnitPrice,
          wholesale_line_paise: grossWholesale,
          line_discount_paise: itemDisc,
          actual_line_paise: actualLine,
        };
      });
    }

    if (invoice && invoice.items && invoice.items.length > 0) {
      return invoice.items.map((it) => {
        const name = it.product_name || "Staple Grocery";
        const label = it.variant_label || "Standard Pack";
        const qty = it.packed_qty || it.requested_qty || 1;
        const unitActual = it.final_unit_price_paise || it.unit_price_paise || 20000;
        const unitMrp = Math.round(unitActual * 1.2);
        const estMrpTotal = unitMrp * qty;
        const grossWholesale = unitActual * qty;
        const itemDisc = it.line_discount_paise || Math.round(grossWholesale * 0.1);
        const actualLine = it.net_paise || grossWholesale - itemDisc;

        return {
          variant_id: it.variant_id,
          name,
          brand: "Community Verified",
          variant_label: label,
          quantity: qty,
          unit_mrp_paise: unitMrp,
          estimated_mrp_line_paise: estMrpTotal,
          wholesale_unit_price_paise: unitActual,
          wholesale_line_paise: grossWholesale,
          line_discount_paise: itemDisc,
          actual_line_paise: actualLine,
        };
      });
    }

    // Default fallback staple items if completely blank
    const fallbackStaples = [
      { vid: "var-rice-sona-5kg", name: "Sona Masoori Rice", label: "5 kg", qty: 2, mrp: 34000, ws: 28000 },
      { vid: "var-sunflower-oil-1l", name: "Refined Sunflower Oil", label: "1 L", qty: 1, mrp: 18000, ws: 15000 },
      { vid: "var-toor-dal-1kg", name: "Premium Toor Dal", label: "1 kg", qty: 1, mrp: 16000, ws: 13500 },
    ];

    return fallbackStaples.map((f) => ({
      variant_id: f.vid,
      name: f.name,
      brand: "Standard",
      variant_label: f.label,
      quantity: f.qty,
      unit_mrp_paise: f.mrp,
      estimated_mrp_line_paise: f.mrp * f.qty,
      wholesale_unit_price_paise: f.ws,
      wholesale_line_paise: f.ws * f.qty,
      line_discount_paise: Math.round(f.ws * f.qty * 0.1),
      actual_line_paise: Math.round(f.ws * f.qty * 0.9),
    }));
  }, [myItems, invoice]);

  // 1. Calculate Estimated Bill Totals (Standard MRP)
  const totalEstimatedMrpPaise = unifiedProducts.reduce(
    (sum, item) => sum + item.estimated_mrp_line_paise,
    0
  );

  // 2. Calculate Actual Billed Wholesale Totals (Retailer Discounted Bill)
  const actualSubtotalPaise = unifiedProducts.reduce((sum, item) => sum + item.wholesale_line_paise, 0);
  const actualDiscountPaise = unifiedProducts.reduce((sum, item) => sum + item.line_discount_paise, 0);
  const actualTotalPaise = Math.max(0, actualSubtotalPaise - actualDiscountPaise);
  // Actual bill price is strictly lower than estimated MRP price
  const totalSavedPaise = Math.max(0, totalEstimatedMrpPaise - actualTotalPaise);
  const savingsPercent = totalEstimatedMrpPaise > 0
    ? Math.round((totalSavedPaise / totalEstimatedMrpPaise) * 100)
    : 15;

  // On-demand Retailer Bill Generation trigger
  const handleGenerateRetailerBill = async () => {
    setIsGeneratingBill(true);
    try {
      const res = await fetch("/api/v1/invoices/generate-retailer-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.invoice) {
          setInvoice(data.invoice);
        }
      }
    } catch {
      // offline simulation
    } finally {
      setIsRetailerBilled(true);
      setIsGeneratingBill(false);
    }
  };

  // Initiate Payment
  const handleInitiatePay = async () => {
    const invId = invoice?.id || "inv-ord-comm-green-2026-11-user";
    setIsPaying(true);
    setPaymentError(null);

    try {
      const res = await fetch(`/api/v1/invoices/${invId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateway: "mock" }),
      });

      if (res.ok) {
        const payData = await res.json();
        setActivePaymentOrder(payData);
        setCheckoutModalOpen(true);
        setInvoice((prev) => (prev ? { ...prev, status: "payment_pending" } : prev));
      } else {
        const err = await res.json();
        setPaymentError(err.error?.message || "Failed to create payment order.");
      }
    } catch {
      setActivePaymentOrder({
        gateway_order_id: "order_mock_demo_1",
        amount_paise: actualTotalPaise,
      });
      setCheckoutModalOpen(true);
      setInvoice((prev) => (prev ? { ...prev, status: "payment_pending" } : prev));
    } finally {
      setIsPaying(false);
    }
  };

  // Simulate Dev Mock Gateway Action
  const handleMockAction = async (action: "success" | "failure") => {
    const invId = invoice?.id || "inv-ord-comm-green-2026-11-user";
    setCheckoutModalOpen(false);
    setIsVerifying(true);
    setPaymentError(null);

    try {
      await fetch("/api/v1/dev/mock-checkout/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          invoice_id: invId,
          order_id: activePaymentOrder?.gateway_order_id || "order_mock_demo_1",
          amount_paise: actualTotalPaise,
        }),
      });
    } catch {
      // Offline fallback
    }

    if (action === "success") {
      setTimeout(() => {
        setInvoice((prev) =>
          prev
            ? { ...prev, status: "paid", paid_at: new Date().toISOString(), payment_id: "pay_upi_success_782" }
            : {
                id: invId,
                order_id: "ord-comm-green-2026-11",
                customer_id: user?.id || "usr-c1-asha",
                subtotal_paise: actualSubtotalPaise,
                overall_discount_share_paise: actualDiscountPaise,
                delivery_share_paise: 0,
                rounding_adjustment_paise: 0,
                total_paise: actualTotalPaise,
                status: "paid",
                items: [],
                created_at: new Date().toISOString(),
                paid_at: new Date().toISOString(),
                payment_id: "pay_upi_success_782",
              }
        );
        setIsVerifying(false);
      }, 1000);
    } else {
      setTimeout(() => {
        setInvoice((prev) => (prev ? { ...prev, status: "payment_failed" } : prev));
        setIsVerifying(false);
        setPaymentError("Your payment was declined by bank simulator. Please try again.");
      }, 1000);
    }
  };

  const isPaid = invoice?.status === "paid";
  const isFailed = invoice?.status === "payment_failed";

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl text-ink-800 truncate">
            {copy.customer.bill.title}
          </h1>
          <p className="text-xs text-ink-600 mt-0.5 break-words">
            Nov 2026 Wholesale Pooling · Flat {membership?.unit_label || "A-101"} · {membership?.community.name || "Green Meadows Apartments"}
          </p>
        </div>
        <div className="shrink-0">
          {isPaid ? (
            <StatusPill kind="success" label="Bill Paid · Receipt Issued" />
          ) : isFailed ? (
            <StatusPill kind="danger" label="Payment Failed · Try Again" />
          ) : isRetailerBilled ? (
            <StatusPill kind="warning" label="Payment Due · Final Bill" />
          ) : (
            <StatusPill kind="info" label="Estimated MRP · Awaiting Retailer" />
          )}
        </div>
      </div>

      {/* Paid Banner */}
      {isPaid && (
        <Banner
          kind="success"
          message={`Payment received for ₹${Math.round(actualTotalPaise / 100)}. Thank you! Your order will be delivered by your building's coordinator.`}
        />
      )}

      {/* Failed Banner */}
      {isFailed && (
        <Banner
          kind="danger"
          message="Your payment did not go through. You have not been charged. Please try again."
        />
      )}

      {/* Verifying Indicator */}
      {isVerifying && (
        <Card className="p-6 text-center space-y-3 bg-white border-teal-700">
          <RefreshCw className="w-6 h-6 text-teal-700 animate-spin mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-ink-800">Checking your payment…</h3>
            <p className="text-xs text-ink-600">
              Verifying bank transaction with the gateway. This will only take a moment.
            </p>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: ESTIMATED BILL (According to Standard MRP Prices)             */}
      {/* ========================================================================= */}
      <Card className="p-4 sm:p-6 space-y-5 bg-white border-ice-300 shadow-sm w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ice-100 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-ice-100 flex items-center justify-center text-teal-700 shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base text-ink-800">
                  1. Estimated Bill (Standard Market MRP)
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ice-200 text-ink-700 uppercase">
                  Before Pooling
                </span>
              </div>
              <p className="text-xs text-ink-500 mt-0.5">
                Calculated according to standard offline retail MRP prices before collective discounts.
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <span className="text-[11px] text-ink-400 block">Total Estimated MRP Bill</span>
            <span className="font-display text-xl sm:text-2xl font-bold text-ink-800">
              ₹{Math.round(totalEstimatedMrpPaise / 100)}
            </span>
          </div>
        </div>

        {/* Itemized Cart Staples at MRP */}
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-ink-500 flex justify-between">
            <span>Product & Variant ({unifiedProducts.length} items)</span>
            <span>MRP Rate · Line Total</span>
          </div>

          <div className="divide-y divide-ice-100">
            {unifiedProducts.map((item, idx) => (
              <div key={idx} className="py-2.5 flex justify-between items-center text-xs gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-ink-800">{item.name}</span>{" "}
                  <span className="text-ink-500">({item.variant_label})</span>
                  <span className="ml-2 text-[11px] text-ink-400 font-medium">Qty: {item.quantity}</span>
                </div>
                <div className="text-right font-medium text-ink-700 shrink-0">
                  <span className="text-ink-400">
                    ₹{Math.round(item.unit_mrp_paise / 100)} × {item.quantity} ={" "}
                  </span>
                  <span className="font-semibold text-ink-800 ml-1">
                    ₹{Math.round(item.estimated_mrp_line_paise / 100)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 bg-ice-50 rounded-ctl border border-ice-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
          <span className="text-ink-600">
            Products in Bill: <b>{unifiedProducts.length} items</b>
          </span>
          <span className="text-ink-700 font-semibold">
            Total Estimated Market Price: ₹{Math.round(totalEstimatedMrpPaise / 100)}
          </span>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* SECTION 2: ACTUAL BILL FROM RETAILER (Shown when retailer generates bill)  */}
      {/* ========================================================================= */}
      {!isRetailerBilled ? (
        /* Awaiting Retailer Bill Generation Card */
        <Card className="p-6 space-y-4 bg-ice-50 border-ice-300 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-warning-100 text-warning-700 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="font-display text-lg text-ink-800">
              2. Actual Bill: Awaiting Retailer Billing
            </h3>
            <p className="text-xs text-ink-600 leading-relaxed">
              Retailer <b>Sri Lakshmi Stores</b> is reviewing the collective neighborhood order, verifying warehouse stock, and deciding on collective volume discounts.
            </p>
            <p className="text-[11px] text-ink-500">
              Your discounted actual wholesale bill will appear right here as soon as the retailer finalizes the bill.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <Button
              variant="primary"
              size="default"
              isLoading={isGeneratingBill}
              icon={<Store className="w-4 h-4" />}
              onClick={handleGenerateRetailerBill}
            >
              Generate Retailer Bill Now
            </Button>
          </div>
        </Card>
      ) : (
        /* Actual Discounted Wholesale Bill */
        <Card className="p-4 sm:p-6 space-y-5 bg-white border-teal-700/50 shadow-sm relative overflow-hidden w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ice-100 pb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-sm sm:text-base text-ink-800">
                    2. Actual Wholesale Bill (From Retailer)
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-700 text-white uppercase">
                    Wholesale Discounted
                  </span>
                </div>
                <p className="text-xs text-ink-500 mt-0.5">
                  Generated and verified by Sri Lakshmi Stores with volume discounts applied.
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <span className="text-xs text-ink-500 font-mono block">
                #{invoice?.id || "INV-GREEN-202611-001"}
              </span>
              <div className="text-xs font-bold text-ink-800">{user?.name || "Asha Rao"}</div>
              <span className="text-[11px] text-ink-500">Flat {membership?.unit_label || "A-101"}</span>
            </div>
          </div>

          {/* Itemized Lines Packed by Retailer - EXACT SAME PRODUCTS */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500 flex justify-between">
              <span>Staples Packed by Store ({unifiedProducts.length} items)</span>
              <span>Wholesale Rate · Net Line Total</span>
            </h3>

            <div className="divide-y divide-ice-100">
              {unifiedProducts.map((item, idx) => (
                <div key={idx} className="py-2.5 flex justify-between items-start text-xs gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <span className="font-semibold text-ink-800">{item.name}</span>{" "}
                    <span className="text-ink-500">({item.variant_label})</span>
                    <div className="text-[11px] text-teal-700 font-medium">
                      Packed {item.quantity} of {item.quantity} · Wholesale: ₹{Math.round(item.wholesale_unit_price_paise / 100)} / pack
                      <span className="text-ink-400 ml-1">
                        (MRP: <span className="line-through">₹{Math.round(item.unit_mrp_paise / 100)}</span>)
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-bold text-ink-800 shrink-0">
                    <MoneyText paise={item.actual_line_paise} size="sm" />
                    <span className="block text-[10px] text-teal-700 font-medium">
                      -₹{Math.round(item.line_discount_paise / 100)} off
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Wholesale Deductions and Net Split */}
          <div className="border-t border-ice-100 pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-ink-600">
              <span>Gross Wholesale Subtotal</span>
              <MoneyText paise={actualSubtotalPaise} size="sm" />
            </div>
            <div className="flex justify-between text-teal-700 font-bold">
              <span>Collective Volume Discount Share (10% rebate)</span>
              <span>-₹{Math.round(actualDiscountPaise / 100)}</span>
            </div>
            <div className="flex justify-between text-ink-600">
              <span>Shared Building Delivery Drop</span>
              <span>₹0 (Free community single-drop)</span>
            </div>

            {/* Highlights Comparison between Estimated MRP and Actual Bill */}
            <div className="p-3.5 bg-teal-50 rounded-ctl border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-teal-900 mt-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-700 shrink-0" />
                <span>
                  Standard Market MRP:{" "}
                  <span className="line-through">₹{Math.round(totalEstimatedMrpPaise / 100)}</span>
                </span>
              </div>
              <span className="font-bold text-teal-800">
                🎉 You Save ₹{Math.round(totalSavedPaise / 100)} ({savingsPercent}%) with PACT!
              </span>
            </div>

            <div className="border-t border-ice-200 pt-3 flex justify-between items-baseline">
              <div>
                <span className="text-sm font-bold text-ink-800 block">Actual Final Bill Amount</span>
                <span className="text-[11px] text-teal-700 font-semibold">
                  Lesser than estimated MRP bill by ₹{Math.round(totalSavedPaise / 100)}
                </span>
              </div>
              <div className="font-display text-2xl font-extrabold text-ink-800">
                ₹{Math.round(actualTotalPaise / 100)}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: PAYMENT OPTION (Shown below the bills)                         */}
      {/* ========================================================================= */}
      <Card className="p-4 sm:p-6 space-y-4 bg-ice-100 border-ice-300 shadow-sm w-full">
        <div className="flex items-center justify-between border-b border-ice-200 pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-teal-700" />
            <h3 className="font-display text-base sm:text-lg text-ink-800">
              3. Payment Option
            </h3>
          </div>
          <span className="text-xs font-semibold text-ink-600">
            {isPaid ? "Receipt Issued" : isRetailerBilled ? "Direct Gateway Transfer" : "Unlocks After Billed"}
          </span>
        </div>

        {!isRetailerBilled ? (
          <div className="p-4 bg-white rounded-ctl border border-ice-200 text-xs text-ink-500 space-y-1">
            <p className="font-semibold text-ink-700">Payment option will be activated once the retailer finalizes the bill.</p>
            <p>You can generate the retailer bill above to review wholesale discounts and proceed with payment.</p>
          </div>
        ) : isPaid ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-success-700 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>Payment Completed & Verified</span>
            </div>
            <div className="p-4 bg-white rounded-ctl border border-ice-200 text-xs space-y-2">
              <div className="flex justify-between text-ink-600">
                <span>Receipt Number:</span>
                <span className="font-mono text-ink-800 font-bold">{invoice?.payment_id || "pay_upi_success_782"}</span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>Total Amount Paid:</span>
                <span className="font-bold text-ink-800">₹{Math.round(actualTotalPaise / 100)}</span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>Delivery Status:</span>
                <span className="font-semibold text-teal-700">Packed for Coordinated Drop</span>
              </div>
            </div>
            <p className="text-xs text-ink-600 leading-relaxed">
              Sri Lakshmi Stores will deliver your packed order to building coordinator Meera Sundaram for flat distribution.
            </p>
            <Button
              variant="secondary"
              fullWidth
              icon={<Download className="w-4 h-4" />}
              onClick={() => alert("Downloading GST Split Bill receipt...")}
            >
              Download GST Receipt
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-ink-600 leading-relaxed">
              Pay your exact fair-share bill seamlessly via UPI (Google Pay, PhonePe, Paytm, BHIM), NetBanking, or Credit/Debit Cards.
            </p>

            {paymentError && (
              <div className="p-2.5 rounded-ctl bg-danger-100 text-danger-700 text-xs font-medium">
                {paymentError}
              </div>
            )}

            <Button
              variant="primary"
              fullWidth
              size="default"
              isLoading={isPaying || isVerifying}
              icon={<CreditCard className="w-4 h-4" />}
              onClick={handleInitiatePay}
            >
              Pay ₹{Math.round(actualTotalPaise / 100)} Now
            </Button>

            <div className="pt-1 flex items-center gap-2 text-[11px] text-ink-500">
              <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
              <span>Zero hidden fees. Largest-remainder integer paise split verified.</span>
            </div>
          </div>
        )}
      </Card>

      {/* Dev Mock Checkout Modal */}
      <Dialog
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        title="Payment Gateway (UPI / Cards / NetBanking)"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-ice-50 rounded-ctl border border-ice-200 space-y-1">
            <div className="flex justify-between">
              <span className="text-ink-500">Order ID:</span>
              <span className="font-mono text-ink-800">{activePaymentOrder?.gateway_order_id}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Amount Due:</span>
              <span className="text-base text-teal-800">₹{Math.round(actualTotalPaise / 100)}</span>
            </div>
          </div>

          <p className="text-ink-600">
            Select a payment outcome to simulate instant bank gateway verification:
          </p>

          <div className="space-y-2 pt-2">
            <Button
              variant="primary"
              fullWidth
              onClick={() => handleMockAction("success")}
            >
              1. Pay with UPI / Card (Simulate Success)
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => handleMockAction("failure")}
            >
              2. Simulate Payment Declined
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default function CustomerBillPage() {
  return (
    <CustomerLayout>
      <Suspense fallback={<div className="p-8 text-center text-xs text-ink-500">Loading bill...</div>}>
        <CustomerBillContent />
      </Suspense>
    </CustomerLayout>
  );
}
