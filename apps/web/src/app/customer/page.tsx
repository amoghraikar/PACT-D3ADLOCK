"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { HeaderNav } from "@/components/HeaderNav";
import {
  Home as HomeIcon,
  ShoppingBag,
  ListOrdered,
  Receipt,
  Bell,
  Search,
  Mic,
  Plus,
  Minus,
  Trash2,
  Check,
  Clock,
  Truck,
  Package,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Sparkles,
  Volume2,
} from "lucide-react";

export default function CustomerApp() {
  // Navigation inside the phone
  // 1: signin, 2: choose, 3: home, 4: shop, 5: mylist, 6: speak, 7: mybill, 8: paid
  const [screen, setScreen] = useState<number>(3); // start at Home for judge demonstration

  // State for shopping cart / list
  const [cart, setCart] = useState<{ [id: string]: number }>({
    rice: 1, // Sona Masoori Rice 5kg (₹300)
    sugar: 2, // Sugar 1kg (₹75 x 2 = ₹150)
    oil: 1, // Sunflower Oil 1L (₹250)
    dal: 1, // Toor Dal 500g (₹100)
  });

  const [activeCategory, setActiveCategory] = useState<string>("Rice & Grains");
  const [voiceLanguage, setVoiceLanguage] = useState<"en" | "hi">("en");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [showCalculation, setShowCalculation] = useState<boolean>(false);
  const [activeBottomNav, setActiveBottomNav] = useState<"home" | "shop" | "list" | "bills">("home");

  // Quantity helpers
  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const estimatedTotal = (cart.rice || 0) * 300 + (cart.sugar || 0) * 75 + (cart.oil || 0) * 250 + (cart.dal || 0) * 100;

  return (
    <div className="min-h-screen bg-[#F3F8FB] flex flex-col">
      <HeaderNav />

      {/* Screen Selection Bar for Judges */}
      <div className="bg-[#E4EEF5] border-b border-[#B3CEDE] py-2 px-4 overflow-x-auto">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-[#432F2E] whitespace-nowrap">
            Judge Screen Selector:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 1, label: "1. Sign-in" },
              { id: 2, label: "2. Choose Mode" },
              { id: 3, label: "3. Home" },
              { id: 4, label: "4. Shop" },
              { id: 5, label: "5. My List" },
              { id: 6, label: "6. Speak (Voice)" },
              { id: 7, label: "7. My Bill" },
              { id: 8, label: "8. Paid Receipt" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setScreen(s.id);
                  if (s.id === 3) setActiveBottomNav("home");
                  if (s.id === 4) setActiveBottomNav("shop");
                  if (s.id === 5) setActiveBottomNav("list");
                  if (s.id === 7 || s.id === 8) setActiveBottomNav("bills");
                }}
                className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-all ${
                  screen === s.id
                    ? "bg-[#432F2E] text-[#FEEFB8] font-bold"
                    : "bg-white text-[#432F2E] hover:bg-[#FEEFB8]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 py-8 px-4 flex flex-col items-center justify-center">
        {/* Mobile Device Frame */}
        <div className="phone shadow-2xl">
          {/* ================= SCREEN 1: SIGN IN ================= */}
          {screen === 1 && (
            <div className="flex-1 bg-[#C4DAE8] flex flex-col">
              <div className="h-10 bg-[var(--stripes)] flex-none opacity-80" />
              <div className="flex-1 p-5 flex flex-col gap-4">
                <div className="w-[180px] h-[50px] mx-auto relative my-2">
                  <Image src="/brand/pact-logo-lockup.png" alt="PACT" fill className="object-contain" priority />
                </div>
                <div className="text-center space-y-1">
                  <h2 className="h-display text-2xl font-serif text-[#2E201F]">Welcome</h2>
                  <p className="text-sm text-[#6A5452]">Order groceries together with your building, once a month.</p>
                </div>

                <div className="seg">
                  <span className="on">Type</span>
                  <span>Speak</span>
                </div>

                <div className="field">
                  <label className="text-sm font-medium">Your mobile number</label>
                  <div className="input bg-white">
                    <span className="pre text-sm">+91</span>
                    <span className="text-base font-semibold">99999 00001</span>
                  </div>
                  <p className="text-xs text-[#6A5452] mt-1">We'll text you a 6-digit code.</p>
                </div>

                <div className="field">
                  <label className="text-sm font-medium">6-digit code</label>
                  <div className="otp">
                    <span>4</span>
                    <span>8</span>
                    <span>2</span>
                    <span className="cur"></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>

                <div className="flex-1" />
                <button onClick={() => setScreen(2)} className="btn btn-primary block w-full">
                  Sign In as Asha
                </button>
              </div>
            </div>
          )}

          {/* ================= SCREEN 2: CHOOSE ORDERING MODE ================= */}
          {screen === 2 && (
            <div className="flex-1 flex flex-col">
              <div className="top">
                <div className="w-[110px] h-[36px] relative">
                  <Image src="/brand/pact-logo-lockup.png" alt="PACT" fill className="object-contain" />
                </div>
              </div>
              <div className="body flex-1 justify-between">
                <div className="space-y-4">
                  <h2 className="h-display text-2xl font-serif text-[#2E201F]">How would you like to order?</h2>

                  <div
                    onClick={() => {
                      setScreen(3);
                      setActiveBottomNav("home");
                    }}
                    className="card choice cursor-pointer hover:border-[#432F2E] transition-all"
                  >
                    <div className="glyph">
                      <ShoppingBag className="w-8 h-8 text-[#432F2E]" />
                    </div>
                    <div>
                      <b className="text-base text-[#432F2E]">Type & tap</b>
                      <span className="text-xs text-[#6A5452] block">Look through the shop and tap what you need.</span>
                    </div>
                  </div>

                  <div
                    onClick={() => setScreen(6)}
                    className="card choice cursor-pointer hover:border-[#432F2E] transition-all"
                  >
                    <div className="glyph">
                      <Mic className="w-8 h-8 text-[#432F2E]" />
                    </div>
                    <div>
                      <b className="text-base text-[#432F2E]">Speak</b>
                      <span className="text-xs text-[#6A5452] block">Say your list out loud, in English or Hindi.</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-center text-[#7A6462]">You can switch anytime in your preferences.</p>
              </div>
            </div>
          )}

          {/* ================= SCREEN 3: RESIDENT HOME ================= */}
          {screen === 3 && (
            <div className="flex-1 flex flex-col">
              <div className="top justify-between">
                <div className="w-[110px] h-[36px] relative">
                  <Image src="/brand/pact-logo-lockup.png" alt="PACT" fill className="object-contain" />
                </div>
                <div className="relative">
                  <Bell className="w-5 h-5 text-[#432F2E]" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#A3241C] border-2 border-[#C4DAE8]"></span>
                </div>
              </div>

              <div className="body flex-1 overflow-y-auto">
                <div>
                  <h2 className="h-display text-2xl font-serif text-[#2E201F]">Good evening, Asha</h2>
                  <p className="text-xs text-[#6A5452]">Flat A-101 · Green Meadows Apartments</p>
                </div>

                {/* Timeline */}
                <div className="card space-y-3">
                  <div className="timeline">
                    <div className="st now">
                      <div className="dot">
                        <ListOrdered className="w-3.5 h-3.5 text-white" />
                      </div>
                      Add
                    </div>
                    <div className="st">
                      <div className="dot"></div>
                      Sent
                    </div>
                    <div className="st">
                      <div className="dot"></div>
                      Packed
                    </div>
                    <div className="st">
                      <div className="dot"></div>
                      Pay
                    </div>
                    <div className="st">
                      <div className="dot"></div>
                      Delivered
                    </div>
                  </div>
                  <p className="text-xs text-[#6A5452] leading-relaxed">
                    Ordering is open. On 25 Nov your building's order goes to Sri Lakshmi Stores.
                  </p>
                </div>

                {/* Hero Action Card */}
                <div className="hero space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="h-title text-base font-serif font-bold text-[#432F2E]">This month's groceries</span>
                    <span className="pill pill-warning text-xs">
                      <Clock className="w-3 h-3" /> Closes in 3 days
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setScreen(4);
                      setActiveBottomNav("shop");
                    }}
                    className="btn btn-primary block w-full text-sm"
                  >
                    Add to my list ({totalItems} items)
                  </button>
                </div>

                {/* Anonymous Building Total */}
                <div
                  onClick={() => {
                    setScreen(5);
                    setActiveBottomNav("list");
                  }}
                  className="card flex items-center justify-between cursor-pointer hover:border-[#432F2E]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#E4EEF5] flex items-center justify-center text-[#2A5C79]">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <b className="text-sm text-[#432F2E] block">Our building this month</b>
                      <span className="text-xs text-[#6A5452]">4 neighbours · 12 items ordered so far</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#6A5452]" />
                </div>
              </div>

              {/* Bottom Nav */}
              <div className="bnav">
                <a className="on">
                  <i><HomeIcon className="w-4 h-4" /></i>
                  Home
                </a>
                <a onClick={() => { setScreen(4); setActiveBottomNav("shop"); }}>
                  <i><ShoppingBag className="w-4 h-4" /></i>
                  Shop
                </a>
                <a onClick={() => { setScreen(5); setActiveBottomNav("list"); }}>
                  <i><ListOrdered className="w-4 h-4" /></i>
                  My list
                </a>
                <a onClick={() => { setScreen(7); setActiveBottomNav("bills"); }}>
                  <i><Receipt className="w-4 h-4" /></i>
                  Bills
                </a>
              </div>
            </div>
          )}

          {/* ================= SCREEN 4: SHOP ================= */}
          {screen === 4 && (
            <div className="flex-1 flex flex-col">
              <div className="top justify-between">
                <div className="w-[110px] h-[36px] relative">
                  <Image src="/brand/pact-logo-lockup.png" alt="PACT" fill className="object-contain" />
                </div>
                <button onClick={() => setScreen(6)} className="text-[#432F2E] p-1">
                  <Mic className="w-5 h-5" />
                </button>
              </div>

              <div className="body flex-1 overflow-y-auto pt-2 space-y-3">
                {/* Search */}
                <div className="input bg-white h-11 text-sm">
                  <Search className="w-4 h-4 text-[#6A5452]" />
                  <span className="ph flex-1 text-xs">Search rice, atta, oil, dal…</span>
                  <button onClick={() => setScreen(6)}>
                    <Mic className="w-4 h-4 text-[#2A5C79]" />
                  </button>
                </div>

                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
                  {["Rice & Grains", "Flours & Atta", "Dal & Pulses", "Spices"].map((cat) => (
                    <span
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`chip text-xs ${activeCategory === cat ? "on" : ""}`}
                    >
                      {cat}
                    </span>
                  ))}
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Product 1 */}
                  <div className="card prod p-3 flex flex-col justify-between">
                    <div className="aspect-square bg-[#E4EEF5] rounded-[12px] flex items-center justify-center text-[#2A5C79] font-bold text-xs relative overflow-hidden">
                      <span className="z-10">🌾 5 kg</span>
                      <div className="absolute inset-x-0 bottom-0 h-4 bg-[var(--stripes-butter)] opacity-70" />
                    </div>
                    <div>
                      <b className="text-xs text-[#432F2E] block min-h-[32px] mt-2">Sona Masoori Rice</b>
                      <div className="price text-xs mt-1">
                        About ₹300 <s className="text-[10px] text-gray-400">₹340</s>
                      </div>
                    </div>
                    {cart.rice ? (
                      <div className="stepper h-9 mt-2">
                        <button onClick={() => updateQuantity("rice", -1)}>
                          {cart.rice === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                        </button>
                        <span className="text-xs">{cart.rice}</span>
                        <button onClick={() => updateQuantity("rice", 1)}>
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => updateQuantity("rice", 1)} className="btn btn-secondary md h-9 text-xs mt-2 w-full">
                        Add
                      </button>
                    )}
                  </div>

                  {/* Product 2 */}
                  <div className="card prod p-3 flex flex-col justify-between">
                    <div className="aspect-square bg-[#FFF7DB] rounded-[12px] flex items-center justify-center text-[#8A3A00] font-bold text-xs relative overflow-hidden">
                      <span className="z-10">🍚 500 g</span>
                      <div className="absolute inset-x-0 bottom-0 h-4 bg-[var(--stripes-butter)] opacity-70" />
                    </div>
                    <div>
                      <b className="text-xs text-[#432F2E] block min-h-[32px] mt-2">Poha (Flattened Rice)</b>
                      <div className="price text-xs mt-1">About ₹45</div>
                    </div>
                    {cart.poha ? (
                      <div className="stepper h-9 mt-2">
                        <button onClick={() => updateQuantity("poha", -1)}>
                          {cart.poha === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                        </button>
                        <span className="text-xs">{cart.poha}</span>
                        <button onClick={() => updateQuantity("poha", 1)}>
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => updateQuantity("poha", 1)} className="btn btn-secondary md h-9 text-xs mt-2 w-full">
                        Add
                      </button>
                    )}
                  </div>

                  {/* Product 3 */}
                  <div className="card prod p-3 flex flex-col justify-between">
                    <div className="aspect-square bg-[#E3F4EA] rounded-[12px] flex items-center justify-center text-[#1B6B45] font-bold text-xs relative overflow-hidden">
                      <span className="z-10">🌻 1 L</span>
                      <div className="absolute inset-x-0 bottom-0 h-4 bg-[var(--stripes-butter)] opacity-70" />
                    </div>
                    <div>
                      <b className="text-xs text-[#432F2E] block min-h-[32px] mt-2">Sunflower Cooking Oil</b>
                      <div className="price text-xs mt-1">About ₹250</div>
                    </div>
                    {cart.oil ? (
                      <div className="stepper h-9 mt-2">
                        <button onClick={() => updateQuantity("oil", -1)}>
                          {cart.oil === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                        </button>
                        <span className="text-xs">{cart.oil}</span>
                        <button onClick={() => updateQuantity("oil", 1)}>
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => updateQuantity("oil", 1)} className="btn btn-secondary md h-9 text-xs mt-2 w-full">
                        Add
                      </button>
                    )}
                  </div>

                  {/* Product 4 */}
                  <div className="card prod p-3 flex flex-col justify-between">
                    <div className="aspect-square bg-[#FCE8E6] rounded-[12px] flex items-center justify-center text-[#A3241C] font-bold text-xs relative overflow-hidden">
                      <span className="z-10">🥣 500 g</span>
                      <div className="absolute inset-x-0 bottom-0 h-4 bg-[var(--stripes-butter)] opacity-70" />
                    </div>
                    <div>
                      <b className="text-xs text-[#432F2E] block min-h-[32px] mt-2">Toor Dal (Organic)</b>
                      <div className="price text-xs mt-1">About ₹100</div>
                    </div>
                    {cart.dal ? (
                      <div className="stepper h-9 mt-2">
                        <button onClick={() => updateQuantity("dal", -1)}>
                          {cart.dal === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                        </button>
                        <span className="text-xs">{cart.dal}</span>
                        <button onClick={() => updateQuantity("dal", 1)}>
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => updateQuantity("dal", 1)} className="btn btn-secondary md h-9 text-xs mt-2 w-full">
                        Add
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Floating Bottom Cart Bar */}
              <div className="sticky flex items-center justify-between">
                <div>
                  <b className="text-sm text-[#432F2E] block">My list · {totalItems} items</b>
                  <span className="text-xs text-[#6A5452]">about ₹{estimatedTotal}</span>
                </div>
                <button
                  onClick={() => {
                    setScreen(5);
                    setActiveBottomNav("list");
                  }}
                  className="btn btn-primary md text-xs"
                >
                  View My List
                </button>
              </div>

              {/* Bottom Nav */}
              <div className="bnav">
                <a onClick={() => { setScreen(3); setActiveBottomNav("home"); }}>
                  <i><HomeIcon className="w-4 h-4" /></i>
                  Home
                </a>
                <a className="on">
                  <i><ShoppingBag className="w-4 h-4" /></i>
                  Shop
                </a>
                <a onClick={() => { setScreen(5); setActiveBottomNav("list"); }}>
                  <i><ListOrdered className="w-4 h-4" /></i>
                  My list
                </a>
                <a onClick={() => { setScreen(7); setActiveBottomNav("bills"); }}>
                  <i><Receipt className="w-4 h-4" /></i>
                  Bills
                </a>
              </div>
            </div>
          )}

          {/* ================= SCREEN 5: MY LIST ================= */}
          {screen === 5 && (
            <div className="flex-1 flex flex-col">
              <div className="top justify-between">
                <div className="w-[110px] h-[36px] relative">
                  <Image src="/brand/pact-logo-lockup.png" alt="PACT" fill className="object-contain" />
                </div>
                <button onClick={() => setScreen(6)} className="text-xs bg-[#FEEFB8] text-[#432F2E] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 border border-[#EFDB93]">
                  <Mic className="w-3 h-3" /> Speak
                </button>
              </div>

              <div className="body flex-1 overflow-y-auto space-y-3">
                <h2 className="h-display text-2xl font-serif text-[#2E201F]">My list</h2>

                <div className="banner warning text-xs py-2 px-3">
                  <Clock className="w-4 h-4 text-[#8A3A00]" />
                  <span>Ordering closes on 24 Nov, midnight.</span>
                </div>

                {/* Items List */}
                <div className="card flush divide-y divide-[#E4EEF5]">
                  <div className="p-3 flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <b className="text-xs text-[#432F2E] block">Sona Masoori Rice</b>
                      <span className="text-[11px] text-[#6A5452]">5 kg · about ₹300</span>
                    </div>
                    <div className="stepper h-8">
                      <button onClick={() => updateQuantity("rice", -1)}>
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs">{cart.rice || 1}</span>
                      <button onClick={() => updateQuantity("rice", 1)}>
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <b className="text-xs text-[#432F2E] block">Sugar</b>
                      <span className="text-[11px] text-[#6A5452]">1 kg · about ₹75 each</span>
                    </div>
                    <div className="stepper h-8">
                      <button onClick={() => updateQuantity("sugar", -1)}>
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs">{cart.sugar || 2}</span>
                      <button onClick={() => updateQuantity("sugar", 1)}>
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <b className="text-xs text-[#432F2E] block">Sunflower Cooking Oil</b>
                      <span className="text-[11px] text-[#6A5452]">1 L · about ₹250</span>
                    </div>
                    <div className="stepper h-8">
                      <button onClick={() => updateQuantity("oil", -1)}>
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs">{cart.oil || 1}</span>
                      <button onClick={() => updateQuantity("oil", 1)}>
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <b className="text-xs text-[#432F2E] block">Toor Dal</b>
                      <span className="text-[11px] text-[#6A5452]">500 g · about ₹100</span>
                    </div>
                    <div className="stepper h-8">
                      <button onClick={() => updateQuantity("dal", -1)}>
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs">{cart.dal || 1}</span>
                      <button onClick={() => updateQuantity("dal", 1)}>
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Estimate Card */}
                <div className="card space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#6A5452] font-medium">Estimated total</span>
                    <b className="text-base text-[#432F2E]">About ₹{estimatedTotal}</b>
                  </div>
                  <p className="text-[11px] text-[#7A6462]">
                    The store confirms the final price and bulk discounts when it packs on 25 Nov.
                  </p>
                </div>
              </div>

              {/* Bottom Nav */}
              <div className="bnav">
                <a onClick={() => { setScreen(3); setActiveBottomNav("home"); }}>
                  <i><HomeIcon className="w-4 h-4" /></i>
                  Home
                </a>
                <a onClick={() => { setScreen(4); setActiveBottomNav("shop"); }}>
                  <i><ShoppingBag className="w-4 h-4" /></i>
                  Shop
                </a>
                <a className="on">
                  <i><ListOrdered className="w-4 h-4" /></i>
                  My list
                </a>
                <a onClick={() => { setScreen(7); setActiveBottomNav("bills"); }}>
                  <i><Receipt className="w-4 h-4" /></i>
                  Bills
                </a>
              </div>
            </div>
          )}

          {/* ================= SCREEN 6: SPEAK / VOICE ORDERING ================= */}
          {screen === 6 && (
            <div className="flex-1 flex flex-col">
              <div className="top gap-2">
                <button onClick={() => setScreen(5)} className="p-1">
                  <ArrowLeft className="w-5 h-5 text-[#432F2E]" />
                </button>
                <b className="text-sm font-semibold">Say your list</b>
              </div>

              <div className="body flex-1 overflow-y-auto space-y-3 pt-3">
                <div className="seg">
                  <span
                    onClick={() => setVoiceLanguage("en")}
                    className={voiceLanguage === "en" ? "on" : ""}
                  >
                    English
                  </span>
                  <span
                    onClick={() => setVoiceLanguage("hi")}
                    className={`hi ${voiceLanguage === "hi" ? "on" : ""}`}
                  >
                    हिंदी
                  </span>
                </div>

                {/* What Was Heard */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#432F2E]">I heard:</p>
                  <div className="transcript text-xs leading-relaxed bg-white border border-[#948180] p-2.5 rounded-[12px]">
                    {voiceLanguage === "en"
                      ? "“I need 5 kg rice, 2 kg sugar, one litre sunflower oil and 500 grams of toor dal”"
                      : "“पाँच किलो चावल, दो किलो चीनी, एक लीटर तेल और 500 ग्राम तूर दाल चाहिए”"}
                  </div>
                </div>

                {/* Parsed Items */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#432F2E]">This is what I understood:</p>
                  <div className="card flush divide-y divide-[#E4EEF5] text-xs">
                    <div className="p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#1B6B45]" />
                        <span>Sona Masoori Rice · 5 kg × 1</span>
                      </div>
                      <span className="text-[#2A5C79] text-[11px] font-medium cursor-pointer">Edit</span>
                    </div>
                    <div className="p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#1B6B45]" />
                        <span>Sugar · 1 kg × 2</span>
                      </div>
                      <span className="text-[#2A5C79] text-[11px] font-medium cursor-pointer">Edit</span>
                    </div>
                    <div className="p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#1B6B45]" />
                        <span>Sunflower Oil · 1 L × 1</span>
                      </div>
                      <span className="text-[#2A5C79] text-[11px] font-medium cursor-pointer">Edit</span>
                    </div>
                    <div className="p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#1B6B45]" />
                        <span>Toor Dal · 500 g × 1</span>
                      </div>
                      <span className="text-[#2A5C79] text-[11px] font-medium cursor-pointer">Edit</span>
                    </div>
                  </div>
                </div>

                {/* Voice Interaction Mic */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setIsRecording(!isRecording)}
                    className={`mic w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                      isRecording ? "live animate-pulse" : ""
                    }`}
                  >
                    <Mic className="w-6 h-6" />
                  </button>
                  <span className="text-xs text-[#6A5452]">
                    {isRecording ? "Listening to your voice… tap to finish" : "Tap and speak to add more items to your list"}
                  </span>
                </div>
              </div>

              <div className="sticky">
                <button onClick={() => setScreen(5)} className="btn btn-primary block w-full text-xs">
                  Add 4 items to my list
                </button>
              </div>
            </div>
          )}

          {/* ================= SCREEN 7: MY BILL ================= */}
          {screen === 7 && (
            <div className="flex-1 flex flex-col">
              <div className="top gap-2">
                <button onClick={() => setScreen(3)} className="p-1">
                  <ArrowLeft className="w-5 h-5 text-[#432F2E]" />
                </button>
                <b className="text-sm font-semibold">My bill · November</b>
              </div>

              <div className="body flex-1 overflow-y-auto space-y-3 pt-2">
                <div className="hero space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-[#432F2E]">You pay</span>
                    <span className="pill pill-neutral text-[11px] bg-white">
                      <Clock className="w-3 h-3" /> To pay
                    </span>
                  </div>
                  <div className="money-xl text-3xl font-bold text-[#432F2E]">₹720</div>
                </div>

                {/* Itemized lines */}
                <div className="card flush divide-y divide-[#E4EEF5] text-xs">
                  <div className="p-2.5 flex justify-between">
                    <div>
                      <b>Sona Masoori Rice</b> <span className="text-gray-500">5 kg × 1</span>
                    </div>
                    <span className="num font-bold">₹300</span>
                  </div>
                  <div className="p-2.5 flex justify-between">
                    <div>
                      <b>Sugar</b> <span className="text-gray-500">1 kg × 2</span>
                    </div>
                    <span className="num font-bold">₹150</span>
                  </div>
                  <div className="p-2.5 flex justify-between">
                    <div>
                      <b>Sunflower Oil</b> <span className="text-gray-500">1 L × 1</span>
                    </div>
                    <span className="num font-bold">₹250</span>
                  </div>
                  <div className="p-2.5 flex justify-between">
                    <div>
                      <b>Toor Dal</b> <span className="text-gray-500">500 g × 1</span>
                    </div>
                    <span className="num font-bold">₹100</span>
                  </div>
                </div>

                {/* Calculation Summary */}
                <div className="card text-xs space-y-1.5 p-3">
                  <div className="flex justify-between">
                    <span className="text-[#6A5452]">Your items</span>
                    <span className="num">₹800</span>
                  </div>
                  <div className="flex justify-between text-[#1B6B45]">
                    <span>Community wholesale discount</span>
                    <span className="num font-bold">− ₹80</span>
                  </div>
                  <div className="flex justify-between border-t border-[#B3CEDE] pt-2 font-bold text-sm text-[#432F2E]">
                    <span>You pay</span>
                    <span className="num">₹720</span>
                  </div>
                </div>

                {/* Calculation details accordion */}
                <div
                  onClick={() => setShowCalculation(!showCalculation)}
                  className="flex items-center justify-between text-[#2A5C79] text-xs font-medium cursor-pointer pt-1"
                >
                  <span>How is this calculated?</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showCalculation ? "rotate-180" : ""}`} />
                </div>

                {showCalculation && (
                  <div className="bg-[#E4EEF5] p-3 rounded-[12px] text-[11px] text-[#432F2E] space-y-1">
                    <p>The building order total was ₹2,500 with a ₹250 bulk store discount (10% off).</p>
                    <p>Your item share was ₹800 (32% of building total). Your fair discount is exactly ₹80.</p>
                  </div>
                )}
              </div>

              <div className="sticky">
                <button onClick={() => setScreen(8)} className="btn btn-primary block w-full text-sm">
                  Pay ₹720
                </button>
              </div>
            </div>
          )}

          {/* ================= SCREEN 8: PAID RECEIPT ================= */}
          {screen === 8 && (
            <div className="flex-1 flex flex-col">
              <div className="top gap-2">
                <button onClick={() => setScreen(3)} className="p-1">
                  <ArrowLeft className="w-5 h-5 text-[#432F2E]" />
                </button>
                <b className="text-sm font-semibold">Payment Result</b>
              </div>

              <div className="body flex-1 overflow-y-auto space-y-4 pt-4 text-center">
                <div className="w-16 h-16 rounded-full bg-[#E3F4EA] text-[#1B6B45] flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>

                <div>
                  <h2 className="h-display text-2xl font-serif text-[#1B6B45]">Paid</h2>
                  <p className="text-xs text-[#6A5452]">We received ₹720. Thank you, Asha.</p>
                </div>

                <div className="card text-xs space-y-2 text-left p-3">
                  <div className="flex justify-between">
                    <span className="text-[#6A5452]">Bill Number:</span>
                    <span className="font-semibold text-[#432F2E]">GM-2611-001</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6A5452]">Paid on:</span>
                    <span className="font-semibold text-[#432F2E]">26 Nov, 10:42 am</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6A5452]">Gateway:</span>
                    <span className="font-semibold text-[#432F2E]">Verified (Razorpay/Mock)</span>
                  </div>
                  <div className="flex justify-between border-t border-[#E4EEF5] pt-1">
                    <span className="text-[#6A5452]">Amount:</span>
                    <b className="text-sm font-bold text-[#1B6B45]">₹720</b>
                  </div>
                </div>

                <div className="card text-left space-y-2 p-3 bg-[#E4EEF5] border-[#B3CEDE]">
                  <span className="pill pill-info text-xs">
                    <Package className="w-3 h-3" /> Ready to deliver
                  </span>
                  <p className="text-xs text-[#432F2E] leading-relaxed">
                    Meera (Coordinator) will bring your order to Flat A-101 once the store delivery arrives. We'll alert you when it's on the way.
                  </p>
                </div>

                <div className="flex-1" />
                <button onClick={() => setScreen(3)} className="btn btn-secondary block w-full text-xs">
                  Back to Home
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
