"use client";

import React from "react";
import { RetailerLayout } from "@/components/layout/RetailerLayout";
import { EmptyState } from "@/components/ui";
import { ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RetailerOrdersPage() {
  const router = useRouter();

  return (
    <RetailerLayout>
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-ink-800">Orders</h1>
        <EmptyState
          icon={<ShoppingCart className="w-8 h-8" />}
          title="Order Processing (Stage 3)"
          description="Consolidated building orders for Sri Lakshmi Stores and Daily Needs Mart. The 4-step order header (Review → Accept → Pack → Bill) connects in P13 & P14."
          actionLabel="Go to dashboard"
          onAction={() => router.push("/retailer")}
        />
      </div>
    </RetailerLayout>
  );
}
