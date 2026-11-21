"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
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
  Building2,
  Users,
  Store,
  Truck,
  ShieldCheck,
  TrendingDown,
  Plus,
  Minus,
  Trash2,
  Receipt,
} from "lucide-react";

export default function WebDashboard() {
  const {
    currentUser,
    cart,
    addToCart,
    updateQuantity,
    totalCartCount,
    totalEstimatedAmount,
    isPaid,
    allProducts,
    orderDiscount,
  } = usePact();

  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", "Rice & Grains", "Dal & Pulses", "Oils & Ghee", "Groceries & Staples"];

  const filteredProducts = allProducts.filter((p) =>
    activeCategory === "All" ? true : p.category === activeCategory
  );

  return (
    <div className="min-h-screen bg-[#F3F8FB] text-[#432F2E]">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Hero Banner & Greeting */}
        <div className="bg-[#C4DAE8] rounded-[20px] p-6 lg:p-8 border border-[#B3CEDE] shadow-xs relative overflow-hidden">
          <div className="max-w-3xl space-y-3 z-10 relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEEFB8] text-[#432F2E] text-xs font-bold border border-[#EFDB93] uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 text-[#2A5C79]" /> Green Meadows Community Cart
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/90 text-[#1B6B45] text-xs font-bold border border-[#B3CEDE]">
                <TrendingDown className="w-3.5 h-3.5" /> 10% Negotiated Bulk Discount
              </span>
            </div>

            <h1 className="h-display text-3xl sm:text-4xl lg:text-5xl text-[#2E201F] leading-tight font-serif">
              One building. One monthly order. One fair split bill.
            </h1>

            <p className="text-sm sm:text-base text-[#6A5452] leading-relaxed max-w-2xl">
              Welcome back, <strong>{currentUser.name}</strong> ({currentUser.flat || currentUser.storeName}). Add your monthly staples to your household contribution. On 25 Nov midnight, PACT consolidates your entire building&apos;s order for local wholesale fulfillment.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/customer/shop" className="btn btn-primary md text-sm font-bold">
                <ShoppingBag className="w-4 h-4 mr-1" />
                Browse Catalogue
              </Link>
              <Link href="/customer/speak" className="btn btn-secondary md text-sm font-semibold bg-white">
                <Mic className="w-4 h-4 mr-1 text-[#2A5C79]" />
                Voice Assistant (Hindi / English)
              </Link>
              <Link href="/customer/bill" className="btn btn-quiet md text-sm font-semibold">
                <Receipt className="w-4 h-4 mr-1" />
                {isPaid ? "View Paid Receipt" : "Review Bill (₹720)"}
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Desktop Stats Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5 space-y-1 bg-white hover:border-[#432F2E] transition-all">
            <div className="flex justify-between items-center text-[#6A5452] text-xs font-semibold">
              <span>Monthly Cycle</span>
              <Clock className="w-4 h-4 text-[#8A3A00]" />
            </div>
            <div className="font-serif text-2xl font-bold text-[#2E201F]">
              Nov 2026 Cycle
            </div>
            <p className="text-xs text-[#8A3A00] font-medium flex items-center gap-1">
              <span>Ordering cutoff in 3 days (24 Nov)</span>
            </p>
          </div>

          <div className="card p-5 space-y-1 bg-white hover:border-[#432F2E] transition-all">
            <div className="flex justify-between items-center text-[#6A5452] text-xs font-semibold">
              <span>Community Pool</span>
              <Users className="w-4 h-4 text-[#2A5C79]" />
            </div>
            <div className="font-serif text-2xl font-bold text-[#2E201F]">
              4 Flats Active
            </div>
            <p className="text-xs text-[#6A5452]">
              Flats A-101, B-204, C-305, D-402
            </p>
          </div>

          <div className="card p-5 space-y-1 bg-white hover:border-[#432F2E] transition-all">
            <div className="flex justify-between items-center text-[#6A5452] text-xs font-semibold">
              <span>Bulk Order Value</span>
              <Store className="w-4 h-4 text-[#1B6B45]" />
            </div>
            <div className="font-serif text-2xl font-bold text-[#1B6B45]">
              ₹2,250 <span className="text-xs font-normal text-[#6A5452]">/ ₹2,500</span>
            </div>
            <p className="text-xs text-[#1B6B45] font-semibold">
              ₹250 bulk discount unlocked
            </p>
          </div>

          <div className="card p-5 space-y-1 bg-white hover:border-[#432F2E] transition-all">
            <div className="flex justify-between items-center text-[#6A5452] text-xs font-semibold">
              <span>My Household Share</span>
              <Receipt className="w-4 h-4 text-[#2A5C79]" />
            </div>
            <div className="font-serif text-2xl font-bold text-[#2E201F]">
              ₹720
            </div>
            <p className="text-xs">
              <span className={`pill text-[10px] py-0 px-2 font-bold ${isPaid ? "pill-success" : "pill-warning"}`}>
                {isPaid ? "Paid & Verified" : "To pay · Bill ready"}
              </span>
            </p>
          </div>
        </div>

        {/* 12-Column Desktop Application Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (8 Columns): Timeline, Quick Add Grid, Aggregated Cart */}
          <div className="lg:col-span-8 space-y-8">
            {/* Monthly Loop Timeline Widget */}
            <div className="card p-6 space-y-4 bg-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ListOrdered className="w-5 h-5 text-[#2A5C79]" />
                  <h2 className="font-serif text-lg font-bold text-[#2E201F]">
                    Monthly Collective Commerce Timeline
                  </h2>
                </div>
                <span className="text-xs font-semibold text-[#2A5C79] bg-[#E4EEF5] px-2.5 py-1 rounded-full">
                  Step 1: Adding Items
                </span>
              </div>

              <div className="timeline">
                <div className="st now">
                  <div className="dot">
                    <ListOrdered className="w-3.5 h-3.5 text-white" />
                  </div>
                  Add items (1st–24th)
                </div>
                <div className="st">
                  <div className="dot"></div>
                  Cutoff & Sent (25th)
                </div>
                <div className="st">
                  <div className="dot"></div>
                  Packed & Discounted
                </div>
                <div className={`st ${isPaid ? "done" : ""}`}>
                  <div className="dot">
                    {isPaid && <Check className="w-3 h-3 text-white" />}
                  </div>
                  Proportional Pay
                </div>
                <div className="st">
                  <div className="dot"></div>
                  Doorstep Delivery
                </div>
              </div>

              <p className="text-xs text-[#6A5452] leading-relaxed">
                Residents contribute to a unified community cart without per-store shopping or individual checkout friction. On 25 Nov midnight, PACT takes an immutable snapshot and dispatches one wholesale order to Sri Lakshmi Stores.
              </p>
            </div>

            {/* Quick Grocery Shop Preview (Desktop 3-Column Grid) */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#2E201F]">
                    Monthly Groceries & Staples
                  </h2>
                  <p className="text-xs text-[#6A5452]">
                    High-quality staples negotiated directly with local wholesalers.
                  </p>
                </div>
                <Link
                  href="/customer/shop"
                  className="text-xs font-bold text-[#2A5C79] hover:underline flex items-center gap-1"
                >
                  <span>Open Full Shop ({allProducts.length} items)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Category Filter Chips */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`chip text-xs transition-all cursor-pointer ${
                      activeCategory === cat ? "on" : "hover:bg-[#E4EEF5]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Product Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredProducts.slice(0, 6).map((product) => {
                  const qty = cart[product.id] || 0;

                  return (
                    <div
                      key={product.id}
                      className="card p-4 flex flex-col justify-between hover:shadow-md transition-all bg-white"
                    >
                      <div>
                        {/* Icon & Variant Tag */}
                        <div
                          className={`aspect-video ${product.bgLight} rounded-[12px] flex items-center justify-center text-4xl relative overflow-hidden`}
                        >
                          <span>{product.imageIcon}</span>
                          <span className="absolute top-2 left-2 text-[10px] font-bold bg-white/90 px-2 py-0.5 rounded-full border border-[#B3CEDE]">
                            {product.variant}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-[#6A5452] tracking-wider block">
                            {product.brand}
                          </span>
                          <h3 className="font-bold text-sm text-[#432F2E] leading-tight">
                            {product.name}
                          </h3>
                          {product.hindiName && (
                            <p className="hi text-xs text-[#6A5452]">
                              {product.hindiName}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 mt-3 border-t border-[#E4EEF5] flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="num font-bold text-sm text-[#432F2E]">
                              ₹{product.price}
                            </span>
                            <span className="num text-xs text-[#948180] line-through">
                              ₹{product.mrp}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#1B6B45] font-semibold block">
                            Wholesale bulk rate
                          </span>
                        </div>

                        {qty === 0 ? (
                          <button
                            onClick={() => addToCart(product.id, 1)}
                            className="btn btn-secondary md h-9 px-3 text-xs font-bold cursor-pointer hover:bg-[#FEEFB8]"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add
                          </button>
                        ) : (
                          <div className="stepper h-9">
                            <button
                              onClick={() => updateQuantity(product.id, qty - 1)}
                              className="px-2.5 hover:bg-[#E4EEF5] cursor-pointer"
                            >
                              {qty === 1 ? (
                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                              ) : (
                                <Minus className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <span className="text-xs font-bold px-2.5">{qty}</span>
                            <button
                              onClick={() => updateQuantity(product.id, qty + 1)}
                              className="px-2.5 hover:bg-[#E4EEF5] cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Aggregated Community Cart (Transparency & Bulk Savings) */}
            <div className="card p-6 space-y-4 bg-white">
              <div className="flex justify-between items-center pb-3 border-b border-[#E4EEF5]">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#2E201F]">
                    Green Meadows Collective Cart
                  </h3>
                  <p className="text-xs text-[#6A5452]">
                    Aggregated across all 4 flats. Individual neighbour lines stay private (Rule R4).
                  </p>
                </div>
                <span className="pill pill-success text-xs font-bold">
                  ₹250 Bulk Savings Unlocked
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[#E4EEF5] text-[#6A5452]">
                      <th className="py-2.5 font-bold">Consolidated Product</th>
                      <th className="py-2.5 font-bold">Total Quantity</th>
                      <th className="py-2.5 font-bold text-right">Wholesale Rate</th>
                      <th className="py-2.5 font-bold text-right">Collective Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4EEF5]">
                    <tr>
                      <td className="py-3 font-medium text-[#432F2E]">
                        Sona Masoori Rice (5 kg packs)
                      </td>
                      <td className="py-3 text-[#6A5452]">4 packs (20 kg)</td>
                      <td className="py-3 text-right text-[#6A5452]">₹300 / pack</td>
                      <td className="py-3 text-right font-bold text-[#432F2E]">₹1,200</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-[#432F2E]">
                        Pure Crystal Sugar (1 kg packs)
                      </td>
                      <td className="py-3 text-[#6A5452]">6 packs (6 kg)</td>
                      <td className="py-3 text-right text-[#6A5452]">₹75 / pack</td>
                      <td className="py-3 text-right font-bold text-[#432F2E]">₹450</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-[#432F2E]">
                        Sunflower Cooking Oil (1 L bottles)
                      </td>
                      <td className="py-3 text-[#6A5452]">2 bottles (2 L)</td>
                      <td className="py-3 text-right text-[#6A5452]">₹250 / bottle</td>
                      <td className="py-3 text-right font-bold text-[#432F2E]">₹500</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-[#432F2E]">
                        Organic Toor Dal (500 g packs)
                      </td>
                      <td className="py-3 text-[#6A5452]">3 packs (1.5 kg)</td>
                      <td className="py-3 text-right text-[#6A5452]">₹100 / pack</td>
                      <td className="py-3 text-right font-bold text-[#432F2E]">₹300</td>
                    </tr>
                    <tr className="bg-[#F3F8FB] font-bold">
                      <td className="py-3 px-2 text-[#432F2E]">Gross Wholesale Total</td>
                      <td className="py-3 text-[#6A5452]">15 total items</td>
                      <td className="py-3 text-right text-[#1B6B45]">− ₹250 Discount</td>
                      <td className="py-3 px-2 text-right text-sm font-serif text-[#1B6B45]">
                        ₹2,250
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column (4 Columns): My Contribution, Voice Launcher, Proportional Bill */}
          <div className="lg:col-span-4 space-y-6">
            {/* Household Contribution Summary */}
            <div className="card p-6 space-y-4 bg-white shadow-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#E4EEF5]">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#2E201F]">
                    My Contribution
                  </h3>
                  <p className="text-xs text-[#6A5452]">
                    Flat {currentUser.flat || "A-101"} · {totalCartCount} items
                  </p>
                </div>
                <Link
                  href="/customer/list"
                  className="text-xs font-bold text-[#2A5C79] hover:underline"
                >
                  Edit List
                </Link>
              </div>

              {/* Items List */}
              <div className="divide-y divide-[#E4EEF5] text-xs">
                {Object.entries(cart).map(([productId, quantity]) => {
                  const p = allProducts.find((x) => x.id === productId);
                  if (!p) return null;

                  return (
                    <div key={p.id} className="py-2.5 flex justify-between items-center">
                      <div className="flex-1 pr-2">
                        <span className="font-medium text-[#432F2E] block truncate">
                          {p.name}
                        </span>
                        <span className="text-[11px] text-[#6A5452]">
                          {p.variant} × {quantity}
                        </span>
                      </div>
                      <span className="font-bold text-[#432F2E]">
                        ₹{p.price * quantity}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Price Calculation Box */}
              <div className="bg-[#F3F8FB] p-3.5 rounded-[12px] border border-[#E4EEF5] space-y-2 text-xs">
                <div className="flex justify-between text-[#6A5452]">
                  <span>Items Subtotal:</span>
                  <span className="font-medium text-[#432F2E]">₹{totalEstimatedAmount}</span>
                </div>
                <div className="flex justify-between text-[#1B6B45] font-semibold">
                  <span>Proportional Discount (10%):</span>
                  <span>− ₹80</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#E4EEF5] text-sm">
                  <span className="font-bold text-[#432F2E]">Estimated Payable:</span>
                  <b className="font-serif text-base text-[#2E201F]">₹720</b>
                </div>
              </div>

              <Link
                href="/customer/list"
                className="btn btn-secondary block w-full text-center text-xs font-bold"
              >
                Manage My Household List
              </Link>
            </div>

            {/* Voice Ordering Assistant Banner */}
            <div className="card p-6 bg-gradient-to-br from-[#FFF7DB] to-white border-[#EFDB93] space-y-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FEEFB8] border border-[#EFDB93] flex items-center justify-center text-[#2A5C79] flex-shrink-0">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif text-base font-bold text-[#432F2E]">
                    Voice Order Studio
                  </h4>
                  <p className="text-xs text-[#6A5452]">
                    Natural speech ordering in Hindi or English
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#432F2E] leading-relaxed bg-white/70 p-3 rounded-[10px] border border-[#EFDB93]">
                Try saying: <em>&ldquo;पाँच किलो चावल और दो किलो चीनी&rdquo;</em> or <em>&ldquo;Add 5 kg rice, sunflower oil and toor dal&rdquo;</em>
              </p>

              <Link
                href="/customer/speak"
                className="btn btn-primary block w-full text-center text-xs font-bold shadow-xs"
              >
                Launch Voice Studio
              </Link>
            </div>

            {/* Monthly Bill & Settlement Card */}
            <div className="card p-6 space-y-3 bg-white shadow-xs">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#2A5C79]" />
                  <h4 className="font-serif text-base font-bold text-[#2E201F]">
                    November 2026 Bill
                  </h4>
                </div>
                <span className={`pill text-[10px] py-0 px-2 font-bold ${isPaid ? "pill-success" : "pill-warning"}`}>
                  {isPaid ? "Paid" : "To pay"}
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-[#6A5452]">Net Payable (Asha · A-101)</div>
                <div className="font-serif text-3xl font-bold text-[#2E201F]">
                  ₹720
                </div>
              </div>

              <p className="text-xs text-[#6A5452] leading-relaxed">
                {isPaid
                  ? "Payment received and verified by gateway. Bill reference GM-2611-001 issued."
                  : "Fair proportional share. Sri Lakshmi Stores packed 4 items. Zero delivery fee."}
              </p>

              <Link
                href="/customer/bill"
                className="btn btn-primary block w-full text-center text-xs font-bold"
              >
                {isPaid ? "View Receipt GM-2611-001" : "Review & Pay ₹720"}
              </Link>
            </div>

            {/* Role Workspace Navigation (For Evaluation) */}
            <div className="card p-5 bg-[#F3F8FB] border-[#B3CEDE] space-y-2.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#6A5452] block">
                Stakeholder Workspaces
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  href="/retailer"
                  className="p-2.5 rounded-[10px] bg-white border border-[#B3CEDE] hover:border-[#432F2E] flex flex-col justify-between transition-all"
                >
                  <Store className="w-4 h-4 text-[#2A5C79] mb-1" />
                  <b className="text-[#432F2E] block">Retailer Portal</b>
                  <span className="text-[10px] text-[#6A5452]">Packing Wizard</span>
                </Link>

                <Link
                  href="/admin"
                  className="p-2.5 rounded-[10px] bg-white border border-[#B3CEDE] hover:border-[#432F2E] flex flex-col justify-between transition-all"
                >
                  <Truck className="w-4 h-4 text-[#1B6B45] mb-1" />
                  <b className="text-[#432F2E] block">Building Admin</b>
                  <span className="text-[10px] text-[#6A5452]">Delivery Dispatch</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
