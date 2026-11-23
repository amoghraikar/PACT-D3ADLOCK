"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingBag,
  Store,
  Mic,
  Receipt,
  Truck,
  Shield,
  Palette,
  LogOut,
  Building2,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { StatusPill } from "@/components/ui/StatusPill";
import { useAuth } from "@/context/AuthContext";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  roleRequired?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Catalogue", href: "/", icon: Store },
  { label: "Collective Cart", href: "/cart", icon: ShoppingBag, badge: "3" },
  { label: "Voice Ordering", href: "/customer/voice", icon: Mic },
  { label: "My Invoices", href: "/invoices", icon: Receipt },
  { label: "Deliveries", href: "/deliveries", icon: Truck },
  { label: "Apartment Admin", href: "/admin", icon: Shield, roleRequired: "admin" },
  { label: "Design System", href: "/styleguide", icon: Palette },
];

export function ResponsiveSidebar() {
  const pathname = usePathname();
  const { user, role, logout, isAuthenticated } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-surface border-r border-border h-screen sticky top-0 overflow-y-auto z-30 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-border flex items-center justify-between">
        <Link href="/" className="focus-ring rounded-ctl">
          <Logo />
        </Link>
      </div>

      {/* Community Badge */}
      <div className="p-4 mx-3 my-2 bg-background border border-border rounded-ctl">
        <div className="flex items-center gap-2 text-xs font-semibold text-text uppercase tracking-wider mb-1">
          <Building2 className="w-3.5 h-3.5 text-primary" />
          <span>Community</span>
        </div>
        <p className="text-sm font-bold text-text truncate">
          {user?.community?.name || "Green Meadows, Apts"}
        </p>
        <p className="text-xs text-muted truncate">
          {user?.apartment_number ? `Flat ${user.apartment_number}` : "Tower A · Collective"}
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-ctl text-sm font-medium transition-colors focus-ring ${
                isActive
                  ? "bg-primary text-white"
                  : "text-text hover:bg-background hover:text-primary"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-muted"}`} />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`px-2 py-0.5 text-xs font-bold rounded-pill ${
                    isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Role Footer */}
      <div className="p-4 border-t border-border mt-auto bg-background/50">
        {isAuthenticated && user ? (
          <div className="flex items-center justify-between gap-2">
            <div className="truncate">
              <p className="text-sm font-semibold text-text truncate">
                {user.full_name || "Resident Member"}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <StatusPill kind={role === "admin" ? "warning" : "info"} size="sm">
                  {role || "customer"}
                </StatusPill>
                <span className="text-[11px] text-muted truncate">{user.phone}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              aria-label="Sign out"
              className="p-2 text-muted hover:text-danger-700 hover:bg-danger-100 rounded-ctl transition-colors focus-ring cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-xs text-muted mb-2">Sign in to access your apartment cart</p>
            <Link
              href="/auth/login"
              className="block w-full py-2 text-center text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-ctl transition-colors focus-ring"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
