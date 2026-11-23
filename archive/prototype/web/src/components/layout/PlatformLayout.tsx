"use client";

import React from "react";
import { Logo, Button } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LogOut } from "lucide-react";

export function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute allowedRoles={["platform_admin"]}>
      <div className="min-h-screen bg-ice-50 flex flex-col">
        {/* Functional header per U8 */}
        <header className="h-14 bg-ice-200 border-b border-ice-300 px-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo size="sm" href="/platform" />
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Platform Administration
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-ink-800">{user?.name || "Platform Admin"}</span>
            <Button variant="quiet" size="sm" onClick={logout} icon={<LogOut className="w-4 h-4" />}>
              Sign out
            </Button>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto w-full p-6 sm:p-8 space-y-6">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
