"use client";

import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { EmptyState } from "@/components/ui";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminPaidPage() {
  const router = useRouter();

  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-ink-800">Paid Orders (Ready for Doorstep Delivery)</h1>
        <EmptyState
          icon={<CheckCircle2 className="w-8 h-8" />}
          title="Delivery Distribution (Stage 3)"
          description="Manage neighbour deliveries for confirmed payments: Asha (A-101), Bharat (B-204), Dev (D-402). 1-tap status transition buttons connect in P19."
          actionLabel="Back to overview"
          onAction={() => router.push("/admin")}
        />
      </div>
    </AdminLayout>
  );
}
