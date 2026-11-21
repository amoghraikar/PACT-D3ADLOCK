"use client";

import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { EmptyState } from "@/components/ui";
import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminUnpaidPage() {
  const router = useRouter();

  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-ink-800">Unpaid Orders & Reminders</h1>
        <EmptyState
          icon={<Clock className="w-8 h-8" />}
          title="Payment Reminders (Stage 3)"
          description="Remind neighbours with outstanding balances (e.g. Chitra · Flat C-305 · ₹360). 'Remind all unpaid' button connects in P19."
          actionLabel="Back to overview"
          onAction={() => router.push("/admin")}
        />
      </div>
    </AdminLayout>
  );
}
