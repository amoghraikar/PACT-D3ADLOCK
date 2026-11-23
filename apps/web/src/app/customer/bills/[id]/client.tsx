"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Button, StatusPill, MoneyText, Skeleton, EmptyState } from "@/components/ui";
import { billingService, Invoice } from "@/services/billing.service";
import { paymentsService, PaymentHistoryItem } from "@/services/payments.service";
import { useToast } from "@/hooks/useToast";
import {
  Receipt,
  ArrowLeft,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  CreditCard,
} from "lucide-react";

export function InvoiceDetailClient() {
  const { error: toastError } = useToast();
  const routeParams = useParams();
  const searchParams = useSearchParams();

  // Resolve ID from params or query param fallback
  const invoiceId =
    (typeof routeParams?.id === "string" && routeParams.id !== "placeholder"
      ? routeParams.id
      : null) ||
    searchParams.get("id") ||
    "placeholder";

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(invoiceId && invoiceId !== "placeholder"));

  useEffect(() => {
    if (!invoiceId || invoiceId === "placeholder") {
      return;
    }

    let ignore = false;
    async function loadDetail() {
      try {
        const [invRes, histRes] = await Promise.allSettled([
          billingService.getInvoiceDetail(invoiceId),
          paymentsService.getInvoicePaymentHistory(invoiceId),
        ]);

        if (!ignore) {
          if (invRes.status === "fulfilled") setInvoice(invRes.value);
          if (histRes.status === "fulfilled") setHistory(histRes.value);
        }
      } catch (err: any) {
        if (!ignore) toastError(err?.message || "Failed to load invoice details");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    loadDetail();
    return () => {
      ignore = true;
    };
  }, [invoiceId, toastError]);

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <Link
            href="/customer/bills"
            className="text-xs font-semibold text-muted hover:text-text inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Invoices</span>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-8 text-xs"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            <span>Print Receipt</span>
          </Button>
        </div>

        {isLoading ? (
          <Skeleton variant="card" className="h-72 w-full" />
        ) : !invoice ? (
          <EmptyState
            title="Invoice Not Found"
            description="The requested bill could not be retrieved or does not exist."
            action={{
              label: "Back to Invoices",
              onClick: () => (window.location.href = "/customer/bills"),
            }}
          />
        ) : (
          <div className="space-y-6">
            {/* Invoice Header Card */}
            <Card className="p-6 space-y-4 bg-surface border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-muted">
                      INVOICE #{invoice.invoice_number}
                    </span>
                    <StatusPill status={invoice.status}>{invoice.status}</StatusPill>
                  </div>
                  <h1 className="text-2xl font-bold text-text mt-1">
                    Green Glen Residency Collective Grocery Bill
                  </h1>
                  <p className="text-xs text-muted">
                    Issued: {new Date(invoice.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-muted block">Total Paid / Due</span>
                  <div className="text-2xl font-bold text-text">
                    <MoneyText paise={invoice.total_amount_paise} />
                  </div>
                </div>
              </div>

              {/* F7 Fair-Split Breakdown */}
              <div className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                  F7 Mathematical Allocation Breakdown
                </h2>
                <div className="p-4 bg-background rounded-card border border-border space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted">Actual Consumed Items Subtotal:</span>
                    <span className="font-semibold text-text">
                      <MoneyText paise={invoice.base_amount_paise} />
                    </span>
                  </div>
                  <div className="flex justify-between text-primary">
                    <span>Wholesale Bulk Discount Share:</span>
                    <span className="font-semibold">
                      - <MoneyText paise={invoice.discount_amount_paise} />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Delivery Fee Allocation (Equal Split):</span>
                    <span className="font-semibold text-text">
                      + <MoneyText paise={invoice.delivery_fee_paise} />
                    </span>
                  </div>
                  <div className="pt-2 border-t border-border flex justify-between font-bold text-sm text-text">
                    <span>Final Deterministic Total:</span>
                    <span>
                      <MoneyText paise={invoice.total_amount_paise} />
                    </span>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              {invoice.items && invoice.items.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                    Consolidated Items List
                  </h2>
                  <div className="border border-border rounded-card overflow-hidden text-xs">
                    <div className="bg-background p-2.5 grid grid-cols-12 font-semibold text-muted border-b border-border">
                      <span className="col-span-6">Variant</span>
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

              {/* Payment Settlement History */}
              {history.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                    Payment Gateway Transactions
                  </h2>
                  <div className="space-y-1.5 text-xs">
                    {history.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3 bg-background rounded-card border border-border flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          <div>
                            <span className="font-semibold text-text">
                              {tx.gateway} · {tx.gateway_payment_id || tx.gateway_order_id}
                            </span>
                            <span className="block text-[10px] text-muted">
                              {new Date(tx.recorded_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-text">
                            <MoneyText paise={tx.amount_paise} />
                          </span>
                          <span className="block text-[10px] text-primary uppercase font-bold">
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
