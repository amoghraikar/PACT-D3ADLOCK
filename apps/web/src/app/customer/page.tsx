"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Button, StatusPill, Skeleton, EmptyState, MoneyText, MonthTimeline } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { cyclesService, ShoppingCycle } from "@/services/cycles.service";
import { cartService, CartResponse } from "@/services/cart.service";
import { notificationsService, NotificationItem } from "@/services/notifications.service";
import {
  ShoppingBag,
  Store,
  Mic,
  Receipt,
  Clock,
  Users,
  ArrowRight,
  Sparkles,
  Bell,
  CheckCircle2,
} from "lucide-react";

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const [cycle, setCycle] = useState<ShoppingCycle | null>(null);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [cycleRes, cartRes, notifRes] = await Promise.allSettled([
          cyclesService.getCurrentCycle(),
          cartService.getCart(),
          notificationsService.getNotifications({ limit: 3 }),
        ]);

        if (mounted) {
          if (cycleRes.status === "fulfilled") setCycle(cycleRes.value);
          if (cartRes.status === "fulfilled") setCart(cartRes.value);
          if (notifRes.status === "fulfilled") setNotifications(notifRes.value);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AppShell communityName={user?.community?.name || "Green Glen Residency"}>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-text">
              Welcome back, {user?.full_name || "Neighbor"}
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Flat {user?.apartment_number || "A-402"} · {user?.community?.name || "Green Glen Residency"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/customer/speak">
              <Button variant="outline" size="sm" className="h-9">
                <Mic className="w-4 h-4 mr-1.5 text-primary" />
                <span>Voice Order</span>
              </Button>
            </Link>
            <Link href="/customer/shop">
              <Button variant="primary" size="sm" className="h-9">
                <Store className="w-4 h-4 mr-1.5" />
                <span>Browse Shop</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Active Shopping Cycle Card */}
        {isLoading ? (
          <Skeleton variant="card" className="h-44 w-full" />
        ) : cycle ? (
          <Card className="p-6 space-y-4 bg-surface border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">
                    Active Monthly Cycle
                  </span>
                  <StatusPill status={cycle.status || "OPEN"}>
                    {cycle.status || "OPEN"}
                  </StatusPill>
                </div>
                <h2 className="text-xl font-bold text-text">
                  {cycle.month || "Current Cycle"} Shared Order
                </h2>
              </div>

              <div className="flex items-center gap-4 text-xs sm:text-sm bg-background p-2.5 rounded-card border border-border">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  <div>
                    <span className="text-muted block text-[10px]">Monthly Cutoff</span>
                    <span className="font-semibold text-text">22nd @ 17:27 IST</span>
                  </div>
                </div>
                <div className="h-6 w-px bg-border" />
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" />
                  <div>
                    <span className="text-muted block text-[10px]">Households</span>
                    <span className="font-semibold text-text">
                      {cart?.community?.participants || 8} Active
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cycle Timeline */}
            <div className="pt-2">
              <MonthTimeline
                cutoffDay={22}
                cutoffTime="17:27"
                currentStatus={cycle.status as any || "OPEN"}
              />
            </div>
          </Card>
        ) : (
          <EmptyState
            title="No Active Cycle"
            description="The next shopping cycle has not opened yet. Check back soon!"
            action={{ label: "Refresh", onClick: () => window.location.reload() }}
          />
        )}

        {/* Quick Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* My Basket Card */}
          <Card className="p-5 flex flex-col justify-between hover:border-primary transition-colors">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-card bg-surface border border-border flex items-center justify-center text-primary">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <StatusPill status="OPEN">
                  {cart?.my_items?.length || 0} Items
                </StatusPill>
              </div>
              <div>
                <h3 className="font-bold text-text text-base">My Personal Basket</h3>
                <p className="text-xs text-muted mt-0.5">
                  Your household&apos;s requested grocery items
                </p>
                <div className="mt-3">
                  <span className="text-xs text-muted block">Estimated Total:</span>
                  <div className="text-xl font-bold text-text">
                    <MoneyText paise={cart?.my_est_total_paise || 0} />
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-border mt-4">
              <Link
                href="/customer/list"
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                View Shared Cart <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>

          {/* Multilingual Voice Order Card */}
          <Card className="p-5 flex flex-col justify-between hover:border-primary transition-colors">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-card bg-surface border border-border flex items-center justify-center text-primary">
                  <Mic className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill bg-background border border-border text-muted">
                  Hindi & Hinglish
                </span>
              </div>
              <div>
                <h3 className="font-bold text-text text-base">Multilingual Voice Order</h3>
                <p className="text-xs text-muted mt-0.5">
                  Speak in Hindi, Hinglish, or English to add groceries with auto-normalization.
                </p>
                <div className="mt-3 p-2 bg-background rounded-card border border-border text-[11px] text-muted italic">
                  &ldquo;ek kilo daal aur do litre amul milk&rdquo;
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-border mt-4">
              <Link
                href="/customer/speak"
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                Start Voice Order <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>

          {/* F7 Fair Bill Card */}
          <Card className="p-5 flex flex-col justify-between hover:border-primary transition-colors">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-card bg-surface border border-border flex items-center justify-center text-primary">
                  <Receipt className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill bg-background border border-border text-muted">
                  F7 Invariant
                </span>
              </div>
              <div>
                <h3 className="font-bold text-text text-base">Monthly Invoices & Bill</h3>
                <p className="text-xs text-muted mt-0.5">
                  Fair-split wholesale bulk bill with proportional discounts & delivery allocation.
                </p>
                <div className="mt-3 text-xs text-muted space-y-1">
                  <div className="flex justify-between">
                    <span>Zero Discrepancy:</span>
                    <span className="font-semibold text-text">Guaranteed</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Gateway:</span>
                    <span className="font-semibold text-text">Razorpay / UPI</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-border mt-4">
              <Link
                href="/customer/bill"
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                View Latest Invoice <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>
        </div>

        {/* Notifications & Announcements */}
        {notifications.length > 0 && (
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-text">Community Alerts & Updates</h3>
              </div>
              <Link
                href="/customer/notifications"
                className="text-xs text-primary hover:underline font-medium"
              >
                View All
              </Link>
            </div>

            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div key={n.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-text">{n.title}</p>
                    <p className="text-muted mt-0.5">{n.body}</p>
                  </div>
                  <span className="text-[10px] text-muted shrink-0">
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
