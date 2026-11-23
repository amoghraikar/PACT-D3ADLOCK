"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, ShoppingBag, Mic, Receipt, Activity, Package, CheckCircle, Shield } from "lucide-react";

export function BottomNavigation() {
  const pathname = usePathname();

  const isRetailer = pathname.startsWith("/retailer");
  const isAdmin = pathname.startsWith("/admin");
  const isPlatform = pathname.startsWith("/platform");

  let navItems: { label: string; href: string; icon: React.ComponentType<{ className?: string }>; isPrimary?: boolean }[] = [];

  if (isRetailer) {
    navItems = [
      { label: "Dashboard", href: "/retailer", icon: Activity },
      { label: "Orders", href: "/retailer/orders", icon: ShoppingBag, isPrimary: true },
      { label: "Inventory", href: "/retailer/inventory", icon: Package },
    ];
  } else if (isAdmin) {
    navItems = [
      { label: "Overview", href: "/admin", icon: Activity },
      { label: "Deliveries", href: "/admin/deliveries", icon: CheckCircle, isPrimary: true },
      { label: "Invoices", href: "/admin/unpaid", icon: Receipt },
    ];
  } else if (isPlatform) {
    navItems = [
      { label: "Global", href: "/platform", icon: Activity },
      { label: "Orders", href: "/platform/orders", icon: ShoppingBag, isPrimary: true },
      { label: "Audit", href: "/platform/audit-logs", icon: Shield },
    ];
  } else {
    // Default Customer Navigation
    navItems = [
      { label: "Shop", href: "/customer/shop", icon: Store },
      { label: "Cart", href: "/customer/list", icon: ShoppingBag },
      { label: "Speak", href: "/customer/speak", icon: Mic, isPrimary: true },
      { label: "Bill", href: "/customer/bill", icon: Receipt },
      { label: "History", href: "/customer/bills", icon: Activity },
    ];
  }

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
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
