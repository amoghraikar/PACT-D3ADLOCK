"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Logo, Button } from "@/components/ui";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
    <div className="min-h-screen bg-ice-50 text-ink-800 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-sm mx-auto text-center space-y-8">
        {/* PACT Logo */}
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>

        {/* Title & Tagline */}
        <div className="space-y-2">
          <h1 className="font-display text-4xl font-extrabold text-ink-800 tracking-tight">
            PACT
          </h1>
          <p className="text-base sm:text-lg font-semibold text-teal-700 tracking-normal">
            Buy together, better together
          </p>
        </div>

        {/* Register Action & Sign In Link */}
        <div className="pt-2 space-y-4">
          <Link href="/login?tab=register" className="block w-full">
            <Button
              variant="primary"
              size="default"
              fullWidth
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Register
            </Button>
          </Link>

          <p className="text-sm text-ink-600">
            Already have an account?{" "}
            <Link
              href="/login?tab=signin"
              className="font-bold text-teal-700 hover:text-teal-800 hover:underline transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
