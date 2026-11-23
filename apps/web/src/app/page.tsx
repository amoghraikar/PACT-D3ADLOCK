"use client";

import React, { useEffect, useState } from "react";
import { Logo, Card, StatusPill, Button } from "@/components/ui";
import {
  Server,
  Smartphone,
  Layers,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Terminal,
  Activity,
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
  const [mountedTime, setMountedTime] = useState<string>("Ready");

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
      setMountedTime(new Date().toLocaleTimeString());
      checkApiHealth();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-ice-50 text-ink-800 flex flex-col justify-between px-4 py-8 sm:py-12">
      <div className="w-full max-w-4xl mx-auto space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-ink-800 tracking-tight">
            PACT Collective Commerce
          </h1>
          <p className="text-ink-500 text-lg sm:text-xl max-w-xl mx-auto font-sans leading-relaxed">
            One building · one shared monthly cart · one bulk order · one bill, split fairly.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-ice-200 rounded-full text-xs font-medium text-ink-600 shadow-sm">
            <Activity className="w-3.5 h-3.5 text-teal-700 animate-pulse" />
            <span>Milestone 0 · Platform Initialization</span>
          </div>
        </div>

        {/* System Health Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Backend API Health Card */}
          <Card className="p-6 bg-white border border-ice-200 shadow-sm rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-ice-100 rounded-xl text-teal-700">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-ink-800 font-sans">
                      FastAPI Backend API
                    </h2>
                    <p className="text-xs text-ink-500">REST v1 Service (`/api/v1`)</p>
                  </div>
                </div>
                {apiHealth.status === "online" && (
                  <StatusPill kind="success" label={`Online (${apiHealth.latencyMs}ms)`} />
                )}
                {apiHealth.status === "offline" && <StatusPill kind="danger" label="Offline" />}
                {apiHealth.status === "loading" && <StatusPill kind="neutral" label="Pinging..." />}
              </div>

              <div className="bg-ice-50 p-3 rounded-xl border border-ice-200 text-xs font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-ink-500">Service:</span>
                  <span className="font-medium text-ink-800">
                    {apiHealth.data?.app || "pact-api"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Version:</span>
                  <span className="font-medium text-ink-800">
                    {apiHealth.data?.version || "0.1.0"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Environment:</span>
                  <span className="font-medium text-ink-800">
                    {apiHealth.data?.environment || "development"}
                  </span>
                </div>
                {apiHealth.error && (
                  <div className="text-red-600 pt-1 border-t border-ice-200">{apiHealth.error}</div>
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-ice-100 flex items-center justify-between">
              <a
                href="/docs"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-teal-700 hover:text-teal-800 font-medium inline-flex items-center gap-1"
              >
                Open API Docs (Swagger) <ExternalLink className="w-3 h-3" />
              </a>
              <Button
                variant="quiet"
                size="sm"
                onClick={checkApiHealth}
                className="text-xs flex items-center gap-1 text-ink-500 hover:text-ink-800"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${apiHealth.status === "loading" ? "animate-spin" : ""}`}
                />
                Re-check
              </Button>
            </div>
          </Card>

          {/* Frontend Web & Android Card */}
          <Card className="p-6 bg-white border border-ice-200 shadow-sm rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-ice-100 rounded-xl text-teal-700">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-ink-800 font-sans">
                      Next.js 16 & Capacitor
                    </h2>
                    <p className="text-xs text-ink-500">App Router & Android Shell</p>
                  </div>
                </div>
                <StatusPill kind="success" label="Active" />
              </div>

              <div className="bg-ice-50 p-3 rounded-xl border border-ice-200 text-xs font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-ink-500">Framework:</span>
                  <span className="font-medium text-ink-800">Next.js 16.4.6 (Turbopack)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Mobile Runtime:</span>
                  <span className="font-medium text-ink-800">Capacitor 7.4.4 (Android SDK 36)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Static Export:</span>
                  <span className="font-medium text-ink-800">Ready (`build/` & `dist/`)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Loaded At:</span>
                  <span className="font-medium text-ink-800">{mountedTime || "Now"}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-ice-100 flex items-center justify-between">
              <span className="text-xs text-ink-500">Zero raw hex tokens</span>
              <span className="text-xs font-medium text-teal-700">Client-Side Hydrated</span>
            </div>
          </Card>
        </div>

        {/* Technology Stack & Milestone Checklist */}
        <Card className="p-6 bg-white border border-ice-200 shadow-sm rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-ice-100 pb-3">
            <Layers className="w-5 h-5 text-teal-700" />
            <h3 className="text-base font-bold text-ink-800">Milestone 0 Verification Checklist</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-ink-800">Clean Monorepo Topology:</strong>
                <p className="text-ink-500">
                  `apps/api`, `apps/web`, `infrastructure/`, `docs/`, `scripts/`
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-ink-800">FastAPI Health Endpoints:</strong>
                <p className="text-ink-500">
                  `/` root, `/health` global, and `/api/v1/health` versioned
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-ink-800">Next.js App Router:</strong>
                <p className="text-ink-500">
                  Static export compatibility, ErrorBoundary, Tailwind tokens
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-ink-800">Infrastructure Blueprints:</strong>
                <p className="text-ink-500">
                  Docker Compose (PostgreSQL 16, Kafka) and Render deployment YAML
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-ink-800">Standardized Formatting:</strong>
                <p className="text-ink-500">
                  Ruff (Python), ESLint 9 & Prettier 3 (TypeScript/React)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-ink-800">Strict Separation:</strong>
                <p className="text-ink-500">
                  Zero business functionality yet; ready for Milestone 1
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Commands Banner */}
        <div className="p-4 bg-teal-900 text-ice-50 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-teal-300" />
            <div>
              <p className="text-xs font-bold text-white font-mono">make dev</p>
              <p className="text-xs text-teal-200">
                Start full stack: FastAPI on :8000 · Next.js on :3000
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/amoghraikar/PACT-D3ADLOCK"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-teal-800 hover:bg-teal-700 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              GitHub Repository <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
