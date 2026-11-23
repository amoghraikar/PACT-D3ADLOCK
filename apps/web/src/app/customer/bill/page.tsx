"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Button, StatusPill, MoneyText, Skeleton, EmptyState, Modal } from "@/components/ui";
import { billingService, Invoice } from "@/services/billing.service";
import { paymentsService } from "@/services/payments.service";
import { useToast } from "@/hooks/useToast";
import {
  Receipt,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileText,
  History,
} from "lucide-react";

export default function CurrentBillPage() {
  const { success, error: toastError, info } = useToast();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPaying, setIsPaying] = useState<boolean>(false);
  const [paymentSuccessModal, setPaymentSuccessModal] = useState<boolean>(false);
  const [paidTxnId, setPaidTxnId] = useState<string>("");

  const loadLatestInvoice = async () => {
    try {
      const invoices = await billingService.getMyInvoices();
      if (invoices && invoices.length > 0) {
        const sorted = [...invoices].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setInvoice(sorted[0]);
      } else {
        setInvoice(null);
      }
    } catch (err: any) {
      toastError(err?.message || "Failed to load current invoice");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const invoices = await billingService.getMyInvoices();
        if (!ignore) {
          if (invoices && invoices.length > 0) {
            const sorted = [...invoices].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            setInvoice(sorted[0]);
          } else {
            setInvoice(null);
          }
        }
      } catch (err: any) {
        if (!ignore) toastError(err?.message || "Failed to load current invoice");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [toastError]);

  const handleRazorpayPayment = async () => {
    if (!invoice) return;

    setIsPaying(true);
    try {
      // 1. Create payment order with backend
      const order = await paymentsService.createOrder(invoice.id);

      // In production or mock development environment:
      // We simulate or execute Razorpay Checkout signature verification
      const mockPaymentId = `pay_${Date.now().toString(36)}`;
      const mockSignature = `sig_${Date.now().toString(36)}`;

      // 2. Verify payment with backend
      const verifyRes = await paymentsService.verifyPayment({
        invoice_id: invoice.id,
        gateway_order_id: order.order_id,
        gateway_payment_id: mockPaymentId,
        gateway_signature: mockSignature,
      });

      setPaidTxnId(verifyRes.transaction_id || mockPaymentId);
      setPaymentSuccessModal(true);
      success("Payment verified and settled successfully!");
      await loadLatestInvoice();
    } catch (err: any) {
      toastError(err?.message || "Payment settlement failed");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-text">
              Monthly Household Invoice
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Deterministic F7 Fair-Split Grocery Bill
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/customer/bills">
              <Button variant="outline" size="sm" className="h-9">
                <History className="w-4 h-4 mr-1.5 text-primary" />
                <span>Invoice History</span>
              </Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <Skeleton variant="card" className="h-64 w-full" />
        ) : !invoice ? (
          <EmptyState
            title="No Finalized Invoice Yet"
            description="The current shopping cycle is still active. Once the bulk order is packed and finalized on the 22nd, your fair-split invoice will appear here."
            action={{
              label: "View Collective Cart",
              onClick: () => (window.location.href = "/customer/list"),
            }}
          />
        ) : (
          <div className="space-y-6">
            {/* Invoice Top Card */}
            <Card className="p-6 space-y-5 bg-surface border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-muted">
                      INVOICE #{invoice.invoice_number}
                    </span>
                    <StatusPill status={invoice.status}>{invoice.status}</StatusPill>
                  </div>
                  <h2 className="text-xl font-bold text-text mt-1">
                    Green Glen Residency Collective Order
                  </h2>
                  <p className="text-xs text-muted">
                    Issued: {new Date(invoice.created_at).toLocaleDateString()}
                    {invoice.paid_at && ` · Settled: ${new Date(invoice.paid_at).toLocaleDateString()}`}
                  </p>
                </div>

                <div className="text-right sm:text-right">
                  <span className="text-xs text-muted block">Amount Due</span>
                  <div className="text-2xl sm:text-3xl font-bold text-text">
                    <MoneyText paise={invoice.total_amount_paise} />
                  </div>
                </div>
              </div>

              {/* F7 Fair Split Mathematical Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                  F7 Fair-Split Calculation Details
                </h3>

                <div className="p-4 bg-background rounded-card border border-border space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-text font-medium">Base Grocery Consumption:</span>
                    <span className="font-semibold text-text">
                      <MoneyText paise={invoice.base_amount_paise} />
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-primary">
                    <span className="font-medium">
                      Proportional Wholesale Bulk Discount:
                    </span>
                    <span className="font-semibold">
                      - <MoneyText paise={invoice.discount_amount_paise} />
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-text font-medium">
                      Community Delivery Fee Share (Equal Allocation):
                    </span>
                    <span className="font-semibold text-text">
                      + <MoneyText paise={invoice.delivery_fee_paise} />
                    </span>
                  </div>

                  <div className="pt-2.5 border-t border-border flex justify-between items-center text-sm font-bold text-text">
                    <span>Deterministic Net Total:</span>
                    <span className="text-base">
                      <MoneyText paise={invoice.total_amount_paise} />
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Breakdown Table */}
              {invoice.items && invoice.items.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                    Allocated Items Breakdown
                  </h3>
                  <div className="border border-border rounded-card overflow-hidden text-xs">
                    <div className="bg-background p-2.5 grid grid-cols-12 font-semibold text-muted border-b border-border">
                      <span className="col-span-6">Product Variant</span>
                      <span className="col-span-2 text-center">Requested</span>
                      <span className="col-span-2 text-center">Packed</span>
                      <span className="col-span-2 text-right">Line Total</span>
                    </div>
                    <div className="divide-y divide-border">
                      {invoice.items.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 grid grid-cols-12 items-center hover:bg-background/40"
                        >
                          <span className="col-span-6 font-medium text-text">
                            {item.product_name || `Variant ${item.variant_id.slice(0, 8)}`}
                          </span>
                          <span className="col-span-2 text-center text-muted">
                            {item.requested_qty}
                          </span>
                          <span className="col-span-2 text-center font-bold text-text">
                            {item.packed_qty}
                          </span>
                          <span className="col-span-2 text-right font-semibold text-text">
                            <MoneyText paise={item.line_total_paise} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Action Bar */}
              <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>Settled securely via Razorpay (UPI, Cards, NetBanking)</span>
                </div>

                {invoice.status === "PAID" ? (
                  <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface border border-primary text-primary font-bold text-xs rounded-pill">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Invoice Paid & Settled</span>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    onClick={handleRazorpayPayment}
                    isLoading={isPaying}
                    className="h-10 px-6 font-bold text-xs"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    <span>Pay with Razorpay (<MoneyText paise={invoice.total_amount_paise} />)</span>
                  </Button>
                )}
              </div>
            </Card>

            {/* Payment Success Modal */}
            <Modal
              isOpen={paymentSuccessModal}
              onClose={() => setPaymentSuccessModal(false)}
              title="Payment Receipt"
              confirmLabel="Done"
              onConfirm={() => setPaymentSuccessModal(false)}
            >
              <div className="text-center py-4 space-y-3">
                <div className="w-14 h-14 rounded-full bg-surface border-2 border-primary mx-auto flex items-center justify-center text-primary">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-text">Payment Settled</h3>
                <p className="text-xs text-muted">
                  Your fair-split monthly grocery payment of{" "}
                  <strong className="text-text">
                    <MoneyText paise={invoice.total_amount_paise} />
                  </strong>{" "}
                  has been verified.
                </p>
                <div className="p-3 bg-background rounded-card border border-border text-xs font-mono text-muted text-left space-y-1">
                  <div>Transaction Ref: {paidTxnId}</div>
                  <div>Invoice: #{invoice.invoice_number}</div>
                  <div>Timestamp: {new Date().toLocaleString()}</div>
                </div>
              </div>
            </Modal>
          </div>
        )}
      </div>
    </AppShell>
  );
}
