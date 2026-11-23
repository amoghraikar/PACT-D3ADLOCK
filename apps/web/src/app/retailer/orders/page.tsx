"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Button, StatusPill, MoneyText, Skeleton, EmptyState } from "@/components/ui";
import { retailerService, RetailerOrderSummary } from "@/services/retailer.service";
import { useToast } from "@/hooks/useToast";
import { ShoppingBag, ArrowRight, Clock, Users, CheckCircle2 } from "lucide-react";

const ORDER_TABS = [
  "ALL",
  "PENDING",
  "ACCEPTED",
  "PACKING",
  "BILLED",
  "DISPATCHED",
  "COMPLETED",
  "REJECTED",
] as const;

export default function RetailerOrdersPage() {
  const { error: toastError } = useToast();

  const [orders, setOrders] = useState<RetailerOrderSummary[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadOrders() {
      setIsLoading(true);
      try {
        const res = await retailerService.getOrders({
          status: selectedTab !== "ALL" ? selectedTab : undefined,
          limit: 50,
        });
        setOrders(res.items || []);
      } catch (err: any) {
        toastError(err?.message || "Failed to load retailer orders");
      } finally {
        setIsLoading(false);
      }
    }
    loadOrders();
  }, [selectedTab, toastError]);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-text">
              Community Bulk Orders
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Review, accept, pack, finalize, and dispatch consolidated apartment orders
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {ORDER_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSelectedTab(tab)}
              className={`px-3 py-1.5 rounded-pill text-xs font-semibold shrink-0 transition-colors cursor-pointer border ${
                selectedTab === tab
                  ? "bg-primary text-white border-primary"
                  : "bg-surface text-text border-border hover:bg-background"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Orders Table / Cards */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="card" className="h-24 w-full" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            title="No Orders Found"
            description={`No community bulk orders match the "${selectedTab}" state.`}
          />
        ) : (
          <Card className="divide-y divide-border overflow-hidden">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-background/40 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-text text-base">
                      #{order.order_number}
                    </span>
                    <StatusPill status={order.status}>{order.status}</StatusPill>
                  </div>
                  <h2 className="text-sm font-bold text-text">{order.community_name}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Cycle: {order.cycle_month}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {order.participating_households_count} Households
                    </span>
                    <span>·</span>
                    <span>Placed: {new Date(order.placed_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                  <div className="text-left md:text-right">
                    <span className="text-base font-bold text-text block">
                      <MoneyText paise={order.total_paise} />
                    </span>
                    <span className="text-xs text-muted">
                      {order.total_packed_items} / {order.total_requested_items} units packed
                    </span>
                  </div>

                  <Link href={`/retailer/orders/${order.id}`}>
                    <Button variant="primary" size="sm" className="h-9 px-4 text-xs font-semibold">
                      <span>Process Order</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </AppShell>
  );
}
