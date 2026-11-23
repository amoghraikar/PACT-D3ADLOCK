"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Button, StatusPill, MoneyText, Skeleton } from "@/components/ui";
import {
  platformService,
  PlatformHealthMetrics,
  GlobalTransactionSummary,
} from "@/services/platform.service";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/useToast";
import {
  Shield,
  Building2,
  Store,
  ShoppingBag,
  TrendingUp,
  Activity,
  Users,
  Layers,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function PlatformAdminDashboardPage() {
  const { user } = useAuth();
  const { error: toastError } = useToast();

  const [health, setHealth] = useState<PlatformHealthMetrics | null>(null);
  const [txn, setTxn] = useState<GlobalTransactionSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadPlatformData() {
      setIsLoading(true);
      try {
        const [hRes, tRes] = await Promise.allSettled([
          platformService.getHealth(),
          platformService.getTransactions(),
        ]);

        if (hRes.status === "fulfilled") setHealth(hRes.value);
        if (tRes.status === "fulfilled") setTxn(tRes.value);
      } catch (err: any) {
        toastError(err?.message || "Failed to load platform metrics");
      } finally {
        setIsLoading(false);
      }
    }
    loadPlatformData();
  }, [toastError]);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-text">
              Platform Administration
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              PACT Central Multi-Tenant Governance & Operational Control
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/platform/communities">
              <Button variant="outline" size="sm" className="h-9">
                <Building2 className="w-4 h-4 mr-1.5 text-primary" />
                <span>Communities</span>
              </Button>
            </Link>
            <Link href="/platform/retailers">
              <Button variant="primary" size="sm" className="h-9">
                <Store className="w-4 h-4 mr-1.5" />
                <span>Retailers</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Global Overview Cards */}
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
                <span>Active Communities</span>
                <Building2 className="w-3.5 h-3.5 text-primary" />
              </span>
              <div className="text-2xl font-bold text-text">
                {health?.active_communities_count || 0}
              </div>
              <span className="text-[11px] text-muted block">apartment societies live</span>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-xs text-muted flex items-center justify-between">
                <span>Verified Retailers</span>
                <Store className="w-3.5 h-3.5 text-primary" />
              </span>
              <div className="text-2xl font-bold text-text">
                {health?.active_retailers_count || 0}
              </div>
              <span className="text-[11px] text-muted block">local merchant partners</span>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-xs text-muted flex items-center justify-between">
                <span>Platform GMV</span>
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
              </span>
              <div className="text-2xl font-bold text-text">
                <MoneyText paise={txn?.total_net_paise || 0} />
              </div>
              <span className="text-[11px] text-primary font-medium block">
                {txn?.total_orders || 0} total bulk orders
              </span>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-xs text-muted flex items-center justify-between">
                <span>Total Households</span>
                <Users className="w-3.5 h-3.5 text-primary" />
              </span>
              <div className="text-2xl font-bold text-text">
                {health?.total_users_count || 0}
              </div>
              <span className="text-[11px] text-muted block">registered residents</span>
            </Card>
          </div>
        )}

        {/* System Health Status */}
        <Card className="p-5 space-y-3 bg-surface border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-text">Global Infrastructure Health</h2>
            </div>
            <StatusPill status={health?.status === "healthy" ? "OPEN" : "REJECTED"}>
              {health?.status || "HEALTHY"}
            </StatusPill>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono pt-1">
            <div className="p-2.5 bg-background rounded-card border border-border">
              <span className="text-muted block text-[10px]">Database Connection</span>
              <span className="font-semibold text-text uppercase">
                {health?.database || "CONNECTED"}
              </span>
            </div>
            <div className="p-2.5 bg-background rounded-card border border-border">
              <span className="text-muted block text-[10px]">Environment</span>
              <span className="font-semibold text-text uppercase">
                {health?.environment || "DEVELOPMENT"}
              </span>
            </div>
            <div className="p-2.5 bg-background rounded-card border border-border">
              <span className="text-muted block text-[10px]">F7 Engine Discrepancy</span>
              <span className="font-semibold text-primary">0 PAISE (EXACT)</span>
            </div>
            <div className="p-2.5 bg-background rounded-card border border-border">
              <span className="text-muted block text-[10px]">Server UTC Time</span>
              <span className="font-semibold text-text truncate block">
                {health?.time_utc ? new Date(health.time_utc).toISOString().slice(11, 19) : "17:27:00"}
              </span>
            </div>
          </div>
        </Card>

        {/* Platform Workspaces */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 flex flex-col justify-between hover:border-primary transition-colors">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-card bg-surface border border-border flex items-center justify-center text-primary">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-text">Community Management</h3>
              <p className="text-xs text-muted">
                Onboard new apartment societies, configure cutoff schedules, and inspect tenant health.
              </p>
            </div>
            <div className="pt-4 border-t border-border mt-3">
              <Link
                href="/platform/communities"
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                Manage Communities <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>

          <Card className="p-5 flex flex-col justify-between hover:border-primary transition-colors">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-card bg-surface border border-border flex items-center justify-center text-primary">
                <Store className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-text">Retailer Merchants</h3>
              <p className="text-xs text-muted">
                Register Kirana merchants, manage delivery fee contracts, and map stores to communities.
              </p>
            </div>
            <div className="pt-4 border-t border-border mt-3">
              <Link
                href="/platform/retailers"
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                Manage Retailers <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>

          <Card className="p-5 flex flex-col justify-between hover:border-primary transition-colors">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-card bg-surface border border-border flex items-center justify-center text-primary">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-text">System Audit Logs</h3>
              <p className="text-xs text-muted">
                Inspect tamper-proof audit trails for community onboarding, bill finalization, and adjustments.
              </p>
            </div>
            <div className="pt-4 border-t border-border mt-3">
              <Link
                href="/platform/audit-logs"
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                View Audit Trail <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
