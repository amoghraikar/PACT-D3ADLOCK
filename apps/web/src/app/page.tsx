"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Logo, Button, Card, StatusPill } from "@/components/ui";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ShoppingCart,
  Receipt,
  UserCheck,
  Store,
  ShieldCheck,
  LogOut,
} from "lucide-react";

export default function OnboardingRootPage() {
  const router = useRouter();
  const { user, membership, retailer, switchPersona, logout } = useAuth();

  const handleEnterWorkspace = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role === "customer") router.push("/customer");
    else if (user.role === "retailer") router.push("/retailer");
    else if (user.role === "community_admin") router.push("/admin");
    else if (user.role === "platform_admin") router.push("/platform");
    else router.push("/onboarding");
  };

  const handleQuickLogin = (persona: "asha" | "ravi" | "meera") => {
    switchPersona(persona);
    if (persona === "asha") router.push("/customer");
    else if (persona === "ravi") router.push("/retailer");
    else if (persona === "meera") router.push("/admin");
  };

  return (
    <div className="min-h-screen bg-ice-50 text-ink-800 flex flex-col justify-between px-4 py-8 sm:py-12">
      <div className="w-full max-w-xl mx-auto space-y-8">
        {/* Header / Brand */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-ink-800 tracking-tight">
            PACT
          </h1>
          <p className="text-base sm:text-lg font-semibold text-teal-700 tracking-normal">
            Collective commerce for apartment communities
          </p>
          <p className="text-xs sm:text-sm text-ink-600 max-w-md mx-auto">
            Residents pool monthly grocery orders, the local kirana store fulfills one consolidated delivery, and bills are split fairly per flat.
          </p>
        </div>

        {/* Active Session Status (If logged in during this session) */}
        {user ? (
          <Card className="border border-teal-200 bg-white/90 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-ink-800 text-sm">{user.name}</div>
                  <div className="text-xs text-ink-600">
                    {user.role === "customer" && `Resident · ${membership?.unit_label || "Flat A-101"}`}
                    {user.role === "retailer" && `Kirana Store · ${retailer?.store_name || "Sri Lakshmi Stores"}`}
                    {user.role === "community_admin" && "Building Admin"}
                    {user.role === "platform_admin" && "Platform Admin"}
                  </div>
                </div>
              </div>
              <StatusPill kind="success" label="Active Session" />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="primary"
                size="default"
                fullWidth
                onClick={handleEnterWorkspace}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Go to Dashboard
              </Button>
              <Button
                variant="secondary"
                size="default"
                onClick={logout}
                icon={<LogOut className="w-4 h-4" />}
              >
                Sign Out
              </Button>
            </div>
          </Card>
        ) : (
          /* Authentication Actions */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href="/login?tab=signin" className="block w-full">
                <Button
                  variant="primary"
                  size="default"
                  fullWidth
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  Sign In with Mobile
                </Button>
              </Link>
              <Link href="/login?tab=register" className="block w-full">
                <Button
                  variant="secondary"
                  size="default"
                  fullWidth
                >
                  Register New Account
                </Button>
              </Link>
            </div>

            {/* Quick Demo Switchers */}
            <div className="pt-4 border-t border-ice-200">
              <p className="text-xs font-semibold text-ink-600 uppercase tracking-wider text-center mb-3">
                Or explore instantly with a demo persona:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin("asha")}
                  className="p-3 bg-white border border-ice-200 rounded-lg hover:border-teal-500 hover:shadow-xs transition-all text-left group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <UserCheck className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-bold text-ink-800">Asha Rao</span>
                  </div>
                  <div className="text-[11px] text-ink-600">Resident · A-101</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin("ravi")}
                  className="p-3 bg-white border border-ice-200 rounded-lg hover:border-teal-500 hover:shadow-xs transition-all text-left group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Store className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-ink-800">Ravi Kumar</span>
                  </div>
                  <div className="text-[11px] text-ink-600">Kirana Retailer</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin("meera")}
                  className="p-3 bg-white border border-ice-200 rounded-lg hover:border-teal-500 hover:shadow-xs transition-all text-left group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-ink-800">Meera S.</span>
                  </div>
                  <div className="text-[11px] text-ink-600">Building Admin</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3 Step Onboarding Guide */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="bg-white/80 border border-ice-200 rounded-xl p-4 text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-teal-50 text-teal-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="font-semibold text-xs text-ink-800">1. Apartment Community</div>
            <p className="text-[11px] text-ink-600 leading-relaxed">
              Residents join with building code (e.g. GREEN1) and apartment number.
            </p>
          </div>

          <div className="bg-white/80 border border-ice-200 rounded-xl p-4 text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-teal-50 text-teal-700 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div className="font-semibold text-xs text-ink-800">2. Monthly Group Cart</div>
            <p className="text-[11px] text-ink-600 leading-relaxed">
              Pool pantry staples monthly for bulk pricing from neighborhood kiranas.
            </p>
          </div>

          <div className="bg-white/80 border border-ice-200 rounded-xl p-4 text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-teal-50 text-teal-700 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="font-semibold text-xs text-ink-800">3. Fair Bill Splitting</div>
            <p className="text-[11px] text-ink-600 leading-relaxed">
              Store packs and bills orders. Every resident receives their own itemized bill.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center pt-8 text-xs text-ink-500">
        PACT · Collective Commerce Platform · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
