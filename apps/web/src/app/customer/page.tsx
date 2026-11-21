"use client";

import React from "react";
import Link from "next/link";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Card, Button, MonthTimeline, Banner } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { copy } from "@/lib/copy/en";
import { ShoppingBag, ListOrdered, Users } from "lucide-react";

export default function CustomerHomePage() {
  const { user, membership } = useAuth();

  return (
    <CustomerLayout>
      {/* Greeting in Serif per U8 */}
      <div className="space-y-1">
        <h1 className="font-display text-2xl sm:text-3xl text-ink-800">
          Hello, {user?.name || "Neighbour"}
        </h1>
        <p className="text-xs text-ink-600">
          Flat {membership?.unit_label || "A-101"} · {membership?.community.name || "Green Meadows Apartments"}
        </p>
      </div>

      {/* Month Timeline per U5 / U8 */}
      <Card className="p-4 sm:p-5">
        <MonthTimeline currentStep={1} />
      </Card>

      {/* Closing Banner */}
      <Banner
        kind="info"
        message={copy.customer.home.orderClosingBanner(6)}
      />

      {/* Main Action Card */}
      <Card className="p-6 space-y-4 bg-ice-100 border-ice-300">
        <div className="space-y-1.5">
          <h2 className="font-display text-xl text-ink-800">
            Add this month&apos;s staple groceries
          </h2>
          <p className="text-xs sm:text-sm text-ink-600 leading-relaxed">
            Choose what you need for home before ordering locks. The building orders together for wholesale savings.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link href="/customer/shop" className="flex-1">
            <Button variant="primary" fullWidth icon={<ShoppingBag className="w-4 h-4" />}>
              {copy.customer.home.browseShop}
            </Button>
          </Link>
          <Link href="/customer/list" className="flex-1">
            <Button variant="secondary" fullWidth icon={<ListOrdered className="w-4 h-4" />}>
              {copy.customer.home.viewList}
            </Button>
          </Link>
        </div>
      </Card>

      {/* Community Order Summary Bar */}
      <Card padding="sm" className="flex items-center gap-3 bg-white">
        <div className="w-9 h-9 rounded-full bg-ice-100 flex items-center justify-center text-teal-700 shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <p className="text-xs text-ink-600 font-medium">
          {copy.customer.home.buildingOrderSummary(4, 12)}
        </p>
      </Card>
    </CustomerLayout>
  );
}
