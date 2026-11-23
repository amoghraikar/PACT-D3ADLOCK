"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  LogOut,
  Mic,
  Keyboard,
  Home,
  ShoppingBag,
  ShoppingCart,
  Receipt,
  ChevronDown,
  UserCheck,
} from "lucide-react";
import { Logo } from "./Logo";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "@/context/AuthContext";

export interface TopBarProps {
  communityName?: string;
  orderMode?: "type" | "speak";
  onToggleOrderMode?: () => void;
  userName?: string;
  userRole?: string;
  cartItemCount?: number;
  onLogout?: () => void;
}

export function TopBar({
  communityName = "Green Meadows",
  orderMode,
  onToggleOrderMode,
  userName,
  userRole = "customer",
  cartItemCount = 0,
  onLogout,
}: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { switchPersona, user } = useAuth();
  const [personaOpen, setPersonaOpen] = useState(false);

  const isCustomer = userRole === "customer" || user?.role === "customer";

  const customerNav = [
    { href: "/customer", label: "Home", icon: Home, isActive: pathname === "/customer" },
    {
      href: "/customer/shop",
      label: "Shop",
      icon: ShoppingBag,
      isActive: pathname === "/customer/shop",
    },
    {
      href: "/customer/speak",
      label: "Voice Order",
      icon: Mic,
      isActive: pathname === "/customer/speak",
    },
    {
      href: "/customer/list",
      label: "Cart",
      icon: ShoppingCart,
      badge: cartItemCount > 0 ? `${cartItemCount}` : undefined,
      isActive: pathname === "/customer/list",
    },
    {
      href: "/customer/bill",
      label: "Monthly Bill",
      icon: Receipt,
      badge: "Split Bill",
      isActive: pathname === "/customer/bill",
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-ice-200 border-b border-ice-300 shadow-2xs select-none">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Community Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <Logo
            size="sm"
            href={
              userRole === "retailer"
                ? "/retailer"
                : userRole === "community_admin"
                  ? "/admin"
                  : userRole === "platform_admin"
                    ? "/platform"
                    : "/customer"
            }
          />

          {communityName && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-ice-300 text-xs font-semibold text-ink-800">
              <Building2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span className="truncate max-w-[140px] md:max-w-none">{communityName}</span>
              <span className="text-ink-300">·</span>
              <span className="text-ink-600 font-normal">Nov 2026 Cycle</span>
            </div>
          )}
        </div>

        {/* Center: Desktop Navigation for Customers */}
        {isCustomer && (
          <nav className="hidden md:flex items-center gap-1.5" aria-label="Desktop Navigation">
            {customerNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-ctl text-xs font-semibold transition-colors focus-ring ${
                    item.isActive
                      ? "bg-ink-800 text-white shadow-2xs"
                      : "text-ink-700 hover:text-ink-900 hover:bg-white/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        item.isActive ? "bg-ice-200 text-ink-800" : "bg-ink-800 text-white"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right Actions: Mode Switch, Persona Selector, User Menu */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Order Mode Switch (Type vs Speak) */}
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

          {/* Notification Bell with live unread badge per P15 */}
          <NotificationBell />

          {/* Quick Persona Switcher Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPersonaOpen(!personaOpen)}
              className="flex items-center gap-2 h-9 px-2.5 sm:px-3 rounded-full bg-white border border-ice-300 text-xs font-semibold text-ink-800 hover:bg-ice-100 transition-colors focus-ring cursor-pointer"
              title="Switch Demo Role"
            >
              <div className="w-5 h-5 rounded-full bg-ice-200 text-ink-800 text-[10px] font-bold flex items-center justify-center">
                {(userName || "U")[0]}
              </div>
              <span className="hidden sm:inline">{userName || "Neighbour"}</span>
              <ChevronDown className="w-3 h-3 text-ink-500" />
            </button>

            {personaOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-card shadow-float border border-ice-300 py-2 z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-500 border-b border-ice-100 flex justify-between items-center">
                  <span>Switch Workspace</span>
                  <span className="text-teal-700 font-normal">Demo</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    switchPersona("asha");
                    setPersonaOpen(false);
                    router.push("/customer");
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-ice-100 transition-colors cursor-pointer ${
                    userRole === "customer" ? "bg-ice-100 font-bold" : ""
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-ice-200 text-ink-800 flex items-center justify-center font-bold text-[10px]">
                    A
                  </div>
                  <div className="flex-1">
                    <span className="block font-bold text-ink-800">Asha Rao</span>
                    <span className="text-[11px] text-ink-500">Resident (A-101)</span>
                  </div>
                  {userRole === "customer" && <UserCheck className="w-3.5 h-3.5 text-teal-700" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    switchPersona("ravi");
                    setPersonaOpen(false);
                    router.push("/retailer");
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-ice-100 transition-colors cursor-pointer ${
                    userRole === "retailer" ? "bg-ice-100 font-bold" : ""
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-ice-200 text-ink-800 flex items-center justify-center font-bold text-[10px]">
                    R
                  </div>
                  <div className="flex-1">
                    <span className="block font-bold text-ink-800">Ravi Kumar</span>
                    <span className="text-[11px] text-ink-500">Sri Lakshmi Stores</span>
                  </div>
                  {userRole === "retailer" && <UserCheck className="w-3.5 h-3.5 text-teal-700" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    switchPersona("meera");
                    setPersonaOpen(false);
                    router.push("/admin");
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-ice-100 transition-colors cursor-pointer ${
                    userRole === "community_admin" ? "bg-ice-100 font-bold" : ""
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-ice-200 text-ink-800 flex items-center justify-center font-bold text-[10px]">
                    M
                  </div>
                  <div className="flex-1">
                    <span className="block font-bold text-ink-800">Meera Sundaram</span>
                    <span className="text-[11px] text-ink-500">Building Admin</span>
                  </div>
                  {userRole === "community_admin" && (
                    <UserCheck className="w-3.5 h-3.5 text-teal-700" />
                  )}
                </button>

                <div className="border-t border-ice-100 my-1" />

                <Link
                  href="/styleguide"
                  onClick={() => setPersonaOpen(false)}
                  className="block px-3 py-1.5 text-[11px] text-teal-700 font-semibold hover:bg-ice-100"
                >
                  Design System & Tokens →
                </Link>
              </div>
            )}
          </div>

          {/* Logout */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              aria-label="Sign out"
              title="Sign out"
              className="p-2 rounded-full bg-white border border-ice-300 text-ink-600 hover:text-ink-900 hover:bg-ice-100 transition-colors focus-ring cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
