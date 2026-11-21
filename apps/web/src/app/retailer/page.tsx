"use client";

import React, { useState } from "react";
import { RetailerLayout } from "@/components/layout/RetailerLayout";
import { Card, Button, StatusPill, MoneyText } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { copy } from "@/lib/copy/en";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2 } from "lucide-react";
import Link from "next/link";

export default function RetailerDashboardPage() {
  const { retailer } = useAuth();
  const router = useRouter();

  const [orderStatus] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("pact_retailer_order_status");
      if (saved) return saved;
    }
    return "submitted";
  });

  return (
    <RetailerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-ink-800">
            {retailer?.store_name || "Sri Lakshmi Stores"}
          </h1>
          <p className="text-xs sm:text-sm text-ink-600">
            {copy.retailer.dashboard.title} · Assisting Green Meadows Apartments
          </p>
        </div>

        {/* 4 Stat Cards per U8 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 space-y-1 bg-white">
            <span className="text-xs font-semibold text-ink-600">{copy.retailer.dashboard.salesThisMonth}</span>
            <div className="font-display text-2xl text-ink-800 tabular-nums">
              {orderStatus === "billed" ? "₹2,250" : "₹0"}
            </div>
            <span className="text-[11px] text-teal-700 font-medium">Wholesale batch</span>
          </Card>

          <Card className="p-4 space-y-1 bg-white">
            <span className="text-xs font-semibold text-ink-600">{copy.retailer.dashboard.activeCommunities}</span>
            <div className="font-display text-2xl text-ink-800 tabular-nums">1</div>
            <span className="text-[11px] text-ink-500 font-medium">Green Meadows</span>
          </Card>

          <Card className="p-4 space-y-1 bg-white">
            <span className="text-xs font-semibold text-ink-600">{copy.retailer.dashboard.ordersToPack}</span>
            <div className="font-display text-2xl text-ink-800 tabular-nums">
              {orderStatus === "billed" ? 0 : 1}
            </div>
            <span className="text-[11px] text-warning-700 font-medium">Nov 2026 Batch</span>
          </Card>

          <Card className="p-4 space-y-1 bg-white">
            <span className="text-xs font-semibold text-ink-600">{copy.retailer.dashboard.lowStockAlerts}</span>
            <div className="font-display text-2xl text-ink-800 tabular-nums">0</div>
            <span className="text-[11px] text-success-700 font-medium">Stock healthy</span>
          </Card>
        </div>

        {/* Incoming Orders Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-ink-800">Incoming Community Orders</h2>
            <Link href="/retailer/orders" className="text-xs font-semibold text-teal-700 hover:underline">
              View all orders →
            </Link>
          </div>

          <Card className="p-5 sm:p-6 space-y-4 bg-white border-ice-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-ice-100 flex items-center justify-center text-teal-700 shrink-0 mt-0.5">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-ink-800">
                      Green Meadows Apartments
                    </h3>
                    <StatusPill
                      kind={
                        orderStatus === "billed"
                          ? "success"
                          : orderStatus === "packing" || orderStatus === "accepted"
                          ? "info"
                          : "warning"
                      }
                      label={
                        orderStatus === "billed"
                          ? "Billed · Invoices Issued"
                          : orderStatus === "packing"
                          ? "Packing"
                          : orderStatus === "accepted"
                          ? "Accepted"
                          : "Awaiting Review"
                      }
                    />
                  </div>
                  <p className="text-xs text-ink-500 mt-0.5">
                    Order #ORD-GREEN-202611-001 · 4 households · 9 staple grocery lines
                  </p>
                </div>
              </div>

              <div className="text-right flex sm:flex-col items-center sm:items-end justify-between">
                <span className="text-xs text-ink-500">Gross Estimated</span>
                <div className="font-display text-2xl text-ink-800">
                  <MoneyText paise={250000} size="xl" />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-ice-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-ink-600">
                Consolidated at midnight on 25 Nov. Preserves exact requested resident quantities.
              </div>
              <Button
                variant="primary"
                icon={<ArrowRight className="w-4 h-4" />}
                onClick={() => router.push("/retailer/orders")}
              >
                {orderStatus === "billed" ? "View Finalised Invoices" : "Review & Pack Order"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </RetailerLayout>
  );
}
