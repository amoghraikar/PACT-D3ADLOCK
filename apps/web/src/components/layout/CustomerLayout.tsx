"use client";

import React from "react";
import { TopBar, BottomNav } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user, membership, orderMode, setOrderMode, logout } = useAuth();

  return (
    <ProtectedRoute allowedRoles={["customer"]}>
      <div className="min-h-screen bg-ice-50 flex flex-col items-center">
        {/* TopBar on ice-200 */}
        <div className="w-full max-w-[480px]">
          <TopBar
            communityName={membership?.community.name || "Green Meadows"}
            orderMode={orderMode}
            onToggleOrderMode={() => setOrderMode(orderMode === "type" ? "speak" : "type")}
            userName={user?.name || "Neighbour"}
            userRole={user?.role || undefined}
            onLogout={logout}
          />
        </div>

        {/* Customer Content Container (max 480px, mobile-first per U4 / U8) */}
        <main className="w-full max-w-[480px] flex-1 px-4 py-6 pb-24 space-y-6">
          {children}
        </main>

        {/* Bottom Navigation */}
        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
