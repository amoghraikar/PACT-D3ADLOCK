"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, ListOrdered, Receipt, Mic } from "lucide-react";
import { usePact } from "@/context/PactContext";

export function CustomerBottomNav() {
  const pathname = usePathname();
  const { totalCartCount } = usePact();

  const navItems = [
    { href: "/customer", label: "Home", icon: Home },
    { href: "/customer/shop", label: "Shop", icon: ShoppingBag },
    { href: "/customer/speak", label: "Speak", icon: Mic },
    { href: "/customer/list", label: "My list", icon: ListOrdered, badge: totalCartCount },
    { href: "/customer/bill", label: "Bill", icon: Receipt },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#B3CEDE] shadow-lg max-w-md mx-auto">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/customer"
              ? pathname === "/customer"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center relative transition-all ${
                isActive ? "text-[#432F2E] font-bold" : "text-[#6A5452] hover:text-[#432F2E]"
              }`}
            >
              <div
                className={`w-10 h-7 rounded-full flex items-center justify-center transition-all ${
                  isActive ? "bg-[#FEEFB8]" : ""
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[11px] mt-0.5">{item.label}</span>

              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-1.5 right-4 w-4 h-4 rounded-full bg-[#432F2E] text-[#FEEFB8] text-[9px] font-bold flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
