"use client";

import React, { useState } from "react";
import { Sidebar, BottomNav, NotificationBell } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Home, ShoppingBag, ShoppingCart, Receipt, Mic, Building2, Keyboard, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user, membership, orderMode, setOrderMode, logout, switchPersona } = useAuth();
  const { totalCount } = useCart();
  const [personaOpen, setPersonaOpen] = useState(false);

  const customerNav = [
    { href: "/customer", label: "Home", icon: Home },
    { href: "/customer/shop", label: "Shop", icon: ShoppingBag },
    { href: "/customer/speak", label: "Voice Order", icon: Mic },
    {
      href: "/customer/list",
      label: "Cart",
      icon: ShoppingCart,
      badge: totalCount > 0 ? totalCount : undefined,
    },
    { href: "/customer/bill", label: "Monthly Bill", icon: Receipt },
  ];

  return (
    <ProtectedRoute allowedRoles={["customer"]}>
      <div className="min-h-screen bg-ice-50 flex flex-col md:flex-row">
        {/* Left Sidebar for Desktop (Navigation is on the left) */}
        <Sidebar
          items={customerNav}
          workspaceTitle={membership?.community.name || "Green Meadows"}
          userName={user?.name || "Neighbour"}
          userRole={membership ? `Flat ${membership.unit_label}` : "Resident"}
          onLogout={logout}
          extraHeaderAction={<NotificationBell />}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header inside main view */}
          <header className="h-16 px-4 sm:px-8 border-b border-ice-200 bg-white/80 backdrop-blur-xs flex items-center justify-between gap-4 sticky top-0 z-20">
            <div className="flex items-center gap-2">
              <div className="flex md:hidden">
                <Logo size="sm" href="/customer" />
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-ice-100 border border-ice-300 text-xs font-semibold text-ink-800">
                <Building2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>{membership?.community.name || "Green Meadows Apartments"}</span>
                <span className="text-ink-400">·</span>
                <span className="text-ink-600 font-normal">Flat {membership?.unit_label || "A-101"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Order Mode Switch: Type vs Speak */}
              <Link
                href={orderMode === "speak" ? "/customer/shop" : "/customer/speak"}
                onClick={() => setOrderMode(orderMode === "type" ? "speak" : "type")}
                className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-ice-100 border border-ice-300 text-xs font-semibold text-ink-800 hover:bg-ice-200 transition-colors"
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
              </Link>

              {/* Notification Bell with live unread badge */}
              <NotificationBell />

              {/* Quick Persona Switcher Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPersonaOpen(!personaOpen)}
                  className="flex items-center gap-2 h-9 px-2.5 sm:px-3 rounded-full bg-white border border-ice-300 text-xs font-semibold text-ink-800 hover:bg-ice-100 transition-colors cursor-pointer"
                  title="Switch Demo Role"
                >
                  <div className="w-5 h-5 rounded-full bg-ice-200 text-ink-800 text-[10px] font-bold flex items-center justify-center">
                    {(user?.name || "U")[0]}
                  </div>
                  <span className="hidden sm:inline">{user?.name || "Neighbour"}</span>
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
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-ice-50 flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <b className="block text-ink-800">Asha Rao</b>
                        <span className="text-ink-500">Customer (A-101)</span>
                      </div>
                      {user?.id === "usr-c1-asha" && <span className="text-teal-700 font-bold">Active</span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        switchPersona("ravi");
                        setPersonaOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-ice-50 flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <b className="block text-ink-800">Ravi Kumar</b>
                        <span className="text-ink-500">Retailer (Sri Lakshmi)</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        switchPersona("meera");
                        setPersonaOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-ice-50 flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <b className="block text-ink-800">Meera Sundaram</b>
                        <span className="text-ink-500">Building Admin</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Main content container */}
          <main className="w-full max-w-5xl mx-auto flex-1 px-4 sm:px-8 py-6 pb-24 md:pb-8 space-y-6">
            {children}
          </main>
        </div>

        {/* Bottom Navigation with dynamic cart badge: mobile only */}
        <BottomNav cartItemCount={totalCount} />
      </div>
    </ProtectedRoute>
  );
}
