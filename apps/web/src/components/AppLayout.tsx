import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Mic,
  Package,
  Receipt,
  Settings,
  Shield,
  ShoppingBag,
  Store,
  Truck,
  User,
  X,
} from "lucide-react";
import { ROLES, type RoleName } from "@pact/shared";
import { useAuth } from "@/context/AuthContext";
import { notificationsService } from "@/lib/services";

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

function getNavForRole(role: RoleName): { title: string; items: NavItem[] } {
  switch (role) {
    case ROLES.RETAILER:
      return {
        title: "Retailer Portal",
        items: [
          { label: "Dashboard", to: "/retailer", icon: LayoutDashboard, end: true },
          { label: "Bulk Orders", to: "/retailer/orders", icon: ShoppingBag },
          { label: "Inventory", to: "/retailer/inventory", icon: Package, end: true },
          { label: "Stock Movements", to: "/retailer/inventory/movements", icon: History },
          { label: "Settlements", to: "/retailer/payments", icon: CreditCard },
          { label: "Store Profile", to: "/retailer/profile", icon: Store },
        ],
      };
    case ROLES.COMMUNITY_ADMIN:
      return {
        title: "Apartment Admin",
        items: [
          { label: "Overview", to: "/admin", icon: LayoutDashboard, end: true },
          { label: "Unpaid Invoices", to: "/admin/unpaid", icon: Receipt },
          { label: "Paid Invoices", to: "/admin/paid", icon: CheckCircle2 },
          { label: "Deliveries & Handover", to: "/admin/deliveries", icon: Truck },
          { label: "Notifications", to: "/admin/notifications", icon: Bell },
        ],
      };
    case ROLES.PLATFORM_ADMIN:
      return {
        title: "Platform Operations",
        items: [
          { label: "Overview", to: "/platform", icon: Activity, end: true },
          { label: "Communities", to: "/platform/communities", icon: Building2 },
          { label: "Retailers", to: "/platform/retailers", icon: Store },
          { label: "All Orders", to: "/platform/orders", icon: ClipboardList },
          { label: "Audit Logs", to: "/platform/audit-logs", icon: Shield },
          { label: "Settings", to: "/platform/settings", icon: Settings },
        ],
      };
    case ROLES.CUSTOMER:
    default:
      return {
        title: "Resident Portal",
        items: [
          { label: "Dashboard", to: "/customer", icon: LayoutDashboard, end: true },
          { label: "Catalogue", to: "/customer/shop", icon: Store },
          { label: "Shared Cart", to: "/customer/cart", icon: ShoppingBag },
          { label: "Voice Order", to: "/customer/voice", icon: Mic },
          { label: "Current Bill", to: "/customer/bill", icon: Receipt },
          { label: "Invoice History", to: "/customer/bills", icon: History },
          { label: "Notifications", to: "/customer/notifications", icon: Bell },
          { label: "Profile", to: "/customer/profile", icon: User },
        ],
      };
  }
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    notificationsService
      .getUnreadCount()
      .then((res) => {
        if (active) setUnreadCount(res.unread_count);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!user) return null;

  const { title, items } = getNavForRole(user.role);
  const primaryComm = user.communities[0];

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-4 h-16 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/brand/pact-mark.png" alt="PACT" className="h-7 w-auto" />
          <span className="font-serif text-lg text-text tracking-tight">PACT</span>
        </div>
        <span className="text-[11px] font-medium text-muted bg-background border border-border px-2 py-0.5 rounded-pill">
          {title}
        </span>
      </div>

      {(primaryComm || user.retailer) && (
        <div className="mx-3 mt-3 p-3 bg-background border border-border rounded-ctl">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {user.retailer ? "Fulfillment Store" : "Community"}
          </div>
          <div className="text-sm font-semibold text-text truncate mt-0.5">
            {user.retailer ? user.retailer.store_name : primaryComm?.community_name}
          </div>
          <div className="text-xs text-muted truncate">
            {user.retailer
              ? user.retailer.phone
              : primaryComm?.unit_number
                ? `Flat ${primaryComm.unit_number}`
                : primaryComm?.community_code}
          </div>
        </div>
      )}

      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-ctl text-sm font-medium transition-colors ${
                  isActive ? "bg-primary text-white" : "text-text hover:bg-background"
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.to.endsWith("/notifications") && unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-pill bg-danger-700 text-white">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-text truncate">{user.full_name}</p>
          <p className="text-[11px] text-muted truncate">{user.phone}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          title="Sign Out"
          className="p-2 rounded-ctl text-muted hover:text-danger-700 hover:bg-background cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background text-text">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-surface border-r border-border h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-text/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-surface h-full border-r border-border z-10">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-3 p-1 text-muted hover:text-text cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-14 bg-surface border-b border-border px-4 flex items-center justify-between sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-ctl text-text hover:bg-background cursor-pointer"
            aria-label="Open Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/brand/pact-mark.png" alt="PACT" className="h-6 w-auto" />
            <span className="font-serif text-base">PACT</span>
          </div>
          <NavLink
            to={user.role === ROLES.COMMUNITY_ADMIN ? "/admin/notifications" : "/customer/notifications"}
            className="p-1.5 text-muted hover:text-text relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-danger-700" />
            )}
          </NavLink>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
