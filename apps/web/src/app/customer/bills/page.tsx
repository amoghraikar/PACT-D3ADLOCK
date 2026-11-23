"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Button, StatusPill, MoneyText, Skeleton, EmptyState } from "@/components/ui";
import { billingService, Invoice } from "@/services/billing.service";
import { useToast } from "@/hooks/useToast";
import { Receipt, ArrowRight, Eye, Calendar, Sparkles } from "lucide-react";

export default function CustomerBillsHistoryPage() {
  const { error: toastError } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadInvoices() {
      setIsLoading(true);
      try {
        const res = await billingService.getMyInvoices();
        setInvoices(res || []);
      } catch (err: any) {
        toastError(err?.message || "Failed to load invoices");
      } finally {
        setIsLoading(false);
      }
    }
    loadInvoices();
  }, [toastError]);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-text">
              Invoices & Payment History
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Archive of all past fair-split collective grocery bills
            </p>
          </div>

          <Link href="/customer/bill">
            <Button variant="primary" size="sm" className="h-9">
              <Receipt className="w-4 h-4 mr-1.5" />
              <span>Current Cycle Bill</span>
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="card" className="h-20 w-full" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            title="No Invoices Found"
            description="You don't have any past finalized invoices yet. After the monthly cycle cutoffs, your invoices will appear here."
            action={{
              label: "Go to Shopping Catalogue",
              onClick: () => (window.location.href = "/customer/shop"),
            }}
          />
        ) : (
          <Card className="overflow-hidden border border-border">
            <div className="hidden sm:grid grid-cols-12 p-3 bg-background border-b border-border text-xs font-semibold text-muted">
              <span className="col-span-3">Invoice #</span>
              <span className="col-span-3">Billing Date</span>
              <span className="col-span-2 text-right">Net Amount</span>
              <span className="col-span-2 text-center">Status</span>
              <span className="col-span-2 text-right">Action</span>
            </div>

            <div className="divide-y divide-border text-xs">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 sm:p-3 sm:grid sm:grid-cols-12 sm:items-center hover:bg-background/40 transition-colors flex flex-col gap-2 sm:gap-0"
                >
                  <div className="sm:col-span-3">
                    <span className="font-mono font-bold text-text text-sm">
                      #{inv.invoice_number}
                    </span>
                    <span className="block text-[11px] text-muted sm:hidden">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="hidden sm:block sm:col-span-3 text-muted">
                    {new Date(inv.created_at).toLocaleDateString()}
                  </div>

                  <div className="sm:col-span-2 sm:text-right font-bold text-sm text-text">
                    <MoneyText paise={inv.total_amount_paise} />
                  </div>

                  <div className="sm:col-span-2 sm:text-center">
                    <StatusPill status={inv.status}>{inv.status}</StatusPill>
                  </div>

                  <div className="sm:col-span-2 sm:text-right pt-2 sm:pt-0">
                    <Link href={`/customer/bills/${inv.id}`}>
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        <span>View Breakdown</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
