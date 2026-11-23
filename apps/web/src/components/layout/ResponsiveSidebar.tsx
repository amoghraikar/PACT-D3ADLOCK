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
  Package,
  Layers,
  History,
  CreditCard,
  CheckCircle,
  Clock,
  Activity,
  Users,
  Bell,
  User,
  Settings,
  ChevronRight,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/context/AuthContext";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function ResponsiveSidebar() {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();

  // Determine current active persona based on pathname or user role
  const isRetailer = pathname.startsWith("/retailer");
  const isAdmin = pathname.startsWith("/admin");
  const isPlatform = pathname.startsWith("/platform");
  const isCustomer = !isRetailer && !isAdmin && !isPlatform;

  let navItems: NavItem[] = [];
  let portalTitle = "Resident Portal";

  if (isCustomer) {
    portalTitle = "Resident Portal";
    navItems = [
      { label: "Dashboard", href: "/customer", icon: Activity },
      { label: "Shop Catalogue", href: "/customer/shop", icon: Store },
      { label: "Shared Cart", href: "/customer/list", icon: ShoppingBag },
      { label: "Voice Ordering", href: "/customer/speak", icon: Mic },
      { label: "Current Bill", href: "/customer/bill", icon: Receipt },
      { label: "Invoice History", href: "/customer/bills", icon: History },
      { label: "Notifications", href: "/customer/notifications", icon: Bell },
      { label: "My Profile", href: "/customer/profile", icon: User },
    ];
  } else if (isRetailer) {
    portalTitle = "Retailer Merchant";
    navItems = [
      { label: "Dashboard", href: "/retailer", icon: Activity },
      { label: "Bulk Orders", href: "/retailer/orders", icon: ShoppingBag },
      { label: "Stock Inventory", href: "/retailer/inventory", icon: Package },
      { label: "Stock Movements", href: "/retailer/inventory/movements", icon: History },
      { label: "Payments & Payouts", href: "/retailer/payments", icon: CreditCard },
      { label: "Merchant Profile", href: "/retailer/profile", icon: Store },
    ];
  } else if (isAdmin) {
    portalTitle = "Apartment Admin";
    navItems = [
      { label: "Overview", href: "/admin", icon: Activity },
      { label: "Paid Invoices", href: "/admin/paid", icon: CheckCircle },
      { label: "Unpaid Invoices", href: "/admin/unpaid", icon: Clock },
      { label: "Deliveries", href: "/admin/deliveries", icon: Truck },
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
    ];
  } else if (isPlatform) {
    portalTitle = "Platform Admin";
    navItems = [
      { label: "Global Overview", href: "/platform", icon: Activity },
      { label: "Communities", href: "/platform/communities", icon: Building2 },
      { label: "Retailers", href: "/platform/retailers", icon: Store },
      { label: "Consolidated Orders", href: "/platform/orders", icon: ShoppingBag },
      { label: "Analytics & GMV", href: "/platform/analytics", icon: Layers },
      { label: "System Audit Logs", href: "/platform/audit-logs", icon: Shield },
    ];
  }

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-surface border-r border-border h-screen sticky top-0 overflow-y-auto z-30 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <Link href="/" className="focus-ring rounded-ctl">
          <Logo size="md" />
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-pill bg-background border border-border text-muted">
          {portalTitle}
        </span>
      </div>

      {/* Community or Organization Badge */}
      <div className="p-3 mx-3 my-2 bg-background border border-border rounded-ctl">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider mb-0.5">
          <Building2 className="w-3.5 h-3.5 text-primary" />
          <span>{isPlatform ? "Platform Scope" : isRetailer ? "Fulfillment Store" : "Community"}</span>
        </div>
        <p className="text-sm font-bold text-text truncate">
          {isPlatform
            ? "PACT Central Platform"
            : isRetailer
            ? "Sharma Supermarket"
            : user?.community?.name || "Green Glen Residency"}
        </p>
        <p className="text-xs text-muted truncate">
          {isPlatform
            ? "Multi-Tenant Control"
            : isRetailer
            ? "Bengaluru · Bellandur"
            : user?.apartment_number ? `Flat ${user.apartment_number}` : "Tower A · Collective"}
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
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
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
            </Link>
          );
        })}
      </nav>

      {/* Switch Portals Quick Selector */}
      <div className="p-3 mx-3 mb-2 bg-background/60 border border-border rounded-ctl space-y-1">
        <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
          Switch Workspace
        </span>
        <div className="grid grid-cols-2 gap-1 text-[11px]">
          <Link
            href="/customer"
            className={`px-2 py-1 rounded text-center truncate ${
              isCustomer ? "bg-primary text-white font-semibold" : "text-text hover:bg-background"
            }`}
          >
            Customer
          </Link>
          <Link
            href="/retailer"
            className={`px-2 py-1 rounded text-center truncate ${
              isRetailer ? "bg-primary text-white font-semibold" : "text-text hover:bg-background"
            }`}
          >
            Retailer
          </Link>
          <Link
            href="/admin"
            className={`px-2 py-1 rounded text-center truncate ${
              isAdmin ? "bg-primary text-white font-semibold" : "text-text hover:bg-background"
            }`}
          >
            Admin
          </Link>
          <Link
            href="/platform"
            className={`px-2 py-1 rounded text-center truncate ${
              isPlatform ? "bg-primary text-white font-semibold" : "text-text hover:bg-background"
            }`}
          >
            Platform
          </Link>
        </div>
      </div>

      {/* User Footer with Signout */}
      <div className="p-3 border-t border-border bg-surface">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <p className="text-xs font-bold text-text truncate">
              {user?.full_name || "Signed-in User"}
            </p>
            <p className="text-[11px] text-muted truncate">
              {user?.phone || "+91 99999 00001"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            title="Sign Out"
            className="p-1.5 rounded-ctl text-muted hover:text-danger-700 hover:bg-background transition-colors focus-ring cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
