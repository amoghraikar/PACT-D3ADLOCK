"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Logo, Card, Button } from "@/components/ui";
import Link from "next/link";
import { ArrowRight, Building2, Store, Truck, Sparkles, UserCheck } from "lucide-react";

export default function OnboardingRootPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === "customer") router.push("/customer");
      else if (user.role === "retailer") router.push("/retailer");
      else if (user.role === "community_admin") router.push("/admin");
      else if (user.role === "platform_admin") router.push("/platform");
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-ice-50 text-ink-800 flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="border-b border-ice-200 bg-white/90 backdrop-blur-xs sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-2.5">
            <Link href="/login?tab=signin">
              <Button variant="secondary" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/login?tab=register">
              <Button variant="primary" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                Register
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Concise Onboarding Content */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-14 space-y-10 my-auto">
        {/* Hero Section */}
        <div className="text-center space-y-5 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ice-100 border border-ice-300 text-xs font-semibold text-teal-700">
            <Sparkles className="w-3.5 h-3.5 text-teal-700" />
            <span>Community Grocery Pooling</span>
          </div>

          {/* Project Logo & Exact Tagline */}
          <div className="space-y-3">
            <h1 className="font-display text-4xl sm:text-5xl text-ink-800 tracking-tight leading-tight">
              Buy together, better together
            </h1>
            <p className="text-sm sm:text-base text-ink-600 leading-relaxed max-w-lg mx-auto">
              PACT unites apartment societies to purchase monthly grocery staples directly from local kirana stores at real wholesale prices.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <Link href="/login?tab=register" className="w-full sm:flex-1">
              <Button variant="primary" size="default" fullWidth icon={<ArrowRight className="w-4 h-4" />}>
                Register (Sign Up)
              </Button>
            </Link>
            <Link href="/login?tab=signin" className="w-full sm:flex-1">
              <Button variant="secondary" size="default" fullWidth>
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* 3 Brief & Concise Value Points */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <Card className="p-5 space-y-2 bg-white border-ice-200">
            <div className="w-9 h-9 rounded-ctl bg-ice-100 flex items-center justify-center text-teal-700">
              <Building2 className="w-5 h-5" />
            </div>
            <h2 className="font-display text-lg text-ink-800">1. Pool Society Orders</h2>
            <p className="text-xs text-ink-600 leading-relaxed">
              Neighbours add staples throughout the month. One collective order locks at monthly cutoff.
            </p>
          </Card>

          <Card className="p-5 space-y-2 bg-white border-ice-200">
            <div className="w-9 h-9 rounded-ctl bg-ice-100 flex items-center justify-center text-teal-700">
              <Store className="w-5 h-5" />
            </div>
            <h2 className="font-display text-lg text-ink-800">2. Local Kirana Wholesale</h2>
            <p className="text-xs text-ink-600 leading-relaxed">
              Fulfilled by your trusted neighbourhood store at true bulk rates with zero middleman app fees.
            </p>
          </Card>

          <Card className="p-5 space-y-2 bg-white border-ice-200">
            <div className="w-9 h-9 rounded-ctl bg-ice-100 flex items-center justify-center text-teal-700">
              <Truck className="w-5 h-5" />
            </div>
            <h2 className="font-display text-lg text-ink-800">3. Fair Split & Delivery</h2>
            <p className="text-xs text-ink-600 leading-relaxed">
              Discounts and single-drop delivery are split down to the paisa. Packed per flat and delivered to your door.
            </p>
          </Card>
        </div>

        {/* Evaluation Persona Switcher for Quick Testing */}
        <div className="p-4 bg-ice-100/70 border border-ice-300 rounded-card space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-ink-800">Demo Testing Accounts (1-Click Instant Login)</span>
            <span className="text-[11px] text-teal-700 font-semibold">Evaluation Mode</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <Link
              href="/login?persona=asha"
              className="p-2.5 rounded-ctl bg-white border border-ice-200 hover:border-teal-700 text-left transition-colors block"
            >
              <b className="block text-ink-800">Asha Rao</b>
              <span className="text-[11px] text-ink-500">Resident (A-101)</span>
            </Link>
            <Link
              href="/login?persona=ravi"
              className="p-2.5 rounded-ctl bg-white border border-ice-200 hover:border-teal-700 text-left transition-colors block"
            >
              <b className="block text-ink-800">Ravi Kumar</b>
              <span className="text-[11px] text-ink-500">Store (Sri Lakshmi)</span>
            </Link>
            <Link
              href="/login?persona=meera"
              className="p-2.5 rounded-ctl bg-white border border-ice-200 hover:border-teal-700 text-left transition-colors block"
            >
              <b className="block text-ink-800">Meera Sundaram</b>
              <span className="text-[11px] text-ink-500">Building Admin</span>
            </Link>
            <Link
              href="/login?persona=priya"
              className="p-2.5 rounded-ctl bg-white border border-ice-200 hover:border-teal-700 text-left transition-colors block"
            >
              <b className="block text-ink-800">Priya Sharma</b>
              <span className="text-[11px] text-ink-500">Platform Admin</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-ice-200 bg-white py-4 text-center text-xs text-ink-500">
        <p>PACT · Buy together, better together</p>
      </footer>
    </div>
  );
}
