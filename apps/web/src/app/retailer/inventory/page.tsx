"use client";

import React from "react";
import { RetailerLayout } from "@/components/layout/RetailerLayout";
import { EmptyState } from "@/components/ui";
import { Package } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RetailerInventoryPage() {
  const router = useRouter();

  return (
    <RetailerLayout>
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-ink-800">Inventory & Listings</h1>
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title="Store Inventory (Stage 2)"
          description="Manage your 12-category price list, MRP, selling price, stock quantities and low-stock thresholds. Connecting in P06 & P07."
          actionLabel="Go to dashboard"
          onAction={() => router.push("/retailer")}
        />
      </div>
    </RetailerLayout>
  );
}
