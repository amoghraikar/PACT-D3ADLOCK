"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Logo, Card, Button } from "@/components/ui";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Store,
  Truck,
  Users,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Scale,
  Clock,
  ShoppingBag,
} from "lucide-react";

export default function OnboardingRootPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === "customer") router.push("/customer");
      else if (user.role === "retailer") router.push("/retailer");
      else if (user.role === "community_admin") router.push("/admin");
      else if (user.role === "platform_admin") router.push("/platform");
    }
  }, [user, isLoading, router]);

  const onboardingSteps = [
    {
      title: "1. Join Your Society",
      badge: "Step 1",
      icon: <Building2 className="w-5 h-5 text-teal-700" />,
      heading: "One schedule for your entire apartment complex",
      description:
        "Enter your building's invite code (like GREEN1) and flat number. Connect with your neighbours under a unified monthly grocery delivery cycle.",
      highlight: "No individual delivery chaos · 1 verified society roster",
    },
    {
      title: "2. Build Your Monthly List",
      badge: "Step 2",
      icon: <ShoppingBag className="w-5 h-5 text-teal-700" />,
      heading: "Add kitchen staples whenever you need them",
      description:
        "Browse 50+ fresh grocery staples — Atta, Rice, Dal, Oils, Ghee, and Spices. Add items to your list throughout the month before the scheduled order cutoff.",
      highlight: "Order at your own pace · Edit anytime before cutoff",
    },
    {
      title: "3. Direct Kirana Wholesale",
      badge: "Step 3",
      icon: <Store className="w-5 h-5 text-teal-700" />,
      heading: "Pooled into one bulk ticket for your local store",
      description:
        "At cutoff, all flat orders merge into a single wholesale batch sent directly to trusted neighbourhood kiranas (like Sri Lakshmi Stores), unlocking genuine volume discounts.",
      highlight: "Zero dark-store markups · True local merchant support",
    },
    {
      title: "4. Fair Split & Delivery",
      badge: "Step 4",
      icon: <Truck className="w-5 h-5 text-teal-700" />,
      heading: "Transparent down to the exact paisa",
      description:
        "Bulk savings and a single community delivery fee are divided mathematically across all participating flats. Packed individually and delivered right to your society door.",
      highlight: "Save 15–25% every month · 80% fewer delivery trips",
    },
  ];

  return (
    <div className="min-h-screen bg-ice-50 text-ink-800 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-ice-200 bg-white/80 backdrop-blur-xs sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-ice-100 text-teal-700 border border-ice-300">
              Cooperative Buying
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="secondary" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/onboarding">
              <Button variant="primary" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                Join Building
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero & Onboarding Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-12">
        {/* Brand Banner Hero */}
        <section className="bg-ice-200 border border-ice-300 rounded-card p-6 sm:p-12 relative overflow-hidden text-center shadow-xs">
          <div className="absolute inset-x-0 top-0 h-24 bg-stripes opacity-40 pointer-events-none" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-ice-300 text-xs font-semibold text-teal-700">
              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
              <span>Welcome to PACT · Hyperlocal Collective Buying</span>
            </div>

            <h1 className="font-display text-3xl sm:text-5xl text-ink-800 leading-tight">
              Groceries bought together. Delivered at wholesale kirana prices.
            </h1>

            <p className="text-sm sm:text-base text-ink-600 leading-relaxed max-w-xl mx-auto">
              Instead of 40 separate delivery bikes and high dark-store markups, PACT unites your apartment building to purchase monthly staples directly from verified neighbourhood stores.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/login" className="w-full sm:w-auto">
                <Button variant="primary" size="default" fullWidth icon={<ArrowRight className="w-4 h-4" />}>
                  Continue to Sign In
                </Button>
              </Link>
              <Link href="/onboarding" className="w-full sm:w-auto">
                <Button variant="secondary" size="default" fullWidth icon={<Building2 className="w-4 h-4 text-teal-700" />}>
                  Join / Register Building
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Step-by-Step Onboarding Walkthrough */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
              How It Works
            </span>
            <h2 className="font-display text-2xl sm:text-3xl text-ink-800">
              Four steps to smarter monthly groceries
            </h2>
            <p className="text-xs sm:text-sm text-ink-600 max-w-lg mx-auto">
              Here is how your society pools orders, unlocks genuine store discounts, and divides costs with complete mathematical fairness.
            </p>
          </div>

          {/* Interactive Step Switcher for Mobile / Desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-ice-200 pb-2">
            {onboardingSteps.map((s, idx) => (
              <button
                key={s.title}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`p-3 rounded-ctl text-left transition-all cursor-pointer border ${
                  activeStep === idx
                    ? "bg-white border-teal-700 shadow-xs ring-1 ring-teal-700"
                    : "bg-ice-100/60 border-transparent hover:bg-white text-ink-600"
                }`}
              >
                <span className={`text-[11px] font-bold block ${activeStep === idx ? "text-teal-700" : "text-ink-500"}`}>
                  {s.badge}
                </span>
                <span className="text-xs font-semibold text-ink-800 line-clamp-1">
                  {s.title.replace(/^\d\.\s*/, "")}
                </span>
              </button>
            ))}
          </div>

          {/* Active Step Showcase Card */}
          <Card className="p-6 sm:p-8 bg-white border-ice-300 space-y-6 transition-all duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-ice-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-ice-100 flex items-center justify-center shrink-0 border border-ice-200">
                  {onboardingSteps[activeStep].icon}
                </div>
                <div>
                  <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                    {onboardingSteps[activeStep].badge}
                  </span>
                  <h3 className="font-display text-xl sm:text-2xl text-ink-800">
                    {onboardingSteps[activeStep].heading}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 bg-ice-100 rounded-full text-xs font-semibold text-ink-700 border border-ice-200">
                <CheckCircle2 className="w-4 h-4 text-teal-700" />
                <span>{onboardingSteps[activeStep].highlight}</span>
              </div>
            </div>

            <p className="text-sm sm:text-base text-ink-600 leading-relaxed max-w-3xl">
              {onboardingSteps[activeStep].description}
            </p>

            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-1.5">
                {onboardingSteps.map((_, i) => (
                  <span
                    key={i}
                    className={`h-2 rounded-full transition-all ${
                      i === activeStep ? "w-6 bg-teal-700" : "w-2 bg-ice-300"
                    }`}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                {activeStep > 0 && (
                  <Button variant="secondary" size="sm" onClick={() => setActiveStep((prev) => prev - 1)}>
                    Previous
                  </Button>
                )}
                {activeStep < onboardingSteps.length - 1 ? (
                  <Button variant="primary" size="sm" onClick={() => setActiveStep((prev) => prev + 1)}>
                    Next Step
                  </Button>
                ) : (
                  <Link href="/login">
                    <Button variant="primary" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Go to Sign In
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </Card>
        </section>

        {/* 3 Core Value Pillars */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 space-y-2.5 bg-white border-ice-200">
            <div className="w-9 h-9 rounded-ctl bg-ice-100 flex items-center justify-center text-teal-700">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg text-ink-800">Save 15–25% on Staples</h3>
            <p className="text-xs text-ink-600 leading-relaxed">
              No venture capital app commissions or dark-store overheads. You pay direct wholesale prices agreed upon with local merchants.
            </p>
          </Card>

          <Card className="p-5 space-y-2.5 bg-white border-ice-200">
            <div className="w-9 h-9 rounded-ctl bg-ice-100 flex items-center justify-center text-teal-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg text-ink-800">Fair Mathematical Split</h3>
            <p className="text-xs text-ink-600 leading-relaxed">
              Discounts are distributed proportionately to item value, and single-trip delivery is shared fairly. Every paisa is tracked.
            </p>
          </Card>

          <Card className="p-5 space-y-2.5 bg-white border-ice-200">
            <div className="w-9 h-9 rounded-ctl bg-ice-100 flex items-center justify-center text-teal-700">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg text-ink-800">Greener Neighbourhoods</h3>
            <p className="text-xs text-ink-600 leading-relaxed">
              One organized monthly delivery replaces dozens of noisy delivery bikes, lowering society congestion and unnecessary packaging waste.
            </p>
          </Card>
        </section>

        {/* Quick Demo Workspace Access (For Review / Testing) */}
        <section className="pt-4 border-t border-ice-200">
          <Card padding="sm" className="bg-white border-ice-200 space-y-3">
            <div className="flex items-center justify-between border-b border-ice-100 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-700" />
                <span className="text-xs font-bold text-ink-800">Evaluation Demo Workspaces</span>
              </div>
              <span className="text-[10px] text-teal-700 font-semibold uppercase tracking-wider">
                Instant Access
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <Link
                href="/customer"
                className="p-2.5 rounded-ctl border border-ice-200 hover:border-teal-700 hover:bg-ice-50 transition-colors block"
              >
                <b className="block text-ink-800">Resident Workspace</b>
                <span className="text-[11px] text-ink-500">Asha Rao · Flat A-101</span>
              </Link>
              <Link
                href="/retailer"
                className="p-2.5 rounded-ctl border border-ice-200 hover:border-teal-700 hover:bg-ice-50 transition-colors block"
              >
                <b className="block text-ink-800">Retailer Portal</b>
                <span className="text-[11px] text-ink-500">Ravi · Sri Lakshmi Stores</span>
              </Link>
              <Link
                href="/admin"
                className="p-2.5 rounded-ctl border border-ice-200 hover:border-teal-700 hover:bg-ice-50 transition-colors block"
              >
                <b className="block text-ink-800">Building Admin</b>
                <span className="text-[11px] text-ink-500">Meera · Green Meadows</span>
              </Link>
              <Link
                href="/platform"
                className="p-2.5 rounded-ctl border border-ice-200 hover:border-teal-700 hover:bg-ice-50 transition-colors block"
              >
                <b className="block text-ink-800">Platform Admin</b>
                <span className="text-[11px] text-ink-500">Priya · Store Moderation</span>
              </Link>
            </div>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-ice-200 bg-white py-6 mt-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-500">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span>PACT · Hyperlocal Community Grocery Buying Protocol</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-teal-700 font-semibold transition-colors">
              Sign In
            </Link>
            <Link href="/onboarding" className="hover:text-teal-700 font-semibold transition-colors">
              Register Community
            </Link>
            <Link href="/styleguide" className="hover:text-teal-700 font-semibold transition-colors">
              UI Kit & Tokens
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
