"use client";

import React from "react";
import { TopBar, BottomNav } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user, membership, orderMode, setOrderMode, logout } = useAuth();
  const { totalCount } = useCart();

  return (
    <ProtectedRoute allowedRoles={["customer"]}>
      <div className="min-h-screen bg-ice-50 flex flex-col">
        {/* Full-width TopBar on ice-200 */}
        <TopBar
          communityName={membership?.community.name || "Green Meadows"}
          orderMode={orderMode}
          onToggleOrderMode={() => setOrderMode(orderMode === "type" ? "speak" : "type")}
          userName={user?.name || "Neighbour"}
          userRole={user?.role || undefined}
          cartItemCount={totalCount}
          onLogout={logout}
        />

        {/* Customer Content Container (responsive: 480px on mobile, spacious max-5xl on desktop) */}
        <main className="w-full max-w-5xl mx-auto flex-1 px-4 sm:px-6 py-6 pb-24 space-y-6">
          {children}
        </main>

        {/* Bottom Navigation with dynamic cart badge: mobile only */}
        <BottomNav cartItemCount={totalCount} />
      </div>
    </ProtectedRoute>
  );
}
