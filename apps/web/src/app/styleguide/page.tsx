"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { HeaderNav } from "@/components/HeaderNav";
import {
  Check,
  Clock,
  AlertTriangle,
  Package,
  Truck,
  Plus,
  Minus,
  Trash2,
  Mic,
  Info,
  KeyRound,
  ShoppingBag,
} from "lucide-react";

export default function Styleguide() {
  const [stepperVal, setStepperVal] = useState(2);
  const [micState, setMicState] = useState<"idle" | "live" | "error">("idle");
  const [segMode, setSegMode] = useState<"type" | "speak">("type");

  return (
    <div className="min-h-screen bg-[#F3F8FB] flex flex-col">
      <HeaderNav />

      {/* Header Banner */}
      <section className="bg-[#C4DAE8] relative py-8 px-6 border-b border-[#B3CEDE]">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#2A5C79]">
              PACT Design System · Section U
            </span>
            <h1 className="text-3xl font-serif text-[#2E201F]">Blue, Butter, Chocopie</h1>
            <p className="text-sm text-[#6A5452] mt-1 max-w-2xl">
              Three core tokens. Blue is calm structure, Butter is highlight, Chocopie is ink and action. Every component is accessible, verb-driven, and contains zero raw hex values in code.
            </p>
          </div>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/pact-logo-lockup.png"
              alt="PACT"
              style={{ height: "40px", width: "auto" }}
              className="h-10 w-auto object-contain"
            />
          </div>
        </div>
      </section>

      <main className="max-w-6xl w-full mx-auto p-6 space-y-12">
        {/* Trio Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 rounded-[16px] overflow-hidden border border-[#B3CEDE] text-center shadow-sm">
          <div className="p-6 bg-[#C4DAE8] text-[#432F2E]">
            <b className="block font-serif text-2xl">Blue</b>
            <span className="text-xs">#C4DAE8 · Top bar, structure</span>
          </div>
          <div className="p-6 bg-[#FEEFB8] text-[#432F2E]">
            <b className="block font-serif text-2xl">Butter</b>
            <span className="text-xs">#FEEFB8 · Spotlight, action highlight</span>
          </div>
          <div className="p-6 bg-[#432F2E] text-[#FEEFB8]">
            <b className="block font-serif text-2xl">Chocopie</b>
            <span className="text-xs">#432F2E · Ink, text, buttons</span>
          </div>
        </div>

        {/* Color Palette Grid */}
        <section className="space-y-4">
          <h2 className="text-xl font-serif text-[#2E201F]">1. Colour Tokens (U2)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs">
            <div className="card p-2 text-center space-y-1">
              <div className="h-10 rounded-[8px] bg-[#2E201F]" />
              <b className="block">ink-900</b>
              <span className="text-gray-400">#2E201F</span>
            </div>
            <div className="card p-2 text-center space-y-1">
              <div className="h-10 rounded-[8px] bg-[#432F2E]" />
              <b className="block">ink-800</b>
              <span className="text-gray-400">#432F2E</span>
            </div>
            <div className="card p-2 text-center space-y-1">
              <div className="h-10 rounded-[8px] bg-[#C4DAE8]" />
              <b className="block">ice-200</b>
              <span className="text-gray-400">#C4DAE8</span>
            </div>
            <div className="card p-2 text-center space-y-1">
              <div className="h-10 rounded-[8px] bg-[#FEEFB8]" />
              <b className="block">butter-200</b>
              <span className="text-gray-400">#FEEFB8</span>
            </div>
            <div className="card p-2 text-center space-y-1">
              <div className="h-10 rounded-[8px] bg-[#2A5C79]" />
              <b className="block text-[#2A5C79]">accent-700</b>
              <span className="text-gray-400">#2A5C79</span>
            </div>
            <div className="card p-2 text-center space-y-1">
              <div className="h-10 rounded-[8px] bg-[#1B6B45]" />
              <b className="block text-[#1B6B45]">success-700</b>
              <span className="text-gray-400">#1B6B45</span>
            </div>
          </div>
        </section>

        {/* UI Kit Components Grid */}
        <section className="space-y-4">
          <h2 className="text-xl font-serif text-[#2E201F]">2. Interactive UI Kit (U5)</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Buttons Card */}
            <div className="card p-5 space-y-3">
              <h3 className="font-serif font-bold text-sm text-[#432F2E]">Buttons (Verbs)</h3>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-primary md">Primary Verb</button>
                <button className="btn btn-secondary md">Secondary</button>
                <button className="btn btn-quiet md">Quiet Link</button>
                <button className="btn btn-danger md">Danger</button>
              </div>
              <p className="text-[11px] text-[#7A6462]">
                One primary verb per screen. Buttons are verbs, never nouns.
              </p>
            </div>

            {/* Status Pills */}
            <div className="card p-5 space-y-3">
              <h3 className="font-serif font-bold text-sm text-[#432F2E]">Status Pills</h3>
              <div className="flex flex-wrap gap-2">
                <span className="pill pill-neutral"><Clock className="w-3 h-3" /> To pay</span>
                <span className="pill pill-success"><Check className="w-3 h-3" /> Paid</span>
                <span className="pill pill-info"><Package className="w-3 h-3" /> Ready to deliver</span>
                <span className="pill pill-info"><Truck className="w-3 h-3" /> On the way</span>
                <span className="pill pill-warning"><AlertTriangle className="w-3 h-3" /> Closes in 3 days</span>
                <span className="pill pill-danger"><AlertTriangle className="w-3 h-3" /> Didn&apos;t go through</span>
              </div>
              <p className="text-[11px] text-[#7A6462]">
                Status is always an icon, a word, and a semantic tone together.
              </p>
            </div>

            {/* Steppers & Chips */}
            <div className="card p-5 space-y-3">
              <h3 className="font-serif font-bold text-sm text-[#432F2E]">Choosing & Counting</h3>
              <div className="flex items-center gap-3">
                <div className="stepper">
                  <button onClick={() => setStepperVal(Math.max(0, stepperVal - 1))}>
                    {stepperVal <= 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                  </button>
                  <span>{stepperVal}</span>
                  <button onClick={() => setStepperVal(stepperVal + 1)}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <span className="chip on text-xs">Rice & Grains</span>
                <span className="chip text-xs">Atta</span>
              </div>

              <div className="seg">
                <span
                  onClick={() => setSegMode("type")}
                  className={segMode === "type" ? "on" : ""}
                >
                  <KeyRound className="w-3.5 h-3.5" /> Type
                </span>
                <span
                  onClick={() => setSegMode("speak")}
                  className={segMode === "speak" ? "on" : ""}
                >
                  <Mic className="w-3.5 h-3.5" /> Speak
                </span>
              </div>
            </div>

            {/* Banners & Messages */}
            <div className="card p-5 space-y-3 md:col-span-2">
              <h3 className="font-serif font-bold text-sm text-[#432F2E]">Banners & Feedback</h3>
              <div className="space-y-2">
                <div className="banner warning text-xs">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>Ordering closes on 24 Nov at midnight. 3 days left to edit your groceries.</span>
                </div>
                <div className="banner info text-xs">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>Offline cache active. Your list is preserved locally and syncs automatically.</span>
                </div>
                <div className="banner danger text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Your payment did not go through. You have not been charged. <b>Try again</b></span>
                </div>
                <div className="toast text-xs">
                  <span className="flex-1">Removed Ragi Flour 1 kg</span>
                  <b>Undo</b>
                </div>
              </div>
            </div>

            {/* Microphone Interaction */}
            <div className="card p-5 space-y-3 text-center">
              <h3 className="font-serif font-bold text-sm text-[#432F2E]">Mic Component</h3>
              <div className="flex justify-center gap-4 py-2">
                <button
                  onClick={() => setMicState("live")}
                  className={`mic w-14 h-14 ${micState === "live" ? "live animate-pulse" : ""}`}
                >
                  <Mic className="w-6 h-6" />
                </button>
              </div>
              <span className="text-xs text-[#6A5452] block">
                {micState === "live" ? "Listening… click to stop" : "Click mic to test pulsing recording state"}
              </span>
            </div>
          </div>
        </section>

        {/* Golden Scenario Walkthrough */}
        <section className="card p-6 bg-[#E4EEF5] border-[#B3CEDE] space-y-3">
          <h3 className="font-serif font-bold text-lg text-[#2E201F]">The Golden Scenario (Section G)</h3>
          <p className="text-xs text-[#6A5452]">
            The exact figures used across all customer, store, and admin screens:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded-[8px] border border-[#B3CEDE]">
              <span className="text-gray-400 block">Asha (A-101)</span>
              <b className="text-base text-[#432F2E]">₹720</b>
              <span className="text-[10px] text-green-700 block">Rice, Sugar, Oil, Dal</span>
            </div>
            <div className="bg-white p-3 rounded-[8px] border border-[#B3CEDE]">
              <span className="text-gray-400 block">Bharat (B-204)</span>
              <b className="text-base text-[#432F2E]">₹540</b>
              <span className="text-[10px] text-green-700 block">Rice 10 kg</span>
            </div>
            <div className="bg-white p-3 rounded-[8px] border border-[#B3CEDE]">
              <span className="text-gray-400 block">Chitra (C-305)</span>
              <b className="text-base text-[#432F2E]">₹360</b>
              <span className="text-[10px] text-[#8A3A00] block">Awaiting payment</span>
            </div>
            <div className="bg-white p-3 rounded-[8px] border border-[#B3CEDE]">
              <span className="text-gray-400 block">Dev (D-402)</span>
              <b className="text-base text-[#432F2E]">₹630</b>
              <span className="text-[10px] text-green-700 block">Paid & delivering</span>
            </div>
          </div>
          <div className="text-right text-xs font-bold text-[#432F2E] pt-1">
            Total Community Order: ₹2,250 (Full bulk discount: ₹250)
          </div>
        </section>
      </main>
    </div>
  );
}
