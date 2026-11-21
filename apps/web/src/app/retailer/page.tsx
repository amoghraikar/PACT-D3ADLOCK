"use client";

import React from "react";
import { RetailerLayout } from "@/components/layout/RetailerLayout";
import { Card, EmptyState } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { copy } from "@/lib/copy/en";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";

export default function RetailerDashboardPage() {
  const { retailer } = useAuth();
  const router = useRouter();

  return (
    <RetailerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-ink-800">
            {retailer?.store_name || "Store Portal"}
          </h1>
          <p className="text-xs sm:text-sm text-ink-600">
            {copy.retailer.dashboard.title} · Assisting nearby apartment communities
          </p>
        </div>

        {/* 4 Stat Cards per U8 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 space-y-1">
            <span className="text-xs font-semibold text-ink-600">{copy.retailer.dashboard.salesThisMonth}</span>
            <div className="font-display text-2xl text-ink-800 tabular-nums">₹2,250</div>
            <span className="text-[11px] text-teal-700 font-medium">Wholesale batch</span>
          </Card>

          <Card className="p-4 space-y-1">
            <span className="text-xs font-semibold text-ink-600">{copy.retailer.dashboard.activeCommunities}</span>
            <div className="font-display text-2xl text-ink-800 tabular-nums">1</div>
            <span className="text-[11px] text-ink-500 font-medium">Green Meadows</span>
          </Card>

          <Card className="p-4 space-y-1">
            <span className="text-xs font-semibold text-ink-600">{copy.retailer.dashboard.ordersToPack}</span>
            <div className="font-display text-2xl text-ink-800 tabular-nums">1</div>
            <span className="text-[11px] text-warning-700 font-medium">Nov 2026 Batch</span>
          </Card>

          <Card className="p-4 space-y-1">
            <span className="text-xs font-semibold text-ink-600">{copy.retailer.dashboard.lowStockAlerts}</span>
            <div className="font-display text-2xl text-ink-800 tabular-nums">0</div>
            <span className="text-[11px] text-success-700 font-medium">Stock healthy</span>
          </Card>
        </div>

        {/* Incoming Orders Section */}
        <div className="space-y-3">
          <h2 className="font-display text-xl text-ink-800">Incoming Community Orders</h2>
          <EmptyState
            icon={<ShoppingCart className="w-8 h-8" />}
            title="Consolidated Monthly Orders"
            description="Community orders arrive automatically on the 25th of each month when resident carts lock. Review, accept, and pack directly from this portal."
            actionLabel="View all orders"
            onAction={() => router.push("/retailer/orders")}
          />
        </div>
      </div>
    </RetailerLayout>
  );
}
