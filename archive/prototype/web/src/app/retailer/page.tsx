"use client";

import React, { useState, useEffect } from "react";
import { RetailerLayout } from "@/components/layout/RetailerLayout";
import { Card, Button, StatusPill, MoneyText, ProgressBar } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { copy } from "@/lib/copy/en";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  TrendingUp,
  BarChart3,
  Package,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";

const MONTHLY_SALES_DATA = [
  { month: "Jun", label: "June 2026", amountRupees: 38400, heightPct: 62 },
  { month: "Jul", label: "July 2026", amountRupees: 42100, heightPct: 68 },
  { month: "Aug", label: "August 2026", amountRupees: 45600, heightPct: 74 },
  { month: "Sep", label: "September 2026", amountRupees: 49200, heightPct: 80 },
  { month: "Oct", label: "October 2026", amountRupees: 54800, heightPct: 90 },
  { month: "Nov", label: "November 2026 (Current)", amountRupees: 58250, heightPct: 100, isCurrent: true },
];

const CATEGORY_SALES_DATA = [
  { name: "Rice & Grains", sharePct: 38, amountRupees: 22135, top: true },
  { name: "Cooking Oils & Ghee", sharePct: 26, amountRupees: 15145 },
  { name: "Dal & Pulses", sharePct: 18, amountRupees: 10485 },
  { name: "Flours & Atta", sharePct: 12, amountRupees: 6990 },
  { name: "Sugar, Spices & Staples", sharePct: 6, amountRupees: 3495 },
];

