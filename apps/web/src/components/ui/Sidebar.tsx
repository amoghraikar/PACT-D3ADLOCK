"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "./Logo";

export interface SidebarItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
}

export interface SidebarProps {
  items: SidebarItem[];
  workspaceTitle: string;
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
  extraHeaderAction?: React.ReactNode;
}

export function Sidebar({
  items,
  workspaceTitle,
  userName,
  userRole,
  onLogout,
  extraHeaderAction,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar (>= 768px) */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 min-h-screen bg-ice-200 border-r border-ice-300 p-4 select-none">
        {/* Brand Lockup */}
        <div className="py-2 mb-6 flex items-center justify-between">
          <div>
            <Logo size="md" />
            <p className="text-xs font-semibold text-teal-700 mt-1 uppercase tracking-wider">
              {workspaceTitle}
            </p>
          </div>
          {extraHeaderAction && <div>{extraHeaderAction}</div>}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 flex flex-col gap-1.5" aria-label="Workspace Navigation">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 h-11 px-3 rounded-ctl font-medium text-sm transition-colors focus-ring ${
                  isActive
                    ? "bg-white text-ink-800 font-semibold shadow-xs"
                    : "text-ink-600 hover:text-ink-800 hover:bg-white/50"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? "text-teal-700 stroke-[2.2]" : "text-ink-500 stroke-[1.75]"
                  }`}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-ice-100 text-ink-800">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Card & Sign out */}
        {userName && (
          <div className="pt-4 mt-auto border-t border-ice-300 flex items-center justify-between gap-2">
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-ink-800 truncate">{userName}</span>
              <span className="text-[11px] text-ink-500 capitalize">{userRole?.replace("_", " ")}</span>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                aria-label="Sign out"
                title="Sign out"
                className="p-2 rounded-ctl text-ink-600 hover:text-ink-900 hover:bg-white/60 transition-colors focus-ring cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </aside>

      {/* Mobile Top Tabs (< 768px per U4 / U5) */}
      <div className="md:hidden sticky top-0 z-30 bg-ice-200 border-b border-ice-300 px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 h-9 px-3 rounded-pill text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-ink-800 text-white"
                  : "bg-white text-ink-800 border border-ice-300 hover:bg-ice-100"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
