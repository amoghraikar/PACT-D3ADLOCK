"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Button, StatusPill, MoneyText, Skeleton, EmptyState } from "@/components/ui";
import {
  retailerService,
  RetailerDashboardMetrics,
  RetailerOrderSummary,
  InventoryItem,
} from "@/services/retailer.service";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/useToast";
import {
  Store,
  ShoppingBag,
  Package,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  DollarSign,
  Plus,
} from "lucide-react";

export default function RetailerDashboardPage() {
  const { user } = useAuth();
  const { error: toastError } = useToast();

  const [metrics, setMetrics] = useState<RetailerDashboardMetrics | null>(null);
  const [recentOrders, setRecentOrders] = useState<RetailerOrderSummary[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      try {
        const [mRes, oRes, invRes] = await Promise.allSettled([
          retailerService.getDashboard(),
          retailerService.getOrders({ limit: 5 }),
          retailerService.getInventory({ low_stock: true, limit: 5 }),
        ]);

        if (mRes.status === "fulfilled") setMetrics(mRes.value);
        if (oRes.status === "fulfilled") setRecentOrders(oRes.value.items || []);
        if (invRes.status === "fulfilled") setLowStockItems(invRes.value.items || []);
      } catch (err: any) {
        toastError(err?.message || "Failed to load retailer dashboard");
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, [toastError]);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-text">
              Merchant Order Management
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Sharma Supermarket · Fulfillment Portal for Apartment Communities
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/retailer/inventory">
              <Button variant="outline" size="sm" className="h-9">
                <Package className="w-4 h-4 mr-1.5 text-primary" />
                <span>Manage Stock</span>
              </Button>
            </Link>
            <Link href="/retailer/orders">
              <Button variant="primary" size="sm" className="h-9">
                <ShoppingBag className="w-4 h-4 mr-1.5" />
                <span>Process Orders</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Operational Metrics Cards */}
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
                <span>Incoming Bulk Orders</span>
                <Clock className="w-3.5 h-3.5 text-primary" />
              </span>
              <div className="text-2xl font-bold text-text">
                {metrics?.pending_orders || 0}
              </div>
              <span className="text-[11px] text-muted block">
                {metrics?.packing_orders || 0} orders currently being packed
              </span>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-xs text-muted flex items-center justify-between">
                <span>Monthly Gross Value</span>
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
              </span>
              <div className="text-2xl font-bold text-text">
                <MoneyText paise={metrics?.gross_order_value_paise || 0} />
              </div>
              <span className="text-[11px] text-muted block">
                {metrics?.total_orders || 0} total lifetime orders
              </span>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-xs text-muted flex items-center justify-between">
                <span>Monthly Settled Sales</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              </span>
              <div className="text-2xl font-bold text-text">
                <MoneyText paise={metrics?.monthly_sales_paise || 0} />
              </div>
              <span className="text-[11px] text-primary block font-medium">
                {metrics?.completed_orders || 0} orders delivered
              </span>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-xs text-muted flex items-center justify-between">
                <span>Low-Stock Alerts</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              </span>
              <div className="text-2xl font-bold text-amber-700">
                {metrics?.low_stock_items_count || 0}
              </div>
              <Link
                href="/retailer/inventory"
                className="text-[11px] text-primary hover:underline block"
              >
                Inward stock now →
              </Link>
            </Card>
          </div>
        )}

        {/* Incoming Bulk Orders List */}
        <Card className="p-5 space-y-4 bg-surface border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-text">Incoming Community Bulk Orders</h2>
            </div>
            <Link
              href="/retailer/orders"
              className="text-xs font-semibold text-primary hover:underline"
            >
              View All Orders
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-xs text-muted py-4 text-center">
              No pending orders. Next bulk orders arrive on the 22nd cutoff.
            </p>
          ) : (
            <div className="divide-y divide-border text-xs">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-background/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-text text-sm">
                        #{order.order_number}
                      </span>
                      <StatusPill status={order.status}>{order.status}</StatusPill>
                    </div>
                    <p className="text-muted text-xs mt-0.5">
                      {order.community_name} · {order.cycle_month} · {order.participating_households_count} households
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="font-bold text-sm text-text block">
                        <MoneyText paise={order.total_paise} />
                      </span>
                      <span className="text-[11px] text-muted">
                        {order.total_requested_items} units requested
                      </span>
                    </div>

                    <Link href={`/retailer/orders/${order.id}`}>
                      <Button variant="primary" size="sm" className="h-8 text-xs font-semibold">
                        <span>Process</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Low Stock Watchlist */}
        {lowStockItems.length > 0 && (
          <Card className="p-5 space-y-3 bg-surface border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-text">Critical Low-Stock Watchlist</h2>
              </div>
              <Link
                href="/retailer/inventory"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Inward Inventory
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-background rounded-card border border-border space-y-1"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-text">{item.product_title}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-danger-100 text-danger-700">
                      LOW
                    </span>
                  </div>
                  <p className="text-muted text-[11px]">{item.variant_title} · SKU: {item.sku}</p>
                  <div className="flex justify-between pt-1 text-[11px]">
                    <span>Current Stock: <strong className="text-text">{item.current_stock}</strong></span>
                    <span>Reorder at: {item.reorder_threshold}</span>
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
