"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { usePact } from "@/context/PactContext";
import {
  ShoppingBag,
  Bell,
  User as UserIcon,
  Store,
  Building2,
  ChevronDown,
  Layers,
} from "lucide-react";
import { useState } from "react";

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, switchUser, totalCartCount } = usePact();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#C4DAE8] border-b border-[#B3CEDE] shadow-xs">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href={currentUser.role === "customer" ? "/customer" : currentUser.role === "retailer" ? "/retailer" : "/admin"} className="flex items-center gap-2">
          <div className="w-[110px] h-[36px] relative">
            <Image
              src="/brand/pact-logo-lockup.png"
              alt="PACT"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Cart Icon (for customer) */}
          {currentUser.role === "customer" && (
            <Link
              href="/customer/list"
              className="relative p-2 rounded-full hover:bg-white/50 text-[#432F2E] transition-all"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalCartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#432F2E] text-[#FEEFB8] text-[11px] font-bold flex items-center justify-center">
                  {totalCartCount}
                </span>
              )}
            </Link>
          )}

          {/* User Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 bg-white/90 hover:bg-white px-2.5 py-1.5 rounded-[12px] border border-[#B3CEDE] text-xs font-semibold text-[#432F2E] transition-all"
            >
              <div className="w-5 h-5 rounded-full bg-[#FEEFB8] flex items-center justify-center text-[10px] text-[#432F2E] font-bold">
                {currentUser.name[0]}
              </div>
              <span className="hidden sm:inline">{currentUser.name}</span>
              <span className="text-[10px] text-[#6A5452] font-normal hidden md:inline">
                ({currentUser.role})
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#6A5452]" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-[16px] shadow-lg border border-[#B3CEDE] py-2 z-50 text-xs text-[#432F2E]">
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#6A5452] border-b border-[#E4EEF5]">
                  Switch Role / Workspace
                </div>

                <button
                  onClick={() => {
                    switchUser("asha");
                    setDropdownOpen(false);
                    router.push("/customer");
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-[#F3F8FB] transition-colors ${
                    currentUser.role === "customer" ? "bg-[#FEEFB8]/50 font-bold" : ""
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 text-[#2A5C79]" />
                  <div>
                    <span className="block font-medium">Asha Rao (Resident)</span>
                    <span className="text-[10px] text-[#6A5452]">Flat A-101 · Green Meadows</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    switchUser("ravi");
                    setDropdownOpen(false);
                    router.push("/retailer");
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-[#F3F8FB] transition-colors ${
                    currentUser.role === "retailer" ? "bg-[#FEEFB8]/50 font-bold" : ""
                  }`}
                >
                  <Store className="w-4 h-4 text-[#1B6B45]" />
                  <div>
                    <span className="block font-medium">Ravi Kumar (Retailer)</span>
                    <span className="text-[10px] text-[#6A5452]">Sri Lakshmi Stores</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    switchUser("meera");
                    setDropdownOpen(false);
                    router.push("/admin");
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-[#F3F8FB] transition-colors ${
                    currentUser.role === "admin" ? "bg-[#FEEFB8]/50 font-bold" : ""
                  }`}
                >
                  <Building2 className="w-4 h-4 text-[#8A3A00]" />
                  <div>
                    <span className="block font-medium">Meera Nair (Admin)</span>
                    <span className="text-[10px] text-[#6A5452]">Building Coordinator</span>
                  </div>
                </button>

                <div className="border-t border-[#E4EEF5] mt-1 pt-1">
                  <Link
                    href="/styleguide"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-[#2A5C79] hover:bg-[#F3F8FB]"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>View Design System</span>
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
