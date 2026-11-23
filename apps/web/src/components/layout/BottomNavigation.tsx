"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, ShoppingBag, Mic, Receipt, User } from "lucide-react";

export function BottomNavigation() {
  const pathname = usePathname();

  const navItems = [
    { label: "Shop", href: "/", icon: Store },
    { label: "Cart", href: "/cart", icon: ShoppingBag, badge: 3 },
    { label: "Voice", href: "/customer/voice", icon: Mic, isPrimary: true },
    { label: "Invoices", href: "/invoices", icon: Receipt },
    { label: "Profile", href: "/profile", icon: User },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,0.04)] pb-safe select-none"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className="flex flex-col items-center justify-center -mt-5 focus-ring rounded-full"
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95 ${
                    isActive ? "bg-primary-hover text-white" : "bg-primary text-white"
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-semibold text-primary mt-1">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center min-w-[56px] h-full transition-colors focus-ring rounded-ctl ${
                isActive ? "text-primary font-bold" : "text-muted hover:text-text"
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 bg-danger-700 text-white text-[9px] font-bold rounded-pill flex items-center justify-center leading-none">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
