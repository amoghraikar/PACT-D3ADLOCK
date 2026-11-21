"use client";

import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { CustomerBottomNav } from "@/components/CustomerBottomNav";
import { usePact } from "@/context/PactContext";
import {
  Clock,
  ListOrdered,
  ShoppingBag,
  Mic,
  Package,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";

export default function CustomerHome() {
  const { currentUser, totalCartCount, totalEstimatedAmount, isPaid } = usePact();

  return (
    <div className="min-h-screen pb-24 bg-[#F3F8FB]">
      <AppHeader />

      <main className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* User Greeting */}
        <div className="space-y-0.5">
          <h1 className="h-display text-2xl text-[#2E201F]">
            Good evening, {currentUser.name.split(" ")[0]}
          </h1>
          <p className="text-xs text-[#6A5452]">
            Flat {currentUser.flat} · {currentUser.apartment}
          </p>
        </div>

        {/* Monthly Cycle Timeline */}
        <div className="card space-y-3">
          <div className="timeline">
            <div className="st now">
              <div className="dot">
                <ListOrdered className="w-3.5 h-3.5 text-white" />
              </div>
              Add items
            </div>
            <div className="st">
              <div className="dot"></div>
              Sent
            </div>
            <div className="st">
              <div className="dot"></div>
              Packed
            </div>
            <div className={`st ${isPaid ? "done" : ""}`}>
              <div className="dot">
                {isPaid && <Check className="w-3 h-3 text-white" />}
              </div>
              Pay
            </div>
            <div className="st">
              <div className="dot"></div>
              Delivered
            </div>
          </div>
          <p className="text-xs text-[#6A5452] leading-relaxed">
            Monthly cycle is open. On 25 Nov midnight, PACT consolidates your building's order for Sri Lakshmi Stores.
          </p>
        </div>

        {/* Hero Card: Groceries Closing Soon */}
        <div className="hero space-y-3.5 p-5">
          <div className="flex justify-between items-center">
            <span className="h-title text-base font-serif font-bold text-[#432F2E]">
              This month's groceries
            </span>
            <span className="pill pill-warning text-xs bg-white">
              <Clock className="w-3.5 h-3.5 text-[#8A3A00]" /> Closes in 3 days
            </span>
          </div>

          <p className="text-xs text-[#432F2E] leading-relaxed">
            You currently have <strong>{totalCartCount} items</strong> in your monthly contribution (about ₹{totalEstimatedAmount}).
          </p>

          <div className="flex gap-2">
            <Link href="/customer/shop" className="btn btn-primary flex-1 text-sm">
              <ShoppingBag className="w-4 h-4 mr-1" />
              Browse Shop
            </Link>
            <Link href="/customer/speak" className="btn btn-secondary text-sm">
              <Mic className="w-4 h-4 mr-1 text-[#2A5C79]" />
              Speak
            </Link>
          </div>
        </div>

        {/* Voice Ordering Banner */}
        <Link
          href="/customer/speak"
          className="card p-4 flex items-center justify-between bg-gradient-to-r from-[#FFF7DB] to-white border-[#EFDB93] hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FEEFB8] flex items-center justify-center text-[#432F2E]">
              <Mic className="w-5 h-5 text-[#2A5C79]" />
            </div>
            <div>
              <b className="text-sm text-[#432F2E] block">Speak your groceries</b>
              <span className="text-xs text-[#6A5452]">Order in English or Hindi (“पाँच किलो चावल...”)</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#6A5452]" />
        </Link>

        {/* Building Community Summary */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E4EEF5]">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[#2A5C79]" />
              <b className="text-sm text-[#432F2E]">Our building this month</b>
            </div>
            <span className="text-xs font-semibold text-[#1B6B45]">Negotiated 10% Off</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[#F3F8FB] p-2.5 rounded-[12px] border border-[#E4EEF5]">
              <span className="text-[#6A5452] block text-[11px]">Participating Flats:</span>
              <b className="text-sm text-[#432F2E]">4 neighbours</b>
            </div>
            <div className="bg-[#F3F8FB] p-2.5 rounded-[12px] border border-[#E4EEF5]">
              <span className="text-[#6A5452] block text-[11px]">Total Cart Items:</span>
              <b className="text-sm text-[#432F2E]">12 products</b>
            </div>
          </div>

          <p className="text-[11px] text-[#7A6462]">
            Store identity stays unified. You only see your own items and your fair proportional bill share.
          </p>
        </div>

        {/* Active Bill Shortcut */}
        <Link
          href="/customer/bill"
          className="card p-4 flex items-center justify-between hover:border-[#432F2E] transition-all"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#432F2E]">November 2026 Bill</span>
              <span className={`pill text-[10px] h-5 py-0 px-2 ${isPaid ? "pill-success" : "pill-neutral"}`}>
                {isPaid ? "Paid" : "To pay · ₹720"}
              </span>
            </div>
            <p className="text-xs text-[#6A5452] mt-0.5">
              {isPaid ? "Verified receipt GM-2611-001" : "Proportional bill ready for payment"}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#2A5C79]" />
        </Link>
      </main>

      <CustomerBottomNav />
    </div>
  );
}
