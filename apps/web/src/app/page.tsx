"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Logo, Card, Button } from "@/components/ui";
import { copy } from "@/lib/copy/en";
import Link from "next/link";
import { ArrowRight, Building2, Store, Truck } from "lucide-react";

export default function RootPage() {
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
    <div className="min-h-screen bg-ice-50 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-[500px] space-y-8 text-center">
        {/* Brand Hero on ice-200 with stripe band per U1 / U8 */}
        <div className="bg-ice-200 border border-ice-300 rounded-card p-8 sm:p-10 relative overflow-hidden shadow-xs">
          <div className="absolute inset-x-0 top-0 h-20 bg-stripes opacity-40 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center">
            <Logo size="lg" />
            <h1 className="font-display text-2xl sm:text-3xl text-ink-800 mt-6 leading-tight">
              {copy.brand.tagline}
            </h1>
            <p className="text-xs sm:text-sm text-ink-600 mt-2 max-w-sm leading-relaxed">
              {copy.brand.subtagline}
            </p>

            <div className="mt-8 w-full max-w-xs">
              <Link href="/login" className="block w-full">
                <Button variant="primary" fullWidth icon={<ArrowRight className="w-4 h-4" />}>
                  Enter PACT (Sign In)
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 3 Value Pillars */}
        <div className="grid grid-cols-3 gap-3 text-left">
          <Card padding="sm" className="space-y-1">
            <Building2 className="w-4 h-4 text-teal-700" />
            <h2 className="text-xs font-bold text-ink-800">One Building</h2>
            <p className="text-[11px] text-ink-600">All neighbours buy on a single monthly cycle.</p>
          </Card>
          <Card padding="sm" className="space-y-1">
            <Store className="w-4 h-4 text-teal-700" />
            <h2 className="text-xs font-bold text-ink-800">Local Wholesale</h2>
            <p className="text-[11px] text-ink-600">Supplied by trusted neighbourhood stores.</p>
          </Card>
          <Card padding="sm" className="space-y-1">
            <Truck className="w-4 h-4 text-teal-700" />
            <h2 className="text-xs font-bold text-ink-800">Fair Split Bill</h2>
            <p className="text-[11px] text-ink-600">Discounts and delivery shared fairly in paise.</p>
          </Card>
        </div>

        {/* Styleguide Link */}
        <div className="pt-2">
          <Link
            href="/styleguide"
            className="text-xs font-semibold text-teal-700 hover:underline"
          >
            Open PACT Styleguide & Design System →
          </Link>
        </div>
      </div>
    </div>
  );
}
