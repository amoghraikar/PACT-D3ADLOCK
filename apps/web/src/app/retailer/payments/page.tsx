"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Button, StatusPill, MoneyText, Skeleton } from "@/components/ui";
import { retailerService, RetailerDashboardMetrics } from "@/services/retailer.service";
import { useToast } from "@/hooks/useToast";
import { CreditCard, CheckCircle2, Clock, TrendingUp, ShieldCheck, ArrowRight } from "lucide-react";

export default function RetailerPaymentsPage() {
  const { error: toastError } = useToast();

  const [metrics, setMetrics] = useState<RetailerDashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadMetrics() {
      setIsLoading(true);
      try {
        const data = await retailerService.getDashboard();
        setMetrics(data);
      } catch (err: any) {
        toastError(err?.message || "Failed to load settlement metrics");
      } finally {
        setIsLoading(false);
      }
    }
    loadMetrics();
  }, [toastError]);

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="pb-2 border-b border-border">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-text">
            Payments & Collections
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Settlement tracking, order payouts, and gross billing values
          </p>
        </div>

        {/* Metrics Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="card" className="h-32" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 space-y-2">
              <span className="text-xs text-muted flex items-center justify-between">
                <span>Gross Order Value</span>
                <TrendingUp className="w-4 h-4 text-primary" />
              </span>
              <div className="text-2xl font-bold text-text">
                <MoneyText paise={metrics?.gross_order_value_paise || 0} />
              </div>
              <p className="text-[11px] text-muted">
                Total aggregate billing across all apartment communities
              </p>
            </Card>

            <Card className="p-5 space-y-2">
              <span className="text-xs text-muted flex items-center justify-between">
                <span>Settled Monthly Sales</span>
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </span>
              <div className="text-2xl font-bold text-text">
                <MoneyText paise={metrics?.monthly_sales_paise || 0} />
              </div>
              <p className="text-[11px] text-primary font-medium">
                Collected and deposited into merchant bank account
              </p>
            </Card>

            <Card className="p-5 space-y-2">
              <span className="text-xs text-muted flex items-center justify-between">
                <span>Pending Collections</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </span>
              <div className="text-2xl font-bold text-amber-700">
                <MoneyText paise={metrics?.outstanding_collections_paise || 0} />
              </div>
              <p className="text-[11px] text-muted">
                Outstanding resident collections awaiting Razorpay settlement
              </p>
            </Card>
          </div>
        )}

        {/* Payout Security Notice */}
        <Card className="p-5 bg-background border border-border flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted">
            <span className="font-bold text-text block mb-1">
              Guaranteed Zero Discrepancy Payouts
            </span>
            All merchant payouts are strictly backed by the F7 deterministic invariant:
            SUM(Resident Invoices) == Final Retailer Bill. Once finalized, payments are collected
            via Razorpay and disbursed directly to Sharma Supermarket&apos;s linked merchant bank account.
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
