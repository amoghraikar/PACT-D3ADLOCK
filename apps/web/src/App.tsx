import React from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { ROLES, type RoleName } from "@pact/shared";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider, homeForRole, useAuth } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import {
  AdminDashboardPage,
  AdminDeliveriesPage,
  AdminInvoicesPage,
  AdminNotificationsPage,
} from "@/pages/AdminPages";
import { LoginPage, OnboardingPage } from "@/pages/AuthPages";
import {
  CustomerBillDetailPage,
  CustomerBillPage,
  CustomerBillsHistoryPage,
  CustomerNotificationsPage,
  CustomerProfilePage,
} from "@/pages/CustomerBillingAccount";
import { CustomerDashboardPage, CustomerVoicePage } from "@/pages/CustomerDashboardVoice";
import { CustomerCartPage, CustomerShopPage } from "@/pages/CustomerShopCart";
import {
  PlatformAuditLogsPage,
  PlatformCommunitiesPage,
  PlatformDashboardPage,
  PlatformOrdersPage,
  PlatformRetailersPage,
  PlatformSettingsPage,
} from "@/pages/PlatformPages";
import {
  RetailerDashboardPage,
  RetailerInventoryPage,
  RetailerMovementsPage,
  RetailerOrderDetailPage,
  RetailerOrdersPage,
  RetailerPaymentsPage,
  RetailerProfilePage,
} from "@/pages/RetailerPages";

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === ROLES.CUSTOMER && user.communities.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Navigate to={homeForRole(user.role)} replace />;
}

function RequireRole({ allowed }: { allowed: RoleName[] }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted">
        Loading...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === ROLES.CUSTOMER && user.communities.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }
  if (!allowed.includes(user.role)) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* Resident Routes */}
            <Route element={<RequireRole allowed={[ROLES.CUSTOMER]} />}>
              <Route path="/customer" element={<CustomerDashboardPage />} />
              <Route path="/customer/shop" element={<CustomerShopPage />} />
              <Route path="/customer/cart" element={<CustomerCartPage />} />
              <Route path="/customer/voice" element={<CustomerVoicePage />} />
              <Route path="/customer/bill" element={<CustomerBillPage />} />
              <Route path="/customer/bills" element={<CustomerBillsHistoryPage />} />
              <Route path="/customer/bills/:id" element={<CustomerBillDetailPage />} />
              <Route path="/customer/notifications" element={<CustomerNotificationsPage />} />
              <Route path="/customer/profile" element={<CustomerProfilePage />} />
            </Route>

            {/* Retailer Routes */}
            <Route element={<RequireRole allowed={[ROLES.RETAILER]} />}>
              <Route path="/retailer" element={<RetailerDashboardPage />} />
              <Route path="/retailer/orders" element={<RetailerOrdersPage />} />
              <Route path="/retailer/orders/:id" element={<RetailerOrderDetailPage />} />
              <Route path="/retailer/inventory" element={<RetailerInventoryPage />} />
              <Route path="/retailer/inventory/movements" element={<RetailerMovementsPage />} />
              <Route path="/retailer/payments" element={<RetailerPaymentsPage />} />
              <Route path="/retailer/profile" element={<RetailerProfilePage />} />
            </Route>

            {/* Apartment Admin Routes */}
            <Route element={<RequireRole allowed={[ROLES.COMMUNITY_ADMIN]} />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/unpaid" element={<AdminInvoicesPage filter="unpaid" />} />
              <Route path="/admin/paid" element={<AdminInvoicesPage filter="paid" />} />
              <Route path="/admin/deliveries" element={<AdminDeliveriesPage />} />
              <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
            </Route>

            {/* Platform Admin Routes */}
            <Route element={<RequireRole allowed={[ROLES.PLATFORM_ADMIN]} />}>
              <Route path="/platform" element={<PlatformDashboardPage />} />
              <Route path="/platform/communities" element={<PlatformCommunitiesPage />} />
              <Route path="/platform/retailers" element={<PlatformRetailersPage />} />
              <Route path="/platform/orders" element={<PlatformOrdersPage />} />
              <Route path="/platform/audit-logs" element={<PlatformAuditLogsPage />} />
              <Route path="/platform/settings" element={<PlatformSettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
export default App;
