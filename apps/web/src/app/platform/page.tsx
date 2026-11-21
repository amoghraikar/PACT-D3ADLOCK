"use client";

import React from "react";
import { PlatformLayout } from "@/components/layout/PlatformLayout";
import { Card, StatusPill, EmptyState } from "@/components/ui";
import { Store, Building2, Package } from "lucide-react";

export default function PlatformDashboardPage() {
  const pendingStores = [
    { id: "ret-new-1", name: "Green Agro Provisions", address: "Kaikondrahalli, Bengaluru", status: "pending" },
  ];

  const communities = [
    { id: "comm-green-1", name: "Green Meadows Apartments", code: "GREEN", assigned: "Sri Lakshmi Stores" },
    { id: "comm-lake-1", name: "Lakeview Residency", code: "LAKE", assigned: "Daily Needs Mart" },
  ];

  return (
    <PlatformLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-ink-800">
            Platform Administration
          </h1>
          <p className="text-sm text-ink-600">
            Manage store onboarding approvals, community assignments, and catalogue requests.
          </p>
        </div>

        {/* Section 1: Pending Stores */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-teal-700" />
            <h2 className="font-display text-xl text-ink-800">Pending Store Registrations</h2>
          </div>
          {pendingStores.length > 0 ? (
            <Card className="divide-y divide-ice-100 p-0 overflow-hidden">
              {pendingStores.map((store) => (
                <div key={store.id} className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-ink-800">{store.name}</h3>
                    <p className="text-xs text-ink-500">{store.address}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusPill kind="warning" label="Pending approval" />
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-ink-800 text-white rounded-ctl text-xs font-semibold hover:bg-ink-900 focus-ring cursor-pointer"
                    >
                      Activate store
                    </button>
                  </div>
                </div>
              ))}
            </Card>
          ) : (
            <EmptyState
              icon={<Store className="w-6 h-6" />}
              title="No stores awaiting approval"
              description="New retailer applications will appear here for review."
            />
          )}
        </section>

        {/* Section 2: Communities & Assigned Retailers */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-700" />
            <h2 className="font-display text-xl text-ink-800">Communities & Store Assignments</h2>
          </div>
          <Card className="divide-y divide-ice-100 p-0 overflow-hidden">
            {communities.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-ink-800">{c.name}</h3>
                  <span className="text-xs text-ink-500">Code: {c.code}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-ink-500 block">Assigned Store:</span>
                  <span className="text-xs font-semibold text-teal-700">{c.assigned}</span>
                </div>
              </div>
            ))}
          </Card>
        </section>

        {/* Section 3: Product Requests */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-teal-700" />
            <h2 className="font-display text-xl text-ink-800">Retailer Product Requests</h2>
          </div>
          <EmptyState
            icon={<Package className="w-6 h-6" />}
            title="No pending product requests"
            description="When stores request new products to be added to the central catalogue, they will appear here for moderation."
          />
        </section>
      </div>
    </PlatformLayout>
  );
}
