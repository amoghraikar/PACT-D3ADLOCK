"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Button, StatusPill, MoneyText, Skeleton, EmptyState, ProgressBar } from "@/components/ui";
import {
  adminService,
  AdminDashboardMetrics,
  AdminCycleOverview,
  CommunityOverview,
} from "@/services/admin.service";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/useToast";
import {
  Building2,
  Users,
  Clock,
  TrendingUp,
  CheckCircle2,
  Truck,
  ArrowRight,
  Send,
  DollarSign,
  AlertCircle,
} from "lucide-react";

export default function ApartmentAdminDashboardPage() {
  const { user } = useAuth();
  const { error: toastError } = useToast();

  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [cycle, setCycle] = useState<AdminCycleOverview | null>(null);
  const [community, setCommunity] = useState<CommunityOverview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      try {
        const [mRes, cRes, commRes] = await Promise.allSettled([
          adminService.getDashboard(),
          adminService.getCurrentCycle(),
          adminService.getCommunity(),
        ]);

        if (mRes.status === "fulfilled") setMetrics(mRes.value);
        if (cRes.status === "fulfilled") setCycle(cRes.value);
        if (commRes.status === "fulfilled") setCommunity(commRes.value);
      } catch (err: any) {
        toastError(err?.message || "Failed to load admin dashboard");
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, [toastError]);

  return (
    <AppShell communityName={community?.name || "Green Glen Residency"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-text">
              Apartment Administration
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              {community?.name || "Green Glen Residency"} · Estate Management Committee
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/admin/unpaid">
              <Button variant="outline" size="sm" className="h-9">
                <Send className="w-4 h-4 mr-1.5 text-primary" />
                <span>Send Reminders</span>
              </Button>
            </Link>
            <Link href="/admin/deliveries">
              <Button variant="primary" size="sm" className="h-9">
                <Truck className="w-4 h-4 mr-1.5" />
                <span>Track Deliveries</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Community KPIs Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="card" className="h-28" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 space-y-1">
              <span className="text-xs text-muted flex items-center justify-between">
                <span>Household Participation</span>
                <Users className="w-3.5 h-3.5 text-primary" />
              </span>
              <div className="text-2xl font-bold text-text">
                {metrics?.participating_households || 0} / {metrics?.total_households || 0}
              </div>
              <span className="text-[11px] text-muted block">
                active ordering households in current cycle
              </span>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-xs text-muted flex items-center justify-between">
                <span>Total Billing Amount</span>
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
              </span>
              <div className="text-2xl font-bold text-text">
                <MoneyText paise={metrics?.total_billing_amount_paise || 0} />
              </div>
              <span className="text-[11px] text-muted block">
                aggregated collective bulk order value
              </span>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-xs text-muted flex items-center justify-between">
                <span>Amount Collected</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              </span>
              <div className="text-2xl font-bold text-text">
                <MoneyText paise={metrics?.amount_collected_paise || 0} />
              </div>
              <span className="text-[11px] text-primary block font-medium">
                {metrics?.collection_percentage ? `${metrics.collection_percentage.toFixed(1)}% settled` : "0% settled"}
              </span>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-xs text-muted flex items-center justify-between">
                <span>Doorstep Handovers</span>
                <Truck className="w-3.5 h-3.5 text-primary" />
              </span>
              <div className="text-2xl font-bold text-text">
                {metrics?.deliveries_completed || 0} / {(metrics?.deliveries_pending || 0) + (metrics?.deliveries_completed || 0)}
              </div>
              <Link
                href="/admin/deliveries"
                className="text-[11px] text-primary hover:underline block"
              >
                {metrics?.deliveries_pending || 0} pending doorstep handovers →
              </Link>
            </Card>
          </div>
        )}

        {/* Current Cycle Status Card */}
        {cycle && (
          <Card className="p-5 space-y-4 bg-surface border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">
                    Community Shopping Cycle
                  </span>
                  <StatusPill status={cycle.status}>{cycle.status}</StatusPill>
                </div>
                <h2 className="text-lg font-bold text-text">
                  {cycle.cycle_month} Consolidated Bulk Order
                </h2>
              </div>

              <div className="flex items-center gap-4 text-xs bg-background p-2.5 rounded-card border border-border">
                <div>
                  <span className="text-muted block text-[10px]">Total Demand Units</span>
                  <span className="font-bold text-text text-sm">
                    {cycle.total_requested_units} units
                  </span>
                </div>
                <div className="h-6 w-px bg-border" />
                <div>
                  <span className="text-muted block text-[10px]">Monthly Cutoff</span>
                  <span className="font-semibold text-text">22nd @ 17:27 IST</span>
                </div>
              </div>
            </div>

            {/* Collection Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-text">Resident Collection Settlement:</span>
                <span className="font-bold text-primary">
                  {metrics?.collection_percentage ? `${metrics.collection_percentage.toFixed(1)}%` : "0%"}
                </span>
              </div>
              <ProgressBar
                current={metrics?.amount_collected_paise || 0}
                total={metrics?.total_billing_amount_paise || 1}
              />
              <div className="flex justify-between text-[11px] text-muted pt-1">
                <span>Collected: <MoneyText paise={metrics?.amount_collected_paise || 0} /></span>
                <span>Outstanding: <MoneyText paise={metrics?.outstanding_amount_paise || 0} /></span>
              </div>
            </div>
          </Card>
        )}

        {/* Quick Links Navigation Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-5 flex flex-col justify-between hover:border-primary transition-colors">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-text">Unpaid Invoices & Reminders</h3>
                <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-pill">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-muted">
                View all pending household invoices and trigger automated payment reminder SMS and WhatsApp alerts.
              </p>
            </div>
            <div className="pt-4 border-t border-border mt-3">
              <Link
                href="/admin/unpaid"
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                Manage Collections <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>

          <Card className="p-5 flex flex-col justify-between hover:border-primary transition-colors">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-text">Doorstep Delivery Handovers</h3>
                <span className="text-xs font-bold text-primary bg-background border border-primary px-2 py-0.5 rounded-pill">
                  Gate Delivery
                </span>
              </div>
              <p className="text-xs text-muted">
                Track consolidated Kirana order delivery at the main gate and confirm resident flat handovers.
              </p>
            </div>
            <div className="pt-4 border-t border-border mt-3">
              <Link
                href="/admin/deliveries"
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                Doorstep Handover Checklist <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
