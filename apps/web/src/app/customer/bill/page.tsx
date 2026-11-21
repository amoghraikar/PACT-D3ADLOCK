"use client";

import React from "react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { EmptyState } from "@/components/ui";
import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";
import { copy } from "@/lib/copy/en";

export default function CustomerBillPage() {
  const router = useRouter();

  return (
    <CustomerLayout>
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-ink-800">{copy.customer.bill.title}</h1>
        <EmptyState
          icon={<Receipt className="w-8 h-8" />}
          title={copy.customer.bill.emptyTitle}
          description={copy.customer.bill.emptyBody}
          actionLabel="Go to home"
          onAction={() => router.push("/customer")}
        />
      </div>
    </CustomerLayout>
  );
}
