"use client";

import React from "react";
import { Sidebar } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LayoutDashboard, CheckCircle2, Clock } from "lucide-react";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/paid", label: "Paid", icon: CheckCircle2 },
  { href: "/admin/unpaid", label: "Unpaid", icon: Clock },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, membership, logout } = useAuth();

  return (
    <ProtectedRoute allowedRoles={["community_admin"]}>
      <div className="min-h-screen bg-ice-50 flex flex-col md:flex-row">
        <Sidebar
          items={ADMIN_NAV}
          workspaceTitle={membership?.community.name || "Building Admin"}
          userName={user?.name || "Coordinator"}
          userRole="Building Admin"
          onLogout={logout}
        />

        <main className="flex-1 max-w-[1200px] p-4 sm:p-8 space-y-6">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
