"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePact } from "@/context/PactContext";
import {
  ShoppingBag,
  Store,
  Building2,
  ChevronDown,
  Layers,
  Mic,
  ListOrdered,
  Receipt,
  LayoutDashboard,
  Truck,
  Check,
  Clock,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, switchUser, totalCartCount, totalEstimatedAmount, isPaid } = usePact();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/customer/shop", label: "Shop", icon: ShoppingBag },
    { href: "/customer/speak", label: "Voice Order", icon: Mic },
    {
      href: "/customer/list",
      label: "My List",
      icon: ListOrdered,
      badge: totalCartCount > 0 ? `${totalCartCount}` : undefined,
    },
    {
      href: "/customer/bill",
      label: "Monthly Bill",
      icon: Receipt,
      badge: isPaid ? "Paid" : "₹720",
      badgeColor: isPaid ? "bg-[#1B6B45] text-white" : "bg-[#FEEFB8] text-[#432F2E]",
    },
  ];

  const roleWorkspaces = [
    { href: "/customer", label: "Resident View", icon: ShoppingBag, role: "Asha (A-101)" },
    { href: "/retailer", label: "Store Portal", icon: Store, role: "Ravi (Retailer)" },
    { href: "/admin", label: "Building Admin", icon: Truck, role: "Meera (Coordinator)" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#C4DAE8] border-b border-[#B3CEDE] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Community Badge */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            {/* Fixed-size logo to prevent overflow */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/pact-logo-lockup.png"
              alt="PACT"
              className="h-9 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>

          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-[#B3CEDE] text-xs font-semibold text-[#2A5C79] shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-[#2A5C79]" />
            <span>Green Meadows</span>
            <span className="text-[#948180]">·</span>
            <span className="text-[#6A5452] font-normal">Nov 2026 Cycle</span>
          </div>
        </div>

        {/* Center Navigation Links (Web Desktop) */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/" || pathname === "/customer"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#432F2E] text-[#FEEFB8] shadow-xs"
                    : "text-[#432F2E] hover:bg-white/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      item.badgeColor || (isActive ? "bg-[#FEEFB8] text-[#432F2E]" : "bg-[#432F2E] text-white")
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions: Quick Role Switcher & User Profile */}
        <div className="flex items-center gap-2.5">
          {/* Quick Portal Switcher Pills (Web Desktop) */}
          <div className="hidden xl:flex items-center gap-1 bg-white/60 p-0.5 rounded-[12px] border border-[#B3CEDE]">
            <Link
              href="/customer"
              className={`px-2.5 py-1 rounded-[10px] text-xs font-medium transition-all ${
                pathname.startsWith("/customer") || pathname === "/"
                  ? "bg-[#432F2E] text-white font-bold"
                  : "text-[#6A5452] hover:text-[#432F2E]"
              }`}
            >
              Resident
            </Link>
            <Link
              href="/retailer"
              className={`px-2.5 py-1 rounded-[10px] text-xs font-medium transition-all ${
                pathname.startsWith("/retailer")
                  ? "bg-[#432F2E] text-white font-bold"
                  : "text-[#6A5452] hover:text-[#432F2E]"
              }`}
            >
              Retailer
            </Link>
            <Link
              href="/admin"
              className={`px-2.5 py-1 rounded-[10px] text-xs font-medium transition-all ${
                pathname.startsWith("/admin")
                  ? "bg-[#432F2E] text-white font-bold"
                  : "text-[#6A5452] hover:text-[#432F2E]"
              }`}
            >
              Admin
            </Link>
          </div>

          {/* Cart Status Pill */}
          <Link
            href="/customer/list"
            className="flex items-center gap-2 bg-white hover:bg-[#FFF7DB] px-3 py-1.5 rounded-[12px] border border-[#B3CEDE] text-xs font-semibold text-[#432F2E] transition-all shadow-2xs"
          >
            <ShoppingBag className="w-4 h-4 text-[#2A5C79]" />
            <span className="hidden sm:inline">My List:</span>
            <span className="num font-bold text-[#1B6B45]">
              ₹{totalEstimatedAmount}
            </span>
            <span className="w-5 h-5 rounded-full bg-[#432F2E] text-[#FEEFB8] text-[10px] font-bold flex items-center justify-center">
              {totalCartCount}
            </span>
          </Link>

          {/* User Profile / Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 bg-white hover:bg-[#FFF7DB] px-2.5 py-1.5 rounded-[12px] border border-[#B3CEDE] text-xs font-semibold text-[#432F2E] transition-all shadow-2xs cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-[#FEEFB8] border border-[#EFDB93] flex items-center justify-center text-xs text-[#432F2E] font-bold">
                {currentUser.name[0]}
              </div>
              <div className="text-left hidden sm:block">
                <span className="block text-xs font-bold leading-tight">{currentUser.name}</span>
                <span className="block text-[10px] text-[#6A5452] font-normal leading-tight">
                  {currentUser.flat || currentUser.storeName}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#6A5452]" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-[16px] shadow-xl border border-[#B3CEDE] py-2 z-50 text-xs text-[#432F2E] animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6A5452] border-b border-[#E4EEF5] flex justify-between items-center">
                  <span>Switch Workspace</span>
                  <span className="text-[#2A5C79] font-normal">Round 1 Demo</span>
                </div>

                <button
                  onClick={() => {
                    switchUser("asha");
                    setDropdownOpen(false);
                    router.push("/customer");
                  }}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-[#F3F8FB] transition-colors cursor-pointer ${
                    currentUser.role === "customer" ? "bg-[#FFF7DB] font-bold border-l-3 border-[#432F2E]" : ""
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-[#E4EEF5] text-[#2A5C79] flex items-center justify-center font-bold">
                    A
                  </div>
                  <div className="flex-1">
                    <span className="block font-bold">Asha Rao (Resident)</span>
                    <span className="text-[11px] text-[#6A5452]">Flat A-101 · Green Meadows</span>
                  </div>
                  {currentUser.role === "customer" && (
                    <Check className="w-4 h-4 text-[#1B6B45]" />
                  )}
                </button>

                <button
                  onClick={() => {
                    switchUser("ravi");
                    setDropdownOpen(false);
                    router.push("/retailer");
                  }}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-[#F3F8FB] transition-colors cursor-pointer ${
                    currentUser.role === "retailer" ? "bg-[#FFF7DB] font-bold border-l-3 border-[#432F2E]" : ""
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-[#E3F4EA] text-[#1B6B45] flex items-center justify-center font-bold">
                    R
                  </div>
                  <div className="flex-1">
                    <span className="block font-bold">Ravi Kumar (Retailer)</span>
                    <span className="text-[11px] text-[#6A5452]">Sri Lakshmi Stores</span>
                  </div>
                  {currentUser.role === "retailer" && (
                    <Check className="w-4 h-4 text-[#1B6B45]" />
                  )}
                </button>

                <button
                  onClick={() => {
                    switchUser("meera");
                    setDropdownOpen(false);
                    router.push("/admin");
                  }}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-[#F3F8FB] transition-colors cursor-pointer ${
                    currentUser.role === "admin" ? "bg-[#FFF7DB] font-bold border-l-3 border-[#432F2E]" : ""
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-[#FFE3C4] text-[#8A3A00] flex items-center justify-center font-bold">
                    M
                  </div>
                  <div className="flex-1">
                    <span className="block font-bold">Meera Nair (Admin)</span>
                    <span className="text-[11px] text-[#6A5452]">Building Coordinator</span>
                  </div>
                  {currentUser.role === "admin" && (
                    <Check className="w-4 h-4 text-[#1B6B45]" />
                  )}
                </button>

                <div className="border-t border-[#E4EEF5] mt-1 pt-1 px-3 py-1">
                  <Link
                    href="/styleguide"
                    onClick={() => setDropdownOpen(false)}
                    className="text-[11px] text-[#2A5C79] hover:underline flex items-center gap-1"
                  >
                    <Layers className="w-3 h-3" />
                    <span>View UI Tokens & Design System</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
