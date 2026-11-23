"use client";

import React from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { StatusPill } from "@/components/ui/StatusPill";

export interface TopBarProps {
  communityName?: string;
  cycleStatus?: "OPEN" | "LOCKED" | "PROCESSING" | "COMPLETED";
}

export function TopBar({
  communityName = "Green Meadows, Apts",
  cycleStatus = "OPEN",
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 w-full bg-surface/95 backdrop-blur-md border-b border-border px-4 sm:px-6 h-16 flex items-center justify-between select-none">
      {/* Mobile Brand / Community Info */}
      <div className="flex items-center gap-3">
        <div className="md:hidden">
          <Link href="/" className="focus-ring rounded-ctl">
            <Logo />
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-2 text-sm text-text">
          <Building2 className="w-4 h-4 text-primary" />
          <span className="font-semibold">{communityName}</span>
          <span className="text-muted">·</span>
          <span className="text-xs text-muted">Cycle: Nov 2026</span>
        </div>
      </div>

      {/* Right Controls: Cycle status + Notification Bell */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs text-muted font-medium">Cycle Status:</span>
          <StatusPill kind={cycleStatus === "OPEN" ? "success" : "warning"} size="sm">
            {cycleStatus}
          </StatusPill>
        </div>

        <NotificationBell
          unreadCount={2}
          notifications={[
            {
              id: "notif_1",
              title: "Cycle Cutoff in 4 Hours",
              message: "Please finalize your cart items before 17:27 IST.",
              is_read: false,
              created_at: new Date().toISOString(),
            },
            {
              id: "notif_2",
              title: "Bulk Discount Unlocked",
              message: "Sona Masoori Rice reached 50kg collective order! ₹4/kg discount applied.",
              is_read: false,
              created_at: new Date().toISOString(),
            },
          ]}
        />
      </div>
    </header>
  );
}
