"use client";

import React from "react";
import { Building2, LogOut, Mic, Keyboard } from "lucide-react";
import { Logo } from "./Logo";

export interface TopBarProps {
  communityName?: string;
  orderMode?: "type" | "speak";
  onToggleOrderMode?: () => void;
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
}

export function TopBar({
  communityName = "Green Meadows",
  orderMode,
  onToggleOrderMode,
  userName,
  userRole,
  onLogout,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 w-full h-14 bg-ice-200 border-b border-ice-300 px-4 flex items-center justify-between select-none">
      <div className="flex items-center gap-3">
        <Logo size="sm" href={userRole === "retailer" ? "/retailer" : userRole === "community_admin" ? "/admin" : userRole === "platform_admin" ? "/platform" : "/customer"} />

        {communityName && (
          <div className="hidden xs:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/90 border border-ice-300 text-xs font-medium text-ink-800">
            <Building2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span className="truncate max-w-[140px] sm:max-w-none">{communityName}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Order Mode Switch (Type & tap vs Speak) */}
        {orderMode && onToggleOrderMode && (
          <button
            type="button"
            onClick={onToggleOrderMode}
            className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-white border border-ice-300 text-xs font-semibold text-ink-800 hover:bg-ice-100 transition-colors focus-ring cursor-pointer"
            title="Switch ordering mode"
          >
            {orderMode === "speak" ? (
              <>
                <Mic className="w-3.5 h-3.5 text-teal-700 animate-pulse" />
                <span className="hidden sm:inline">Speaking</span>
              </>
            ) : (
              <>
                <Keyboard className="w-3.5 h-3.5 text-ink-600" />
                <span className="hidden sm:inline">Typing</span>
              </>
            )}
          </button>
        )}

        {/* User Info / Logout */}
        {userName && (
          <div className="flex items-center gap-2 pl-2 border-l border-ice-300">
            <span className="text-xs font-semibold text-ink-800 hidden sm:inline">
              {userName}
            </span>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                aria-label="Sign out"
                title="Sign out"
                className="p-1.5 rounded-ctl text-ink-600 hover:text-ink-900 hover:bg-white/60 transition-colors focus-ring cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
