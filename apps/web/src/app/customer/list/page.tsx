"use client";

import React from "react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { EmptyState } from "@/components/ui";
import { useRouter } from "next/navigation";
import { ListOrdered } from "lucide-react";
import { copy } from "@/lib/copy/en";

export default function CustomerListPage() {
  const router = useRouter();

  return (
    <CustomerLayout>
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-ink-800">{copy.customer.list.title}</h1>
        <EmptyState
          icon={<ListOrdered className="w-8 h-8" />}
          title={copy.customer.list.emptyTitle}
          description={copy.customer.list.emptyBody}
          actionLabel={copy.customer.list.addGroceriesButton}
          onAction={() => router.push("/customer/shop")}
        />
      </div>
    </CustomerLayout>
  );
}
