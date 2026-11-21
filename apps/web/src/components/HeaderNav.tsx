"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { ShoppingBag, Store, Building2, Palette } from "lucide-react";

export function HeaderNav() {
  const pathname = usePathname();

  const links = [
    { href: "/customer", label: "Resident App", icon: ShoppingBag, role: "Asha · A-101" },
    { href: "/retailer", label: "Store Workspace", icon: Store, role: "Ravi · Sri Lakshmi Stores" },
    { href: "/admin", label: "Building Admin", icon: Building2, role: "Meera · Coordinator" },
    { href: "/styleguide", label: "UI Kit & Tokens", icon: Palette, role: "Design Reference" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#C4DAE8] border-b border-[#B3CEDE] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3">
          <div className="w-[110px] h-[40px] relative">
            <Image
              src="/brand/pact-logo-lockup.png"
              alt="PACT Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#432F2E] bg-[#FEEFB8] px-2 py-0.5 rounded-full border border-[#EFDB93]">
            Demo Mode
          </span>
        </Link>

        {/* Workspace Switcher */}
        <nav className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {links.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-[12px] text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#432F2E] text-[#FEEFB8] shadow-sm"
                    : "bg-white/80 hover:bg-white text-[#432F2E] border border-[#B3CEDE]"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
