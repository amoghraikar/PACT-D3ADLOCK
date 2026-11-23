"use client";

import React from "react";
import { Sidebar } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LayoutDashboard, ShoppingCart, Package, IndianRupee } from "lucide-react";

const RETAILER_NAV = [
  { href: "/retailer", label: "Dashboard", icon: LayoutDashboard },
  { href: "/retailer/orders", label: "Orders", icon: ShoppingCart },
  { href: "/retailer/inventory", label: "Inventory", icon: Package },
  { href: "/retailer/payments", label: "Payments", icon: IndianRupee },
];

export function RetailerLayout({ children }: { children: React.ReactNode }) {
  const { user, retailer, logout } = useAuth();

  return (
    <ProtectedRoute allowedRoles={["retailer"]}>
      <div className="min-h-screen bg-ice-50 flex flex-col md:flex-row">
        <Sidebar
          items={RETAILER_NAV}
          workspaceTitle={retailer?.store_name || "Store Portal"}
          userName={user?.name || "Store Owner"}
          userRole="Store Owner"
          onLogout={logout}
        />

        <main className="flex-1 max-w-[1200px] p-4 sm:p-8 space-y-6">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
