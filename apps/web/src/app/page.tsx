"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Logo, Card, StatusPill, Button } from "@/components/ui";
import {
  Users,
  Store,
  Building,
  Shield,
  ArrowRight,
  Server,
  Activity,
  Sparkles,
  ShoppingBag,
  Mic,
  Receipt,
  CheckCircle2,
  Palette,
} from "lucide-react";

interface ApiHealthState {
  status: "idle" | "loading" | "online" | "offline";
  latencyMs?: number;
  data?: {
    app?: string;
    version?: string;
    environment?: string;
    timestamp?: string;
  };
  error?: string;
}

export default function LandingPage() {
  const [apiHealth, setApiHealth] = useState<ApiHealthState>({ status: "loading" });

  const checkApiHealth = async () => {
    setApiHealth((prev) => ({ ...prev, status: "loading" }));
    const startTime = performance.now();
    try {
      const res = await fetch("/api/v1/health");
      const latency = Math.round(performance.now() - startTime);
      if (res.ok) {
        const data = await res.json();
        setApiHealth({
          status: "online",
          latencyMs: latency,
          data,
        });
      } else {
        setApiHealth({
          status: "offline",
          latencyMs: latency,
          error: `HTTP ${res.status}: ${res.statusText}`,
        });
      }
    } catch (err: any) {
      setApiHealth({
        status: "offline",
        error: err?.message || "Failed to connect to backend",
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      checkApiHealth();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-background text-text flex flex-col justify-between px-4 py-8 sm:py-12">
      <div className="w-full max-w-5xl mx-auto space-y-10">
        {/* Navigation Bar */}
        <header className="flex items-center justify-between py-2 border-b border-border">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <span className="font-serif text-xl font-bold tracking-tight text-text">PACT</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/styleguide"
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-text px-2.5 py-1.5 rounded-pill border border-border bg-surface"
            >
              <Palette className="w-3.5 h-3.5 text-primary" />
              <span>Design System</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-xs font-semibold px-4 py-2 rounded-pill bg-primary text-white hover:bg-primary-hover shadow-sm"
            >
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <div className="text-center space-y-4 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface border border-border rounded-pill text-xs font-medium text-muted shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Pantry Collective Commerce Platform</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-6xl font-bold text-text tracking-tight max-w-3xl mx-auto">
            One Building. One Shared Cart. Fairly Split Bills.
          </h1>
          <p className="text-muted text-base sm:text-xl max-w-2xl mx-auto font-sans leading-relaxed">
            Apartment residents aggregate monthly grocery orders into wholesale bulk deliveries from trusted local merchants, powered by deterministic F7 fair-split billing.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link
              href="/login"
              className="px-6 py-3 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-hover shadow transition-transform active:scale-95 inline-flex items-center gap-2"
            >
              <span>Launch App Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/onboarding"
              className="px-6 py-3 bg-surface border border-border text-text text-sm font-semibold rounded-pill hover:bg-background transition-colors inline-flex items-center gap-2"
            >
              <span>Join Your Community</span>
            </Link>
          </div>
        </div>

        {/* The 4 Role Portals */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted">
              Role Workspaces & Dashboards
            </h2>
            <span className="text-xs text-muted">Protected with role authentication</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Customer Portal */}
            <Card className="p-5 flex flex-col justify-between hover:border-primary transition-colors group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-card bg-surface border border-border flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-text text-base">Resident Customer</h3>
                  <p className="text-xs text-muted mt-1 leading-normal">
                    Browse catalogue, add to collective cart, order with voice, and settle fair-split invoices.
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-border mt-4">
                <Link
                  href="/customer"
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  Enter Resident Portal <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>

            {/* Retailer Portal */}
            <Card className="p-5 flex flex-col justify-between hover:border-primary transition-colors group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-card bg-surface border border-border flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-text text-base">Kirana Retailer</h3>
                  <p className="text-xs text-muted mt-1 leading-normal">
                    Fulfill community bulk orders, adjust packed inventory, preview bills, and dispatch deliveries.
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-border mt-4">
                <Link
                  href="/retailer"
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  Enter Retailer Portal <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>

            {/* Apartment Admin Portal */}
            <Card className="p-5 flex flex-col justify-between hover:border-primary transition-colors group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-card bg-surface border border-border flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-text text-base">Apartment Admin</h3>
                  <p className="text-xs text-muted mt-1 leading-normal">
                    Track building participation, collection rates, trigger payment reminders, and confirm handovers.
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-border mt-4">
                <Link
                  href="/admin"
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  Enter Admin Portal <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>

            {/* Platform Admin Portal */}
            <Card className="p-5 flex flex-col justify-between hover:border-primary transition-colors group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-card bg-surface border border-border flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-text text-base">Platform Admin</h3>
                  <p className="text-xs text-muted mt-1 leading-normal">
                    Manage all communities, merchant retailers, mappings, platform GMV analytics, and audit logs.
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-border mt-4">
                <Link
                  href="/platform"
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  Enter Platform Portal <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>
          </div>
        </div>

        {/* System & Architecture Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Backend API Health Card */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-text">FastAPI Backend Service</h3>
              </div>
              {apiHealth.status === "online" && (
                <StatusPill status="OPEN">{`Online (${apiHealth.latencyMs}ms)`}</StatusPill>
              )}
              {apiHealth.status === "offline" && (
                <StatusPill status="REJECTED">Offline</StatusPill>
              )}
              {apiHealth.status === "loading" && (
                <StatusPill status="PROCESSING">Checking...</StatusPill>
              )}
            </div>

            <div className="p-3 bg-background rounded-card border border-border text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-muted">Status:</span>
                <span className="font-semibold text-text">{apiHealth.status.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Environment:</span>
                <span className="text-text">{apiHealth.data?.environment || "development"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Service:</span>
                <span className="text-text">{apiHealth.data?.app || "pact-api"}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href="/docs"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                FastAPI Swagger Docs
              </a>
              <Button
                variant="outline"
                size="sm"
                onClick={checkApiHealth}
                isLoading={apiHealth.status === "loading"}
              >
                Re-check API
              </Button>
            </div>
          </Card>

          {/* Core Business Invariants */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-text">Core System Invariants</h3>
            </div>
            <ul className="text-xs text-muted space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span><strong>F7 Invariant:</strong> Sum of resident invoices mathematically equals retailer bill (zero discrepancy).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span><strong>Integer Paise:</strong> All financial arithmetic executed strictly in integer paise.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span><strong>Privacy Shield:</strong> Demand aggregated collectively without exposing private resident baskets.</span>
              </li>
            </ul>
          </Card>
        </div>

        {/* Footer */}
        <footer className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between text-xs text-muted gap-4">
          <p>© 2026 PACT Collective Commerce Platform. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/styleguide" className="hover:text-text">
              Styleguide
            </Link>
            <Link href="/login" className="hover:text-text">
              Sign In
            </Link>
            <Link href="/onboarding" className="hover:text-text">
              Onboarding
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