export default function RetailerDashboardPage() {
  const { retailer } = useAuth();
  const router = useRouter();

  const [orderStatus, setOrderStatus] = useState<string>("submitted");
  const [hoveredMonth, setHoveredMonth] = useState<(typeof MONTHLY_SALES_DATA)[0] | null>(
    MONTHLY_SALES_DATA[MONTHLY_SALES_DATA.length - 1]
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("pact_retailer_order_status");
      if (saved) setOrderStatus(saved);
    }
  }, []);

  return (
    <RetailerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl text-ink-800">
              {retailer?.store_name || "Sri Lakshmi Stores"}
            </h1>
            <p className="text-xs sm:text-sm text-ink-600">
              {copy.retailer.dashboard.title} · Partner Store for Green Meadows Apartments
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/retailer/inventory">
              <Button variant="secondary" size="sm" icon={<Package className="w-4 h-4" />}>
                Manage Inventory (50+ Staples)
              </Button>
            </Link>
          </div>
        </div>

        {/* 4 Primary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 space-y-1 bg-white">
            <span className="text-xs font-semibold text-ink-600">{copy.retailer.dashboard.salesThisMonth}</span>
            <div className="font-display text-2xl text-ink-800 tabular-nums">
              ₹58,250
            </div>
            <div className="flex items-center gap-1 text-[11px] text-teal-700 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+8.2% vs last month</span>
            </div>
          </Card>

          <Card className="p-4 space-y-1 bg-white">
            <span className="text-xs font-semibold text-ink-600">{copy.retailer.dashboard.activeCommunities}</span>
            <div className="font-display text-2xl text-ink-800 tabular-nums">1</div>
            <span className="text-[11px] text-ink-500 font-medium">Green Meadows (42 Flats)</span>
          </Card>

          <Card className="p-4 space-y-1 bg-white">
            <span className="text-xs font-semibold text-ink-600">{copy.retailer.dashboard.ordersToPack}</span>
            <div className="font-display text-2xl text-ink-800 tabular-nums">
              {orderStatus === "billed" ? 0 : 1}
            </div>
            <span className="text-[11px] text-warning-700 font-medium">
              {orderStatus === "billed" ? "All packed & billed" : "Nov 2026 Batch pending"}
            </span>
          </Card>

          <Card className="p-4 space-y-1 bg-white">
            <span className="text-xs font-semibold text-ink-600">Inventory Status</span>
            <div className="font-display text-2xl text-success-700 tabular-nums">
              Healthy
            </div>
            <span className="text-[11px] text-ink-500 font-medium">56 products stocked</span>
          </Card>
        </div>

        {/* ANALYTICS SECTION: Monthly Sales Trend & Category Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Monthly Sales Graph */}
          <Card className="lg:col-span-2 p-5 sm:p-6 bg-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ice-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-teal-700" />
                  <h2 className="font-display text-lg text-ink-800">Monthly Sales Trend</h2>
                </div>
                <p className="text-xs text-ink-500">
                  Exact consolidated wholesale order revenue (June – November 2026)
                </p>
              </div>

              {hoveredMonth && (
                <div className="text-right">
                  <span className="text-[11px] font-medium text-ink-500">{hoveredMonth.label}</span>
                  <div className="font-display text-lg font-bold text-teal-700">
                    ₹{hoveredMonth.amountRupees.toLocaleString("en-IN")}
                  </div>
                </div>
              )}
            </div>

            {/* SVG Visual Bar Chart */}
            <div className="pt-4">
              <div className="h-48 w-full flex items-end justify-between gap-3 px-2">
                {MONTHLY_SALES_DATA.map((item) => (
                  <div
                    key={item.month}
                    className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer"
                    onMouseEnter={() => setHoveredMonth(item)}
                  >
                    <div className="text-[10px] font-bold text-ink-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      ₹{item.amountRupees.toLocaleString("en-IN")}
                    </div>

                    <div
                      style={{ height: `${item.heightPct}%` }}
                      className={`w-full max-w-[48px] rounded-t-ctl transition-all duration-200 ${
                        item.isCurrent
                          ? "bg-teal-700 group-hover:bg-ink-800"
                          : "bg-ice-300 group-hover:bg-teal-700"
                      }`}
                    />

                    <span
                      className={`text-xs font-semibold ${
                        item.isCurrent ? "text-teal-700 font-bold" : "text-ink-600"
                      }`}
                    >
                      {item.month}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-ice-100 flex items-center justify-between text-xs text-ink-500">
                <span>Baseline: ₹38,400 (Jun)</span>
                <span className="font-bold text-teal-700">Peak: ₹58,250 (Nov) · +51.6% 6-Month Growth</span>
              </div>
            </div>
          </Card>

          {/* Right Column: Top Category Sold */}
          <Card className="p-5 sm:p-6 bg-white space-y-4">
            <div className="flex items-center gap-2 border-b border-ice-100 pb-3">
              <Layers className="w-4 h-4 text-teal-700" />
              <h2 className="font-display text-lg text-ink-800">Top Selling Categories</h2>
            </div>

            <div className="space-y-4">
              {CATEGORY_SALES_DATA.map((cat) => (
                <div key={cat.name} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-ink-800 flex items-center gap-1.5">
                      {cat.name}
                      {cat.top && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-teal-700 text-white px-1.5 py-0.2 rounded-full">
                          Top
                        </span>
                      )}
                    </span>
                    <span className="text-ink-700 tabular-nums">
                      {cat.sharePct}% · ₹{cat.amountRupees.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-ice-100 overflow-hidden">
                    <div
                      style={{ width: `${cat.sharePct}%` }}
                      className={`h-full rounded-full ${
                        cat.top ? "bg-teal-700" : "bg-ink-600"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-ice-100 text-[11px] text-ink-500">
              <strong className="text-ink-800">Rice & Grains</strong> is your #1 wholesale category, accounting for ₹22,135 this month.
            </div>
          </Card>
        </div>

        {/* Incoming Orders Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-ink-800">Community Orders Pipeline</h2>
            <Link href="/retailer/orders" className="text-xs font-semibold text-teal-700 hover:underline">
              View order packing wizard →
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
                          ? "Packing in progress"
                          : orderStatus === "accepted"
                          ? "Accepted · Stock Reserved"
                          : "Incoming Order"
                      }
                    />
                  </div>
                  <p className="text-xs text-ink-500 mt-0.5">
                    Order #ORD-GREEN-202611-001 · 4 households · 9 staple grocery lines
                  </p>
                </div>
              </div>

              <div className="text-right flex sm:flex-col items-center sm:items-end justify-between">
                <span className="text-xs text-ink-500">Consolidated Amount</span>
                <div className="font-display text-2xl text-ink-800">
                  <MoneyText paise={225000} size="xl" />
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
                {orderStatus === "billed" ? "View Finalised Bill & Invoices" : "Review & Pack Order"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </RetailerLayout>
  );
}
