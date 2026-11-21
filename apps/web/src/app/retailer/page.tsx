"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { HeaderNav } from "@/components/HeaderNav";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Wallet,
  Check,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Plus,
  Minus,
} from "lucide-react";

export default function RetailerWorkspace() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "packing" | "billing" | "payments">("dashboard");
  const [packTab, setPackTab] = useState<"customer" | "product">("customer");

  // Packing quantities
  const [packed, setPacked] = useState<{ [key: string]: number }>({
    "asha-rice": 1,
    "asha-sugar": 2,
    "asha-oil": 1,
    "asha-dal": 1,
    "bharat-rice": 2,
    "dev-rice": 2,
    "dev-dal": 0, // Dev short on dal
  });

  const updatePack = (key: string, delta: number) => {
    setPacked((prev) => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) + delta),
    }));
  };

  return (
    <div className="min-h-screen bg-[#F3F8FB] flex flex-col">
      <HeaderNav />

      {/* Retailer Tab Bar */}
      <div className="bg-[#E4EEF5] border-b border-[#B3CEDE] py-2 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2A5C79]">
              Sri Lakshmi Stores Workspace:
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                activeTab === "dashboard" ? "bg-[#432F2E] text-[#FEEFB8] font-bold" : "bg-white text-[#432F2E]"
              }`}
            >
              1. Dashboard
            </button>
            <button
              onClick={() => setActiveTab("packing")}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                activeTab === "packing" ? "bg-[#432F2E] text-[#FEEFB8] font-bold" : "bg-white text-[#432F2E]"
              }`}
            >
              2. Packing (Step 3)
            </button>
            <button
              onClick={() => setActiveTab("billing")}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                activeTab === "billing" ? "bg-[#432F2E] text-[#FEEFB8] font-bold" : "bg-white text-[#432F2E]"
              }`}
            >
              3. Bill & Split (Step 4)
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                activeTab === "payments" ? "bg-[#432F2E] text-[#FEEFB8] font-bold" : "bg-white text-[#432F2E]"
              }`}
            >
              4. Payment Collection
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        <div className="desk">
          {/* Sidebar */}
          <aside className="side">
            <div className="mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/pact-logo-lockup.png"
                alt="PACT"
                style={{ height: "36px", width: "auto" }}
                className="h-9 w-auto object-contain"
              />
            </div>

            <a
              onClick={() => setActiveTab("dashboard")}
              className={activeTab === "dashboard" ? "on" : ""}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </a>
            <a
              onClick={() => setActiveTab("packing")}
              className={activeTab === "packing" || activeTab === "billing" ? "on" : ""}
            >
              <Package className="w-4 h-4" />
              <span>Orders</span>
              <em>1</em>
            </a>
            <a>
              <Boxes className="w-4 h-4" />
              <span>Inventory</span>
            </a>
            <a
              onClick={() => setActiveTab("payments")}
              className={activeTab === "payments" ? "on" : ""}
            >
              <Wallet className="w-4 h-4" />
              <span>Payments</span>
            </a>

            <div className="who">
              <b>Sri Lakshmi Stores</b>
              <span>Ravi (Owner)</span>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="dmain">
            {/* ================= VIEW 1: DASHBOARD ================= */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                <div>
                  <h4 className="title">Good morning, Ravi</h4>
                  <p className="text-sm text-[#6A5452]">Here is what is happening across your collective community orders:</p>
                </div>

                {/* 4 Key Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="card p-4 space-y-1">
                    <span className="text-xs font-semibold text-[#6A5452]">Sales this month</span>
                    <div className="text-2xl font-bold text-[#432F2E]">₹1,890</div>
                    <span className="text-[11px] text-[#7A6462] block">First month · 1 building</span>
                  </div>

                  <div className="card p-4 space-y-1">
                    <span className="text-xs font-semibold text-[#6A5452]">New customers</span>
                    <div className="text-2xl font-bold text-[#432F2E]">4</div>
                    <span className="text-[11px] text-[#7A6462] block">Ordered for the first time</span>
                  </div>

                  <div className="card p-4 space-y-1">
                    <span className="text-xs font-semibold text-[#6A5452]">Orders</span>
                    <div className="text-2xl font-bold text-[#432F2E]">1</div>
                    <span className="text-[11px] text-[#7A6462] block">1 active bulk order</span>
                  </div>

                  <div className="card p-4 space-y-1">
                    <span className="text-xs font-semibold text-[#6A5452]">Running low</span>
                    <div className="text-2xl font-bold text-[#8A3A00]">2</div>
                    <span className="pill pill-warning text-[10px] h-5 py-0 px-2 mt-1">
                      <AlertTriangle className="w-3 h-3" /> Needs stock
                    </span>
                  </div>
                </div>

                {/* Two Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Community Orders Table */}
                  <div className="card flush lg:col-span-2">
                    <div className="p-4 border-b border-[#E4EEF5] flex justify-between items-center">
                      <h5 className="font-serif font-bold text-lg text-[#432F2E]">Community Orders</h5>
                      <span className="text-xs font-medium text-[#2A5C79] cursor-pointer hover:underline">
                        View history
                      </span>
                    </div>
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Building</th>
                          <th className="r">Bill Total</th>
                          <th>Status</th>
                          <th className="r">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            <b className="text-sm block">Green Meadows Apartments</b>
                            <span className="text-xs text-[#6A5452]">Nov 2026 · 4 residents</span>
                          </td>
                          <td className="r font-bold">₹2,250</td>
                          <td>
                            <span className="pill pill-info text-xs">
                              <Wallet className="w-3 h-3" /> Collecting payments
                            </span>
                          </td>
                          <td className="r">
                            <button
                              onClick={() => setActiveTab("packing")}
                              className="btn btn-secondary md h-8 text-xs"
                            >
                              Open Order
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Stock Alerts */}
                  <div className="card flush">
                    <div className="p-4 border-b border-[#E4EEF5]">
                      <h5 className="font-serif font-bold text-lg text-[#432F2E]">Low Stock Alerts</h5>
                    </div>
                    <div className="divide-y divide-[#E4EEF5] text-xs">
                      <div className="p-3 flex items-center justify-between">
                        <div>
                          <b className="block">Toor Dal · 500 g</b>
                          <span className="text-red-600 font-medium">4 left · alert below 10</span>
                        </div>
                        <button className="btn btn-quiet md text-xs">Add stock</button>
                      </div>
                      <div className="p-3 flex items-center justify-between">
                        <div>
                          <b className="block">Sugar · 1 kg</b>
                          <span className="text-red-600 font-medium">6 left · alert below 12</span>
                        </div>
                        <button className="btn btn-quiet md text-xs">Add stock</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= VIEW 2: PACKING WIZARD ================= */}
            {activeTab === "packing" && (
              <div className="space-y-6">
                <div className="flex flex-wrap justify-between items-end gap-4">
                  <div>
                    <div className="text-xs text-[#6A5452]">Orders / Green Meadows Apartments</div>
                    <h4 className="title text-2xl font-serif">November 2026 Order</h4>
                  </div>
                  <button
                    onClick={() => setActiveTab("billing")}
                    className="btn btn-primary md"
                  >
                    Continue to Bill (Step 4) <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>

                {/* 4 Steps Indicator */}
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#1B6B45]">
                    <div className="w-6 h-6 rounded-full bg-[#1B6B45] text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    1. Review
                  </div>
                  <div className="w-8 h-0.5 bg-[#1B6B45]" />
                  <div className="flex items-center gap-1.5 font-bold text-[#1B6B45]">
                    <div className="w-6 h-6 rounded-full bg-[#1B6B45] text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    2. Accept
                  </div>
                  <div className="w-8 h-0.5 bg-[#1B6B45]" />
                  <div className="flex items-center gap-1.5 font-bold text-[#2E201F]">
                    <div className="w-6 h-6 rounded-full bg-[#2A5C79] text-white flex items-center justify-center">
                      3
                    </div>
                    3. Pack
                  </div>
                  <div className="w-8 h-0.5 bg-[#B3CEDE]" />
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <div className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center">
                      4
                    </div>
                    4. Bill
                  </div>
                </div>

                {/* Customer / Product Tabs */}
                <div className="flex gap-4 border-b border-[#B3CEDE]">
                  <button
                    onClick={() => setPackTab("customer")}
                    className={`pb-2 text-sm font-semibold transition-all ${
                      packTab === "customer" ? "text-[#432F2E] border-b-2 border-[#432F2E]" : "text-[#6A5452]"
                    }`}
                  >
                    By Customer
                  </button>
                  <button
                    onClick={() => setPackTab("product")}
                    className={`pb-2 text-sm font-semibold transition-all ${
                      packTab === "product" ? "text-[#432F2E] border-b-2 border-[#432F2E]" : "text-[#6A5452]"
                    }`}
                  >
                    By Product
                  </button>
                </div>

                {/* Customer Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Asha A-101 */}
                  <div className="card p-4 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-[#E4EEF5]">
                      <span className="font-bold text-sm text-[#432F2E]">Asha · Flat A-101</span>
                      <span className="pill pill-success text-[11px]">
                        <Check className="w-3 h-3" /> All packed
                      </span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <div>
                          <b>Sona Masoori Rice · 5 kg</b>
                          <span className="text-gray-400 block">Asked: 1</span>
                        </div>
                        <div className="stepper h-7">
                          <button onClick={() => updatePack("asha-rice", -1)}><Minus className="w-3 h-3" /></button>
                          <span>{packed["asha-rice"]}</span>
                          <button onClick={() => updatePack("asha-rice", 1)}><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <b>Sugar · 1 kg</b>
                          <span className="text-gray-400 block">Asked: 2</span>
                        </div>
                        <div className="stepper h-7">
                          <button onClick={() => updatePack("asha-sugar", -1)}><Minus className="w-3 h-3" /></button>
                          <span>{packed["asha-sugar"]}</span>
                          <button onClick={() => updatePack("asha-sugar", 1)}><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <b>Sunflower Oil · 1 L</b>
                          <span className="text-gray-400 block">Asked: 1</span>
                        </div>
                        <div className="stepper h-7">
                          <button onClick={() => updatePack("asha-oil", -1)}><Minus className="w-3 h-3" /></button>
                          <span>{packed["asha-oil"]}</span>
                          <button onClick={() => updatePack("asha-oil", 1)}><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <b>Toor Dal · 500 g</b>
                          <span className="text-gray-400 block">Asked: 1</span>
                        </div>
                        <div className="stepper h-7">
                          <button onClick={() => updatePack("asha-dal", -1)}><Minus className="w-3 h-3" /></button>
                          <span>{packed["asha-dal"]}</span>
                          <button onClick={() => updatePack("asha-dal", 1)}><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dev D-402 - Shortage Illustration */}
                  <div className="card p-4 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-[#E4EEF5]">
                      <span className="font-bold text-sm text-[#432F2E]">Dev · Flat D-402</span>
                      <span className="pill pill-warning text-[11px]">
                        <AlertTriangle className="w-3 h-3" /> 1 line short
                      </span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <div>
                          <b>Sona Masoori Rice · 5 kg</b>
                          <span className="text-gray-400 block">Asked: 2</span>
                        </div>
                        <div className="stepper h-7">
                          <button onClick={() => updatePack("dev-rice", -1)}><Minus className="w-3 h-3" /></button>
                          <span>{packed["dev-rice"]}</span>
                          <button onClick={() => updatePack("dev-rice", 1)}><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>

                      {/* Out of stock line */}
                      <div className="p-2 bg-[#FFE3C4] text-[#8A3A00] rounded-[8px] flex justify-between items-center">
                        <div>
                          <b>Toor Dal · 500 g</b>
                          <span className="text-[10px] block font-semibold">Asked 1 · Out of stock</span>
                        </div>
                        <div className="stepper h-7 bg-white">
                          <button onClick={() => updatePack("dev-dal", -1)}><Minus className="w-3 h-3" /></button>
                          <span>{packed["dev-dal"]}</span>
                          <button onClick={() => updatePack("dev-dal", 1)}><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= VIEW 3: FINAL BILL & SPLIT ================= */}
            {activeTab === "billing" && (
              <div className="space-y-6">
                <div>
                  <div className="text-xs text-[#6A5452]">Orders / Green Meadows Apartments</div>
                  <h4 className="title text-2xl font-serif">Step 4: Final Bill & Community Split</h4>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Master Store Bill Table */}
                  <div className="card flush lg:col-span-2">
                    <table className="tbl text-xs">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th className="r">Packed</th>
                          <th className="r">Store Price</th>
                          <th className="r">Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><b>Sona Masoori Rice</b> · 5 kg</td>
                          <td className="r">6</td>
                          <td className="r">₹300</td>
                          <td className="r font-bold">₹1,800</td>
                        </tr>
                        <tr>
                          <td><b>Sugar</b> · 1 kg</td>
                          <td className="r">2</td>
                          <td className="r">₹75</td>
                          <td className="r font-bold">₹150</td>
                        </tr>
                        <tr>
                          <td><b>Sunflower Cooking Oil</b> · 1 L</td>
                          <td className="r">1</td>
                          <td className="r">₹250</td>
                          <td className="r font-bold">₹250</td>
                        </tr>
                        <tr>
                          <td><b>Toor Dal</b> · 500 g</td>
                          <td className="r">3</td>
                          <td className="r">₹100</td>
                          <td className="r font-bold">₹300</td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="p-4 border-t border-[#B3CEDE] bg-[#F3F8FB] grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="font-semibold block mb-1">Wholesale Order Discount (₹):</label>
                        <div className="input bg-white h-9 text-xs">
                          <span className="pre">₹</span>
                          <span className="font-bold">250</span>
                        </div>
                      </div>
                      <div>
                        <label className="font-semibold block mb-1">Delivery Charge (₹):</label>
                        <div className="input bg-white h-9 text-xs">
                          <span className="pre">₹</span>
                          <span className="font-bold">0</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Splitwise-style Math Breakdown */}
                  <div className="space-y-4">
                    <div className="card p-4 space-y-3 bg-[#E4EEF5] border-[#B3CEDE]">
                      <h5 className="font-serif font-bold text-base text-[#432F2E]">
                        Proportional Bill Division
                      </h5>
                      <div className="divide-y divide-[#B3CEDE] text-xs">
                        <div className="py-2 flex justify-between">
                          <span>Asha (A-101)</span>
                          <b className="num text-[#432F2E]">₹720</b>
                        </div>
                        <div className="py-2 flex justify-between">
                          <span>Bharat (B-204)</span>
                          <b className="num text-[#432F2E]">₹540</b>
                        </div>
                        <div className="py-2 flex justify-between">
                          <span>Chitra (C-305)</span>
                          <b className="num text-[#432F2E]">₹360</b>
                        </div>
                        <div className="py-2 flex justify-between">
                          <span>Dev (D-402)</span>
                          <b className="num text-[#432F2E]">₹630</b>
                        </div>
                      </div>
                      <span className="pill pill-success text-xs w-full justify-center">
                        <Check className="w-3.5 h-3.5" /> Sum adds up exactly to ₹2,250
                      </span>
                    </div>

                    <div className="card p-4 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span>Items Subtotal:</span>
                        <span className="num font-semibold">₹2,500</span>
                      </div>
                      <div className="flex justify-between text-[#1B6B45]">
                        <span>Bulk Discount Applied:</span>
                        <span className="num font-bold">− ₹250</span>
                      </div>
                      <div className="flex justify-between text-base font-bold text-[#432F2E] border-t border-[#E4EEF5] pt-2">
                        <span>Final Bill:</span>
                        <span>₹2,250</span>
                      </div>
                      <button
                        onClick={() => setActiveTab("payments")}
                        className="btn btn-primary block w-full text-xs mt-3"
                      >
                        Finalise & Send Bills to Residents
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= VIEW 4: PAYMENT COLLECTION ================= */}
            {activeTab === "payments" && (
              <div className="space-y-6">
                <div>
                  <div className="text-xs text-[#6A5452]">Payments / Green Meadows Apartments</div>
                  <h4 className="title text-2xl font-serif">November 2026 Collections</h4>
                </div>

                <div className="card p-6 space-y-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="flex items-baseline gap-2">
                      <b className="text-3xl font-bold font-mono text-[#432F2E]">₹1,890</b>
                      <span className="text-sm text-[#6A5452]">of ₹2,250 received (84%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="pill pill-success text-xs">
                        <Check className="w-3 h-3" /> 3 paid
                      </span>
                      <span className="pill pill-neutral text-xs">
                        <Clock className="w-3 h-3" /> 1 unpaid (₹360)
                      </span>
                    </div>
                  </div>

                  <div className="progress">
                    <i style={{ width: "84%" }}></i>
                  </div>
                </div>

                {/* Residents Payments Table */}
                <div className="card flush">
                  <table className="tbl text-xs">
                    <thead>
                      <tr>
                        <th>Resident</th>
                        <th>Flat</th>
                        <th className="r">Amount</th>
                        <th>Status</th>
                        <th>Paid On</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><b>Asha</b></td>
                        <td>A-101</td>
                        <td className="r font-bold">₹720</td>
                        <td>
                          <span className="pill pill-success text-xs">
                            <Check className="w-3 h-3" /> Paid
                          </span>
                        </td>
                        <td>26 Nov, 10:42 am</td>
                      </tr>
                      <tr>
                        <td><b>Bharat</b></td>
                        <td>B-204</td>
                        <td className="r font-bold">₹540</td>
                        <td>
                          <span className="pill pill-success text-xs">
                            <Check className="w-3 h-3" /> Paid
                          </span>
                        </td>
                        <td>26 Nov, 6:15 pm</td>
                      </tr>
                      <tr>
                        <td><b>Dev</b></td>
                        <td>D-402</td>
                        <td className="r font-bold">₹630</td>
                        <td>
                          <span className="pill pill-success text-xs">
                            <Check className="w-3 h-3" /> Paid
                          </span>
                        </td>
                        <td>27 Nov, 9:03 am</td>
                      </tr>
                      <tr className="bg-[#FFF7DB]/50">
                        <td><b>Chitra</b></td>
                        <td>C-305</td>
                        <td className="r font-bold">₹360</td>
                        <td>
                          <span className="pill pill-neutral text-xs">
                            <Clock className="w-3 h-3" /> To pay
                          </span>
                        </td>
                        <td className="text-gray-400">Awaiting payment</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
