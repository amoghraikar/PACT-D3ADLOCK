"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { HeaderNav } from "@/components/HeaderNav";
import { apiClient, ApiError } from "@/lib/api";
import {
  ShoppingBag,
  Store,
  Building2,
  Palette,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Users,
  Mic,
  Split,
  Truck,
  Activity,
} from "lucide-react";

interface HealthStatus {
  status: string;
  database: string;
  timestamp: string;
}

export default function Home() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    apiClient<HealthStatus>("/api/v1/health")
      .then((data) => {
        setHealth(data);
      })
      .catch((err) => {
        console.warn("Backend not running or offline:", err);
      })
      .finally(() => {
        setHealthLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#F3F8FB] text-[#432F2E] flex flex-col">
      <HeaderNav />

      {/* Hero Banner */}
      <section className="bg-[#C4DAE8] relative pt-12 pb-16 px-6 border-b border-[#B3CEDE]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <span className="inline-flex items-center gap-2 bg-[#FEEFB8] text-[#432F2E] text-xs font-bold px-3 py-1 rounded-full border border-[#EFDB93] uppercase tracking-wider">
              Hackathon Demo Presentation
            </span>
            <h1 className="text-4xl sm:text-5xl font-serif text-[#2E201F] leading-tight">
              Collective Commerce. Connected Communities.
            </h1>
            <p className="text-lg text-[#6A5452] leading-relaxed">
              One building · one shared monthly cart · one bulk order · one bill, split fairly. PACT empowers apartment communities to negotiate local retail pricing together without individual checkout friction.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/customer" className="btn btn-primary">
                <ShoppingBag className="w-5 h-5 mr-1" />
                Launch Resident App
              </Link>
              <Link href="/retailer" className="btn btn-secondary">
                <Store className="w-5 h-5 mr-1" />
                Store Workspace
              </Link>
              <Link href="/styleguide" className="btn btn-quiet">
                <Palette className="w-5 h-5 mr-1" />
                Design Tokens
              </Link>
            </div>
          </div>

          <div className="w-full max-w-[280px] bg-white p-6 rounded-[16px] border border-[#B3CEDE] shadow-md space-y-4 text-center">
            <div className="w-24 h-24 mx-auto relative">
              <Image
                src="/brand/pact-mark.png"
                alt="PACT Mark"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div>
              <div className="font-bold text-lg text-[#432F2E]">Green Meadows</div>
              <div className="text-sm text-[#6A5452]">Golden Scenario Demo</div>
            </div>
            <div className="bg-[#F3F8FB] p-3 rounded-[12px] text-xs text-left space-y-1.5 border border-[#E4EEF5]">
              <div className="flex justify-between">
                <span className="text-[#6A5452]">Cycle:</span>
                <span className="font-semibold text-[#432F2E]">Nov 2026</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6A5452]">Store:</span>
                <span className="font-semibold text-[#432F2E]">Sri Lakshmi Stores</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6A5452]">Apartments:</span>
                <span className="font-semibold text-[#432F2E]">4 active (A, B, C, D)</span>
              </div>
              <div className="flex justify-between border-t border-[#B3CEDE] pt-1">
                <span className="text-[#6A5452]">Wholesale Bill:</span>
                <span className="font-bold text-[#1B6B45]">₹2,250 (saved ₹250)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Main Workspace Cards */}
      <main className="max-w-6xl mx-auto px-6 py-12 flex-1 space-y-12">
        <div>
          <h2 className="text-2xl font-serif text-[#2E201F] mb-2">Explore Workspaces for Judges</h2>
          <p className="text-[#6A5452] text-sm max-w-2xl">
            PACT unites three distinct stakeholders into one harmonious monthly loop. Click any workspace below to experience the live implementation:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Customer */}
          <div className="card hover:shadow-lg transition-all flex flex-col justify-between border-2 border-[#B3CEDE] hover:border-[#432F2E]">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#FEEFB8] flex items-center justify-center text-[#432F2E]">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#2A5C79] uppercase tracking-wider">Stakeholder 1</span>
                <h3 className="text-xl font-serif font-bold text-[#2E201F]">Resident App</h3>
                <p className="text-xs text-[#6A5452]">Asha · Flat A-101 · Green Meadows</p>
              </div>
              <ul className="text-xs text-[#6A5452] space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1B6B45] flex-shrink-0" />
                  <span>One-tap or voice grocery ordering (Hindi & English)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1B6B45] flex-shrink-0" />
                  <span>Anonymous community cart totals</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1B6B45] flex-shrink-0" />
                  <span>Splitwise-style proportional bill (₹720)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1B6B45] flex-shrink-0" />
                  <span>Instant payment with instant receipt GM-2611-001</span>
                </li>
              </ul>
            </div>
            <Link href="/customer" className="btn btn-primary block text-center mt-6">
              Open Resident App <ArrowRight className="w-4 h-4 inline ml-1" />
            </Link>
          </div>

          {/* Card 2: Retailer */}
          <div className="card hover:shadow-lg transition-all flex flex-col justify-between border-2 border-[#B3CEDE] hover:border-[#432F2E]">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#E4EEF5] flex items-center justify-center text-[#2A5C79]">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#2A5C79] uppercase tracking-wider">Stakeholder 2</span>
                <h3 className="text-xl font-serif font-bold text-[#2E201F]">Retailer Workspace</h3>
                <p className="text-xs text-[#6A5452]">Ravi · Sri Lakshmi Stores</p>
              </div>
              <ul className="text-xs text-[#6A5452] space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1B6B45] flex-shrink-0" />
                  <span>Single bulk order review and acceptance</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1B6B45] flex-shrink-0" />
                  <span>Interactive packing wizard (by item / by customer)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1B6B45] flex-shrink-0" />
                  <span>Live bill split preview adding up to exact total (₹2,250)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1B6B45] flex-shrink-0" />
                  <span>Collection tracker: ₹1,890 of ₹2,250 (84%)</span>
                </li>
              </ul>
            </div>
            <Link href="/retailer" className="btn btn-primary block text-center mt-6">
              Open Store Portal <ArrowRight className="w-4 h-4 inline ml-1" />
            </Link>
          </div>

          {/* Card 3: Admin */}
          <div className="card hover:shadow-lg transition-all flex flex-col justify-between border-2 border-[#B3CEDE] hover:border-[#432F2E]">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#FFF7DB] flex items-center justify-center text-[#8A3A00]">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#2A5C79] uppercase tracking-wider">Stakeholder 3</span>
                <h3 className="text-xl font-serif font-bold text-[#2E201F]">Building Coordinator</h3>
                <p className="text-xs text-[#6A5452]">Meera · Green Meadows Apartments</p>
              </div>
              <ul className="text-xs text-[#6A5452] space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1B6B45] flex-shrink-0" />
                  <span>Doorstep delivery management (Paid residents only)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1B6B45] flex-shrink-0" />
                  <span>Status progression: Ready → Out for Delivery → Delivered</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1B6B45] flex-shrink-0" />
                  <span>One-click payment reminder for unpaid flats (Chitra C-305)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1B6B45] flex-shrink-0" />
                  <span>Admins never mark anything as paid (Gateway verified)</span>
                </li>
              </ul>
            </div>
            <Link href="/admin" className="btn btn-primary block text-center mt-6">
              Open Admin Portal <ArrowRight className="w-4 h-4 inline ml-1" />
            </Link>
          </div>
        </div>

        {/* The Monthly Loop Diagram */}
        <section className="card p-8 bg-[#E4EEF5] border border-[#B3CEDE] space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2A5C79]">Core Architecture</span>
            <h3 className="text-2xl font-serif text-[#2E201F]">The 30-Day Collective Commerce Loop</h3>
            <p className="text-sm text-[#6A5452]">
              Three distinct data records that are never collapsed into one:
              <br />
              <strong>Customer Contribution</strong> → <strong>Shared Cart</strong> → <strong>Bulk Order</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="bg-white p-4 rounded-[12px] border border-[#B3CEDE]">
              <div className="font-bold text-sm text-[#8A3A00] mb-1">1st — 24th</div>
              <div className="font-semibold text-sm text-[#432F2E]">Residents Contribute</div>
              <p className="text-xs text-[#6A5452] mt-1">Add, edit, remove groceries typing or voice. Instant auto-save.</p>
            </div>
            <div className="bg-white p-4 rounded-[12px] border border-[#B3CEDE]">
              <div className="font-bold text-sm text-[#2A5C79] mb-1">25th Midnight</div>
              <div className="font-semibold text-sm text-[#432F2E]">PACT Cart Cutoff</div>
              <p className="text-xs text-[#6A5452] mt-1">Freezes cart, generates immutable single bulk order snapshot.</p>
            </div>
            <div className="bg-white p-4 rounded-[12px] border border-[#B3CEDE]">
              <div className="font-bold text-sm text-[#1B6B45] mb-1">26th — 27th</div>
              <div className="font-semibold text-sm text-[#432F2E]">Retailer Packs & Bills</div>
              <p className="text-xs text-[#6A5452] mt-1">Ravi packs actual stock, applies ₹250 discount, generates final invoice.</p>
            </div>
            <div className="bg-white p-4 rounded-[12px] border border-[#B3CEDE]">
              <div className="font-bold text-sm text-[#432F2E] mb-1">Post-Bill</div>
              <div className="font-semibold text-sm text-[#432F2E]">Split & Doorstep Delivery</div>
              <p className="text-xs text-[#6A5452] mt-1">Proportional split. Residents pay. Meera delivers only to paid flats.</p>
            </div>
          </div>
        </section>

        {/* Live Backend Connection Status */}
        <div className="flex items-center justify-between p-4 bg-white rounded-[12px] border border-[#B3CEDE] text-xs text-[#6A5452]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#2A5C79]" />
            <span>FastAPI Backend Health:</span>
            {healthLoading ? (
              <span className="text-gray-400">Pinging...</span>
            ) : health ? (
              <span className="text-[#1B6B45] font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#1B6B45] inline-block animate-pulse"></span>
                Connected ({health.database})
              </span>
            ) : (
              <span className="text-[#8A3A00]">
                Running in Offline Standalone Mode (API offline)
              </span>
            )}
          </div>
          <div>
            <Link href="/styleguide" className="text-[#2A5C79] hover:underline font-medium">
              View Design Tokens & Styleguide →
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#B3CEDE] py-6 px-6 text-center text-xs text-[#6A5452]">
        PACT · Collective Commerce Platform for Apartment Communities · Hackathon Demo 2026
      </footer>
    </div>
  );
}
