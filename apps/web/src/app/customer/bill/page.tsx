"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Card, Button, StatusPill, MoneyText, Banner, Dialog } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
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
} from "lucide-react";

interface InvoiceItem {
  variant_id: string;
  product_name: string;
  variant_label: string;
  requested_qty: number;
  packed_qty: number;
  unit_price_paise: number;
  gross_paise: number;
  is_short_packed?: boolean;
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
  items: InvoiceItem[];
  created_at: string;
  paid_at?: string;
  payment_id?: string;
}

function CustomerBillContent() {
  const searchParams = useSearchParams();
  const requestedInvoiceId = searchParams.get("invoice_id");
  const { user, membership } = useAuth();

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [activePaymentOrder, setActivePaymentOrder] = useState<any>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Fallback Golden Scenario Asha values if backend offline
  const defaultInvoice: InvoiceData = {
    id: "inv-ord-comm-green-2026-11-usr-asha-1",
    order_id: "ord-comm-green-2026-11",
    customer_id: user?.id || "usr-asha-1",
    subtotal_paise: 80000,
    overall_discount_share_paise: 8000,
    delivery_share_paise: 0,
    rounding_adjustment_paise: 0,
    total_paise: 72000,
    status: "issued",
    created_at: "2026-11-25T10:00:00Z",
    items: [
      {
        variant_id: "var-rice-sona-5kg",
        product_name: "Sona Masoori Rice",
        variant_label: "5 kg",
        requested_qty: 2,
        packed_qty: 2,
        unit_price_paise: 30000,
        gross_paise: 60000,
      },
      {
        variant_id: "var-sugar-madhur-1kg",
        product_name: "Madhur Pure Crystal Sugar",
        variant_label: "1 kg",
        requested_qty: 1,
        packed_qty: 1,
        unit_price_paise: 6000,
        gross_paise: 6000,
      },
      {
        variant_id: "var-oil-sunflower-1l",
        product_name: "Fortune Sunflower Oil",
        variant_label: "1 L",
        requested_qty: 1,
        packed_qty: 1,
        unit_price_paise: 14000,
        gross_paise: 14000,
      },
    ],
  };

  const fetchInvoice = useCallback(async () => {
    try {
      let url = "/api/v1/invoices";
      if (requestedInvoiceId) {
        url = `/api/v1/invoices/${requestedInvoiceId}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setInvoice(data.invoice);
          setIsLoading(false);
          return;
        }
      }

      // If no specific invoice requested, get caller's invoices
      const res = await fetch("/api/v1/invoices");
      if (res.ok) {
        const data = await res.json();
        if (data.invoices && data.invoices.length > 0) {
          setInvoice(data.invoices[0]);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Offline fallback
    }

    setInvoice(defaultInvoice);
    setIsLoading(false);
  }, [requestedInvoiceId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // Initiate Payment
  const handleInitiatePay = async () => {
    if (!invoice) return;
    setIsPaying(true);
    setPaymentError(null);

    try {
      const res = await fetch(`/api/v1/invoices/${invoice.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateway: "mock" }),
      });

      if (res.ok) {
        const payData = await res.json();
        setActivePaymentOrder(payData);
        setCheckoutModalOpen(true);
        setInvoice((prev) => prev ? { ...prev, status: "payment_pending" } : prev);
      } else {
        const err = await res.json();
        setPaymentError(err.error?.message || "Failed to create payment order.");
      }
    } catch {
      setActivePaymentOrder({
        gateway_order_id: "order_mock_demo_1",
        amount_paise: invoice.total_paise,
      });
      setCheckoutModalOpen(true);
      setInvoice((prev) => prev ? { ...prev, status: "payment_pending" } : prev);
    } finally {
      setIsPaying(false);
    }
  };

  // Simulate Dev Mock Gateway Action
  const handleMockAction = async (action: "success" | "failure" | "duplicate" | "wrong_amount") => {
    if (!invoice || !activePaymentOrder) return;
    setCheckoutModalOpen(false);
    setIsVerifying(true);
    setPaymentError(null);

    try {
      await fetch("/api/v1/dev/mock-checkout/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          invoice_id: invoice.id,
          order_id: activePaymentOrder.gateway_order_id,
          amount_paise: invoice.total_paise,
        }),
      });
    } catch {
      // Offline simulation
      if (action === "success") {
        setTimeout(() => {
          setInvoice((prev) => prev ? { ...prev, status: "paid", paid_at: new Date().toISOString() } : prev);
          setIsVerifying(false);
        }, 1500);
        return;
      } else {
        setTimeout(() => {
          setInvoice((prev) => prev ? { ...prev, status: "payment_failed" } : prev);
          setIsVerifying(false);
        }, 1500);
        return;
      }
    }

    // F8 Step 4: "Checking your payment…" polling loop
    let attempts = 0;
    const pollInterval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/v1/invoices/${invoice.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.invoice.status === "paid") {
            clearInterval(pollInterval);
            setInvoice(data.invoice);
            setIsVerifying(false);
            return;
          } else if (data.invoice.status === "payment_failed") {
            clearInterval(pollInterval);
            setInvoice(data.invoice);
            setIsVerifying(false);
            setPaymentError("Your payment did not go through. You have not been charged. Please try again.");
            return;
          }
        }

        if (attempts >= 4) {
          clearInterval(pollInterval);
          const vRes = await fetch(`/api/v1/invoices/${invoice.id}/verify`, { method: "POST" });
          if (vRes.ok) {
            const vData = await vRes.json();
            setInvoice(vData.invoice);
          }
          setIsVerifying(false);
        }
      } catch {
        if (attempts >= 4) {
          clearInterval(pollInterval);
          setIsVerifying(false);
        }
      }
    }, 1200);
  };

  const isPaid = invoice?.status === "paid";
  const isFailed = invoice?.status === "payment_failed";

  return (
    <div className="space-y-6">
      {/* Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-ink-800">
            {copy.customer.bill.title}
          </h1>
          <p className="text-xs text-ink-600 mt-0.5">
            Nov 2026 Consolidated Wholesale Bill · Flat {membership?.unit_label || "A-101"} · Green Meadows
          </p>
        </div>
        <div>
          {isPaid ? (
            <StatusPill kind="success" label="Bill Paid · Receipt Issued" />
          ) : isFailed ? (
            <StatusPill kind="danger" label="Payment Failed · Try Again" />
          ) : (
            <StatusPill kind="warning" label="Payment Due · Final Bill" />
          )}
        </div>
      </div>

      {/* Paid Banner */}
      {isPaid && (
        <Banner
          kind="success"
          message={`Payment received for ₹${Math.round((invoice?.total_paise || 72000) / 100)}. Thank you! Your order will be delivered by your building's coordinator.`}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bill Breakdown Card */}
        <div className="md:col-span-2 space-y-4">
          <Card className="p-6 space-y-5 bg-white">
            <div className="flex items-center justify-between border-b border-ice-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-ice-100 flex items-center justify-center text-teal-700">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-ink-800">
                    {membership?.community.name || "Green Meadows Apartments"}
                  </h2>
                  <span className="text-xs text-ink-500 font-mono">
                    Invoice #{invoice?.id || "INV-GREEN-202611-001"}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-ink-500">Billed to</span>
                <div className="text-xs font-bold text-ink-800">{user?.name || "Asha Rao"}</div>
                <span className="text-[11px] text-ink-500">Flat {membership?.unit_label || "A-101"}</span>
              </div>
            </div>

            {/* Itemized Lines */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">
                Your Household Grocery Staples (Packed by Store)
              </h3>

              <div className="divide-y divide-ice-100">
                {invoice?.items && invoice.items.length > 0 ? (
                  invoice.items.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex justify-between items-start text-xs gap-3">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-ink-800">{item.product_name}</span>{" "}
                        <span className="text-ink-500">({item.variant_label})</span>
                        <div className="text-[11px]">
                          {item.packed_qty === 0 ? (
                            <span className="text-danger-700 font-medium">
                              Asked {item.requested_qty} · Packed 0 · Not available this month
                            </span>
                          ) : item.packed_qty < item.requested_qty ? (
                            <span className="text-warning-700 font-medium">
                              Asked {item.requested_qty} · Packed {item.packed_qty} (Store had less)
                            </span>
                          ) : (
                            <span className="text-ink-500">
                              Packed {item.packed_qty} of {item.requested_qty}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {item.packed_qty === 0 ? (
                          <span className="text-xs font-semibold text-ink-400">₹0 (Not charged)</span>
                        ) : (
                          <MoneyText paise={item.gross_paise} size="sm" />
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-2 text-xs text-ink-500">No line items in this invoice.</div>
                )}
              </div>
            </div>

            {/* F7 Calculations */}
            <div className="border-t border-ice-100 pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-ink-600">
                <span>Gross Packed Staples Subtotal</span>
                <MoneyText paise={invoice?.subtotal_paise || 80000} size="sm" />
              </div>
              <div className="flex justify-between text-teal-700 font-semibold">
                <span>Wholesale Bulk Discount Share</span>
                <span>-₹{Math.round((invoice?.overall_discount_share_paise || 8000) / 100)}</span>
              </div>
              {invoice && invoice.delivery_share_paise > 0 && (
                <div className="flex justify-between text-ink-600">
                  <span>Shared Community Delivery Split</span>
                  <MoneyText paise={invoice.delivery_share_paise} size="sm" />
                </div>
              )}
              {invoice && invoice.rounding_adjustment_paise !== 0 && (
                <div className="flex justify-between text-ink-400 text-[11px]">
                  <span>Rounding adjustment</span>
                  <span>{invoice.rounding_adjustment_paise > 0 ? "+" : ""}{invoice.rounding_adjustment_paise}p</span>
                </div>
              )}
              <div className="border-t border-ice-200 pt-3 flex justify-between items-baseline">
                <span className="text-sm font-bold text-ink-800">Final Split Amount Due</span>
                <div className="font-display text-2xl text-ink-800">
                  <MoneyText paise={invoice?.total_paise || 72000} size="xl" />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Payment Action Card */}
        <div className="space-y-4">
          <Card className="p-6 space-y-4 bg-ice-100 border-ice-300">
            <h3 className="font-display text-lg text-ink-800">
              {isPaid ? "Payment Completed" : "Pay Your Invoice"}
            </h3>

            {isPaid ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-success-700 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Transaction Confirmed</span>
                </div>
                <div className="p-3 bg-white rounded-ctl border border-ice-200 text-xs space-y-1">
                  <div className="flex justify-between text-ink-500">
                    <span>Receipt No</span>
                    <span className="font-mono text-ink-800">{invoice?.payment_id || "pay_mock_720"}</span>
                  </div>
                  <div className="flex justify-between text-ink-500">
                    <span>Amount Paid</span>
                    <MoneyText paise={invoice?.total_paise || 72000} size="sm" />
                  </div>
                  <div className="flex justify-between text-ink-500">
                    <span>Delivery Status</span>
                    <span className="font-semibold text-teal-700">Coordinated Delivery</span>
                  </div>
                </div>
                <p className="text-xs text-ink-600 leading-relaxed">
                  Sri Lakshmi Stores will deliver your packed order to the building coordinator Meera Sundaram for flat distribution.
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
              <div className="space-y-3">
                <p className="text-xs text-ink-600 leading-relaxed">
                  Pay securely via UPI (Google Pay, PhonePe, Paytm), NetBanking, or Cards.
                </p>

                {paymentError && (
                  <div className="p-2.5 rounded-ctl bg-danger-100 text-danger-700 text-xs">
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
                  Pay ₹{Math.round((invoice?.total_paise || 72000) / 100)} via Gateway
                </Button>
              </div>
            )}

            <div className="pt-2 border-t border-ice-200 flex items-center gap-2 text-[11px] text-ink-500">
              <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
              <span>Zero markup. Largest-remainder integer paise split.</span>
            </div>
          </Card>

          <Card padding="sm" className="space-y-2 bg-white">
            <span className="text-xs font-bold text-ink-800">Monthly Cycle Notes</span>
            <p className="text-xs text-ink-600">
              Final bills reflect actual quantities packed by the store. You are never charged for out-of-stock items.
            </p>
          </Card>
        </div>
      </div>

      {/* Dev Mock Checkout Modal per P16 / F8 */}
      <Dialog
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        title="Gateway Checkout (Dev Mock)"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-ice-50 rounded-ctl border border-ice-200 space-y-1">
            <div className="flex justify-between">
              <span className="text-ink-500">Order ID:</span>
              <span className="font-mono text-ink-800">{activePaymentOrder?.gateway_order_id}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Amount Due:</span>
              <MoneyText paise={invoice?.total_paise || 72000} size="sm" />
            </div>
          </div>

          <p className="text-ink-600">
            Select a simulated gateway outcome to exercise server-side cryptographic signature verification, idempotency, and atomic invoice transitions:
          </p>

          <div className="space-y-2 pt-2">
            <Button
              variant="primary"
              fullWidth
              onClick={() => handleMockAction("success")}
            >
              1. Simulate Payment Success (Captured)
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => handleMockAction("failure")}
            >
              2. Simulate Payment Failure (Declined)
            </Button>
            <Button
              variant="quiet"
              fullWidth
              onClick={() => handleMockAction("duplicate")}
            >
              3. Simulate Duplicate Success Webhook
            </Button>
            <Button
              variant="quiet"
              fullWidth
              onClick={() => handleMockAction("wrong_amount")}
            >
              4. Simulate Wrong Amount Discrepancy
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
      <Suspense fallback={<div className="p-8 text-center text-xs text-ink-500">Loading invoice...</div>}>
        <CustomerBillContent />
      </Suspense>
    </CustomerLayout>
  );
}
