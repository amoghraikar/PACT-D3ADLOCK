"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { HeaderNav } from "@/components/HeaderNav";
import {
  LayoutDashboard,
  Check,
  Clock,
  Send,
  Truck,
  Package,
  Building2,
  CheckCircle2,
} from "lucide-react";

export default function AdminWorkspace() {
  const [activeTab, setActiveTab] = useState<"paid" | "unpaid">("paid");

  // Interactive delivery statuses
  const [deliveries, setDeliveries] = useState<{ [flat: string]: string }>({
    "D-402": "Ready to deliver",
    "B-204": "On the way",
    "A-101": "Delivered",
  });

  const [reminderSent, setReminderSent] = useState<boolean>(false);

  const advanceDelivery = (flat: string) => {
    setDeliveries((prev) => {
      const current = prev[flat];
      if (current === "Ready to deliver") return { ...prev, [flat]: "On the way" };
      if (current === "On the way") return { ...prev, [flat]: "Delivered" };
      return prev;
    });
  };

  return (
    <div className="min-h-screen bg-[#F3F8FB] flex flex-col">
      <HeaderNav />

      {/* Admin Subheader */}
      <div className="bg-[#E4EEF5] border-b border-[#B3CEDE] py-2 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2A5C79]">
              Green Meadows Building Coordinator:
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("paid")}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                activeTab === "paid" ? "bg-[#432F2E] text-[#FEEFB8] font-bold" : "bg-white text-[#432F2E]"
              }`}
            >
              Paid & Ready to Deliver (3)
            </button>
            <button
              onClick={() => setActiveTab("unpaid")}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                activeTab === "unpaid" ? "bg-[#432F2E] text-[#FEEFB8] font-bold" : "bg-white text-[#432F2E]"
              }`}
            >
              Still to Pay / Remind (1)
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        <div className="desk">
          {/* Sidebar */}
          <aside className="side">
            <div className="w-[140px] h-[40px] relative mb-3">
              <Image src="/brand/pact-logo-lockup.png" alt="PACT" fill className="object-contain" />
            </div>

            <a onClick={() => setActiveTab("paid")} className={activeTab === "paid" ? "on" : ""}>
              <Check className="w-4 h-4" />
              <span>Paid & Deliver</span>
              <em>3</em>
            </a>
            <a onClick={() => setActiveTab("unpaid")} className={activeTab === "unpaid" ? "on" : ""}>
              <Clock className="w-4 h-4" />
              <span>Unpaid</span>
              <em>1</em>
            </a>

            <div className="who">
              <b>Green Meadows Apts</b>
              <span>Meera (Coordinator)</span>
            </div>
          </aside>

          {/* Main Area */}
          <div className="dmain space-y-6">
            <div>
              <h4 className="title">November 2026 Distribution</h4>
              <p className="text-sm text-[#6A5452]">Manage doorstep deliveries for neighbours whose payment is confirmed:</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-4 space-y-1">
                <span className="text-xs font-semibold text-[#6A5452]">Residents in order</span>
                <div className="text-2xl font-bold text-[#432F2E]">4</div>
                <span className="text-[11px] text-[#7A6462] block">4 apartment flats</span>
              </div>
              <div className="card p-4 space-y-1">
                <span className="text-xs font-semibold text-[#6A5452]">Total bill</span>
                <div className="text-2xl font-bold text-[#432F2E]">₹2,250</div>
                <span className="text-[11px] text-[#7A6462] block">After Sri Lakshmi discount</span>
              </div>
              <div className="card p-4 space-y-1">
                <span className="text-xs font-semibold text-[#6A5452]">Received</span>
                <div className="text-2xl font-bold text-[#1B6B45]">₹1,890</div>
                <span className="text-[11px] text-[#7A6462] block">3 residents paid</span>
              </div>
              <div className="card p-4 space-y-1">
                <span className="text-xs font-semibold text-[#6A5452]">Still to come</span>
                <div className="text-2xl font-bold text-[#8A3A00]">₹360</div>
                <span className="text-[11px] text-[#7A6462] block">1 resident to pay</span>
              </div>
            </div>

            {/* ================= TAB 1: PAID RESIDENTS ================= */}
            {activeTab === "paid" && (
              <div className="card flush">
                <div className="p-4 border-b border-[#E4EEF5] flex justify-between items-center">
                  <h5 className="font-serif font-bold text-lg text-[#432F2E]">Paid · Ready for Doorstep Delivery</h5>
                  <span className="text-xs text-[#6A5452]">Delivering door-to-door</span>
                </div>

                <table className="tbl text-xs">
                  <thead>
                    <tr>
                      <th>Resident</th>
                      <th>Flat</th>
                      <th className="r">Amount Paid</th>
                      <th>Delivery Status</th>
                      <th className="r">Next Step</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Dev */}
                    <tr>
                      <td><b>Dev</b></td>
                      <td>D-402</td>
                      <td className="r font-bold">₹630</td>
                      <td>
                        <span className={`pill text-xs ${
                          deliveries["D-402"] === "Delivered"
                            ? "pill-success"
                            : "pill-info"
                        }`}>
                          <Package className="w-3 h-3" /> {deliveries["D-402"]}
                        </span>
                      </td>
                      <td className="r">
                        {deliveries["D-402"] !== "Delivered" ? (
                          <button
                            onClick={() => advanceDelivery("D-402")}
                            className="btn btn-primary md h-8 text-xs"
                          >
                            {deliveries["D-402"] === "Ready to deliver" ? "Out for delivery" : "Mark delivered"}
                          </button>
                        ) : (
                          <span className="text-gray-400">Completed</span>
                        )}
                      </td>
                    </tr>

                    {/* Bharat */}
                    <tr>
                      <td><b>Bharat</b></td>
                      <td>B-204</td>
                      <td className="r font-bold">₹540</td>
                      <td>
                        <span className={`pill text-xs ${
                          deliveries["B-204"] === "Delivered"
                            ? "pill-success"
                            : "pill-info"
                        }`}>
                          <Truck className="w-3 h-3" /> {deliveries["B-204"]}
                        </span>
                      </td>
                      <td className="r">
                        {deliveries["B-204"] !== "Delivered" ? (
                          <button
                            onClick={() => advanceDelivery("B-204")}
                            className="btn btn-primary md h-8 text-xs"
                          >
                            Mark delivered
                          </button>
                        ) : (
                          <span className="text-gray-400">Completed</span>
                        )}
                      </td>
                    </tr>

                    {/* Asha */}
                    <tr>
                      <td><b>Asha</b></td>
                      <td>A-101</td>
                      <td className="r font-bold">₹720</td>
                      <td>
                        <span className="pill pill-success text-xs">
                          <Check className="w-3 h-3" /> Delivered
                        </span>
                      </td>
                      <td className="r text-gray-500 text-[11px]">
                        28 Nov, 5:20 pm · by Meera
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* ================= TAB 2: UNPAID RESIDENTS ================= */}
            {activeTab === "unpaid" && (
              <div className="space-y-4">
                <div className="card p-4 flex items-center justify-between border-2 border-[#B3CEDE]">
                  <div className="space-y-1">
                    <b className="text-base text-[#432F2E] block">Chitra · Flat C-305</b>
                    <span className="text-xs text-[#6A5452]">Outstanding: ₹360 (Bill GM-2611-003)</span>
                    <p className="text-[11px] text-[#7A6462]">
                      {reminderSent ? "Reminder sent just now to registered mobile number" : "Not reminded yet today"}
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={() => setReminderSent(true)}
                      className={`btn md text-xs ${reminderSent ? "btn-secondary is-disabled" : "btn-primary"}`}
                    >
                      <Send className="w-3.5 h-3.5 mr-1" />
                      {reminderSent ? "Reminder Sent" : "Send Reminder"}
                    </button>
                  </div>
                </div>

                <div className="card p-4 bg-[#FFF7DB] border-[#EFDB93] text-xs text-[#8A3A00] space-y-1">
                  <b>Strict PACT Business Rule:</b>
                  <p>
                    Building Coordinators can send SMS/WhatsApp payment reminders, but can never manually mark an apartment as paid. All payments must be verified by the payment gateway directly before delivery can be dispatched.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
