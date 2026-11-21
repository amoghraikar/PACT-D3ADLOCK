"use client";

import React from "react";
import { RetailerLayout } from "@/components/layout/RetailerLayout";
import { EmptyState } from "@/components/ui";
import { IndianRupee } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RetailerPaymentsPage() {
  const router = useRouter();

  return (
    <RetailerLayout>
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-ink-800">Payments & Collections</h1>
        <EmptyState
          icon={<IndianRupee className="w-8 h-8" />}
          title="Collection Tracking (Stage 3)"
          description="Live collection progress bar, paid/unpaid resident counters, and Razorpay test mode settlement status. Connects in P16 & P18."
          actionLabel="Go to dashboard"
          onAction={() => router.push("/retailer")}
        />
      </div>
    </RetailerLayout>
  );
}
