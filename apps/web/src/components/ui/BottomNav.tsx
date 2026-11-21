"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, ShoppingCart, Receipt } from "lucide-react";

export interface BottomNavProps {
  cartItemCount?: number;
  hasUnpaidBill?: boolean;
}

export function BottomNav({ cartItemCount = 0, hasUnpaidBill = false }: BottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/customer",
      label: "Home",
      icon: Home,
      isActive: pathname === "/customer",
    },
    {
      href: "/customer/shop",
      label: "Shop",
      icon: ShoppingBag,
      isActive: pathname === "/customer/shop",
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
      label: "Bills",
      icon: Receipt,
      badge: hasUnpaidBill ? "!" : undefined,
      badgeColor: hasUnpaidBill ? "bg-warning-700 text-white" : undefined,
      isActive: pathname === "/customer/bill",
    },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-ice-300 shadow-[var(--shadow-float)] sm:max-w-[480px] sm:mx-auto select-none md:hidden"
      aria-label="Customer Navigation"
    >
      <div className="grid grid-cols-4 h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 min-h-[48px] py-1 transition-colors focus-ring rounded-ctl ${
                item.isActive ? "text-ink-800 font-bold" : "text-ink-600 hover:text-ink-800 font-medium"
              }`}
            >
              {/* Active item sits on an ice-200 pill per U5 */}
              <div
                className={`relative flex items-center justify-center w-14 h-7 rounded-pill transition-colors ${
                  item.isActive ? "bg-ice-200" : "bg-transparent"
                }`}
              >
                <Icon className={`w-5 h-5 ${item.isActive ? "text-teal-700 stroke-[2.2]" : "stroke-[1.75]"}`} />
                {item.badge && (
                  <span
                    className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      item.badgeColor || "bg-ink-800 text-white"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
