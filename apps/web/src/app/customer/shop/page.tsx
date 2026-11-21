"use client";

import React from "react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { EmptyState } from "@/components/ui";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";

export default function CustomerShopPage() {
  const router = useRouter();

  return (
    <CustomerLayout>
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-ink-800">Shop Groceries</h1>
        <EmptyState
          icon={<ShoppingBag className="w-8 h-8" />}
          title="Central Catalogue (Stage 2)"
          description="Browse 12 standardised categories, check estimated prices, and add items with simple steppers. Central catalogue APIs connect in P08 & P10."
          actionLabel="View my list"
          onAction={() => router.push("/customer/list")}
        />
      </div>
    </CustomerLayout>
  );
}
