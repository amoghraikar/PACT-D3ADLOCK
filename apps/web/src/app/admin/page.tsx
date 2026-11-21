"use client";

import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, EmptyState, ProgressBar } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { copy } from "@/lib/copy/en";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

export default function AdminOverviewPage() {
  const { membership } = useAuth();
  const router = useRouter();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-ink-800">
            {membership?.community.name || "Building Admin"}
          </h1>
          <p className="text-xs sm:text-sm text-ink-600">
            {copy.admin.overview.title} · Nov 2026 Cycle
          </p>
        </div>

        {/* Coordinator Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 space-y-1">
            <span className="text-xs font-semibold text-ink-600">
              {copy.admin.overview.participatingResidents}
            </span>
            <div className="font-display text-2xl text-ink-800 tabular-nums">4</div>
            <span className="text-[11px] text-ink-500 font-medium">Flats A-101, B-204, C-305, D-402</span>
          </Card>

          <Card className="p-4 space-y-1">
            <span className="text-xs font-semibold text-ink-600">
              {copy.admin.overview.totalBill}
            </span>
            <div className="font-display text-2xl text-ink-800 tabular-nums">₹2,250</div>
            <span className="text-[11px] text-teal-700 font-medium">Bulk wholesale total</span>
          </Card>

          <Card className="p-4 space-y-1">
            <span className="text-xs font-semibold text-ink-600">
              {copy.admin.overview.amountCollected}
            </span>
            <div className="font-display text-2xl text-success-700 tabular-nums">₹1,890</div>
            <span className="text-[11px] text-success-700 font-medium">3 neighbours paid</span>
          </Card>

          <Card className="p-4 space-y-1">
            <span className="text-xs font-semibold text-ink-600">
              {copy.admin.overview.pendingCollection}
            </span>
            <div className="font-display text-2xl text-warning-700 tabular-nums">₹360</div>
            <span className="text-[11px] text-warning-700 font-medium">1 neighbour to pay</span>
          </Card>
        </div>

        {/* Progress Bar Card */}
        <Card className="p-6 space-y-3">
          <ProgressBar
            value={1890}
            max={2250}
            label="Building Collection Progress: ₹1,890 of ₹2,250 received"
          />
        </Card>

        {/* Delivery State Section */}
        <div className="space-y-3">
          <h2 className="font-display text-xl text-ink-800">Distribution Overview</h2>
          <EmptyState
            icon={<CheckCircle2 className="w-8 h-8" />}
            title="Doorstep Delivery & Reminders (Stage 3)"
            description="Take paid resident orders through Ready → On the way → Delivered. Send 1-tap reminders to unpaid neighbours. Connecting in P19."
            actionLabel="View paid orders"
            onAction={() => router.push("/admin/paid")}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
