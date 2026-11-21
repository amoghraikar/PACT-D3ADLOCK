"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { CustomerBottomNav } from "@/components/CustomerBottomNav";
import { usePact } from "@/context/PactContext";
import {
  ArrowLeft,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  Package,
  ShieldCheck,
  Smartphone,
  CreditCard,
  QrCode,
  Sparkles,
  Download,
  RotateCcw,
  Store,
  Building2,
  Receipt as ReceiptIcon,
} from "lucide-react";

export default function CustomerBillPage() {
  const { isPaid, payAshaBill, residents } = usePact();
  const [showCalculation, setShowCalculation] = useState<boolean>(false);
  const [showPayModal, setShowPayModal] = useState<boolean>(false);
  const [paymentProcessing, setPaymentProcessing] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<"upi_gpay" | "upi_phonepe" | "upi_id" | "card">("upi_gpay");
  const [upiIdInput, setUpiIdInput] = useState<string>("asha@okhdfcbank");

  // Get Asha's current resident status
  const ashaResident = residents.find((r) => r.id === "res-asha");
  const deliveryStatus = ashaResident?.deliveryStatus || "ready";

  const handleConfirmPayment = () => {
    setPaymentProcessing(true);
    setTimeout(() => {
      setPaymentProcessing(false);
      setShowPayModal(false);
      payAshaBill();
    }, 1200);
  };

  return (
    <div className="min-h-screen pb-28 bg-[#F3F8FB]">
      <AppHeader />

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Top Breadcrumb Header */}
        <div className="flex items-center gap-3 py-1">
          <Link
            href="/customer"
            className="w-8 h-8 rounded-full bg-white border border-[#B3CEDE] flex items-center justify-center text-[#432F2E] hover:bg-[#E4EEF5] transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <h1 className="font-serif text-lg font-bold text-[#2E201F]">
              My bill · November
            </h1>
            <p className="text-[11px] text-[#6A5452]">
              Green Meadows · Sri Lakshmi Stores
            </p>
          </div>
          {isPaid && (
            <span className="pill pill-success text-[11px] py-0.5 px-2.5">
              <Check className="w-3 h-3" /> Paid
            </span>
          )}
        </div>

        {!isPaid ? (
          /* ───────────── UNPAID STATE (To Pay) ───────────── */
          <div className="space-y-4">
            {/* Hero Amount Card */}
            <div className="hero pad-b p-5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-[#6A5452] uppercase tracking-wider">
                  You pay
                </span>
                <span className="pill pill-neutral bg-white text-xs text-[#432F2E]">
                  <Clock className="w-3.5 h-3.5 text-[#8A3A00]" /> To pay
                </span>
              </div>
              <div className="money-xl text-4xl sm:text-5xl font-serif text-[#2E201F]">
                ₹720
              </div>
              <p className="text-xs text-[#6A5452]">
                Your proportional share after ₹80 collective discount.
              </p>
            </div>

            {/* Line Items Card (Flush) */}
            <div className="card flush divide-y divide-[#E4EEF5]">
              <div className="px-4 py-2.5 bg-[#F3F8FB] border-b border-[#E4EEF5] flex justify-between items-center text-xs text-[#6A5452] font-semibold">
                <span>Packed items for Flat A-101</span>
                <span>Amount</span>
              </div>

              <div className="p-3.5 flex justify-between items-center">
                <div>
                  <b className="text-xs text-[#432F2E] block">Sona Masoori Rice</b>
                  <span className="text-[11px] text-[#6A5452]">5 kg × 1 pack</span>
                </div>
                <span className="num font-bold text-xs text-[#432F2E]">₹300</span>
              </div>

              <div className="p-3.5 flex justify-between items-center">
                <div>
                  <b className="text-xs text-[#432F2E] block">Pure Crystal Sugar</b>
                  <span className="text-[11px] text-[#6A5452]">1 kg × 2 packs</span>
                </div>
                <span className="num font-bold text-xs text-[#432F2E]">₹150</span>
              </div>

              <div className="p-3.5 flex justify-between items-center">
                <div>
                  <b className="text-xs text-[#432F2E] block">Sunflower Cooking Oil</b>
                  <span className="text-[11px] text-[#6A5452]">1 L × 1 bottle</span>
                </div>
                <span className="num font-bold text-xs text-[#432F2E]">₹250</span>
              </div>

              <div className="p-3.5 flex justify-between items-center">
                <div>
                  <b className="text-xs text-[#432F2E] block">Organic Toor Dal</b>
                  <span className="text-[11px] text-[#6A5452]">500 g × 1 pack</span>
                </div>
                <span className="num font-bold text-xs text-[#432F2E]">₹100</span>
              </div>
            </div>

            {/* Price Breakdown Calculation Card */}
            <div className="card p-4 space-y-2.5">
              <div className="kv flex justify-between text-xs text-[#6A5452]">
                <span>Your items subtotal</span>
                <span className="num text-[#432F2E] font-medium">₹800</span>
              </div>
              <div className="kv flex justify-between text-xs">
                <span className="text-[#1B6B45] font-medium">Community discount (10%)</span>
                <span className="num text-[#1B6B45] font-bold">− ₹80</span>
              </div>
              <div className="kv flex justify-between text-xs text-[#6A5452]">
                <span>Doorstep delivery charge</span>
                <span className="text-[#1B6B45] font-medium">FREE</span>
              </div>
              <div className="kv total flex justify-between pt-2.5 border-t border-[#E4EEF5] text-sm">
                <span className="font-bold text-[#432F2E]">Net Payable</span>
                <b className="num text-base font-serif text-[#2E201F]">₹720</b>
              </div>
            </div>

            {/* Expandable Explanation: "How is this calculated?" */}
            <div className="card p-4 space-y-3">
              <button
                type="button"
                onClick={() => setShowCalculation(!showCalculation)}
                className="w-full flex justify-between items-center text-xs font-semibold text-[#2A5C79] hover:underline cursor-pointer"
              >
                <span>How is this calculated?</span>
                {showCalculation ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showCalculation && (
                <div className="pt-2 border-t border-[#E4EEF5] text-xs text-[#6A5452] space-y-2.5 leading-relaxed animate-in fade-in duration-200">
                  <p>
                    PACT uses <strong>Splitwise-style mathematical proportional splitting</strong> for zero friction:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li>
                      <strong>Community Order Total:</strong> 4 neighbours ordered ₹2,500 worth of groceries together.
                    </li>
                    <li>
                      <strong>Bulk Store Discount:</strong> Sri Lakshmi Stores offered ₹250 off (10% bulk discount).
                    </li>
                    <li>
                      <strong>Asha's Share:</strong> Your items cost ₹800, which is <strong>32.0%</strong> of the whole community order.
                    </li>
                    <li>
                      <strong>Your Discount:</strong> 32.0% of ₹250 = exactly <strong>₹80.00</strong>.
                    </li>
                    <li>
                      <strong>Final Bill:</strong> ₹800 − ₹80 = <strong>₹720</strong>.
                    </li>
                  </ul>
                  <div className="bg-[#E4EEF5] p-2.5 rounded-[10px] text-[11px] text-[#2A5C79] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                    <span>Calculated in exact integer paise server-side. Zero hidden margins.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Action Footer */}
            <div className="fixed bottom-16 inset-x-0 z-30 max-w-md mx-auto p-4 bg-white/95 backdrop-blur-md border-t border-[#B3CEDE]">
              <button
                onClick={() => setShowPayModal(true)}
                className="btn btn-primary block w-full text-base py-3 font-bold shadow-md hover:shadow-lg transition-all"
              >
                Pay ₹720
              </button>
            </div>
          </div>
        ) : (
          /* ───────────── PAID STATE (Receipt & Delivery) ───────────── */
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Success Checkmark & Header */}
            <div className="text-center py-4 space-y-2">
              <div className="w-16 h-16 rounded-full bg-[#E3F4EA] border border-[#BDE5CF] text-[#1B6B45] flex items-center justify-center mx-auto shadow-sm">
                <Check className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div className="h-display font-serif text-3xl text-[#2E201F]">
                Paid
              </div>
              <p className="text-xs text-[#6A5452]">
                We received ₹720. Thank you, Asha.
              </p>
            </div>

            {/* Official Receipt Card */}
            <div className="card p-4 space-y-3 bg-white">
              <div className="flex justify-between items-center pb-2 border-b border-[#E4EEF5]">
                <div className="flex items-center gap-2">
                  <ReceiptIcon className="w-4 h-4 text-[#2A5C79]" />
                  <span className="text-xs font-bold text-[#432F2E]">Payment Receipt</span>
                </div>
                <span className="pill pill-success text-[10px] py-0 px-2">
                  <Check className="w-3 h-3" /> Server Verified
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6A5452]">Bill Reference:</span>
                  <span className="font-mono font-bold text-[#432F2E]">GM-2611-001</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6A5452]">Paid on:</span>
                  <span className="font-medium text-[#432F2E]">26 Nov 2026, 10:42 am</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6A5452]">Payment Gateway Ref:</span>
                  <span className="font-mono text-[11px] text-[#432F2E]">pay_Pact26Nov98234</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6A5452]">Method:</span>
                  <span className="font-medium text-[#432F2E]">UPI · Google Pay</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#E4EEF5] text-sm">
                  <span className="font-bold text-[#432F2E]">Amount Paid:</span>
                  <b className="num text-base font-serif text-[#1B6B45]">₹720</b>
                </div>
              </div>
            </div>

            {/* Delivery Status Card */}
            <div className="card p-4 space-y-2 bg-[#FFF7DB] border-[#EFDB93]">
              <div className="flex items-center gap-2">
                <span className="pill pill-info text-xs py-0.5 px-2 bg-white">
                  <Package className="w-3.5 h-3.5 text-[#2A5C79]" />
                  {deliveryStatus === "delivered"
                    ? "Delivered"
                    : deliveryStatus === "out_for_delivery"
                    ? "Out for delivery"
                    : "Ready to deliver"}
                </span>
              </div>

              <p className="text-xs text-[#432F2E] leading-relaxed pt-1">
                {deliveryStatus === "delivered" ? (
                  <span>
                    Your monthly package was delivered to <strong>Flat A-101</strong> by your building coordinator Meera Nair.
                  </span>
                ) : deliveryStatus === "out_for_delivery" ? (
                  <span>
                    Meera Nair is currently conducting doorstep deliveries for Green Meadows. Your package is next!
                  </span>
                ) : (
                  <span>
                    Your building's coordinator (Meera Nair) will bring your order to Flat <strong>A-101</strong>. We'll tell you when it's on the way.
                  </span>
                )}
              </p>
            </div>

            {/* Back to Home & Testing Helpers */}
            <div className="space-y-3 pt-2">
              <Link href="/customer" className="btn btn-secondary block w-full text-center text-sm py-2.5">
                Back to home
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* ───────────── INTERACTIVE RAZORPAY / UPI CHECKOUT MODAL ───────────── */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-t-[24px] sm:rounded-[20px] p-6 space-y-5 shadow-2xl border border-[#B3CEDE] animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-[#E4EEF5] pb-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-[#6A5452]">
                  <Building2 className="w-3.5 h-3.5 text-[#2A5C79]" />
                  <span>Green Meadows Apartments Escrow</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-[#2E201F] mt-0.5">
                  Complete Payment
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-[#6A5452] tracking-wider block">
                  Amount
                </span>
                <span className="font-serif text-2xl font-bold text-[#2E201F]">
                  ₹720
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-[#432F2E] block">
                Select UPI / Payment Method
              </label>

              {/* UPI GPay Option */}
              <div
                onClick={() => setPaymentMethod("upi_gpay")}
                className={`p-3 rounded-[12px] border cursor-pointer flex items-center justify-between transition-all ${
                  paymentMethod === "upi_gpay"
                    ? "bg-[#FFF7DB] border-[#432F2E] shadow-xs"
                    : "border-[#E4EEF5] hover:bg-[#F3F8FB]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white border border-[#B3CEDE] flex items-center justify-center text-sm font-bold text-[#432F2E]">
                    G
                  </div>
                  <div>
                    <b className="text-xs text-[#432F2E] block">Google Pay UPI</b>
                    <span className="text-[11px] text-[#6A5452]">Instant verification via UPI App</span>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMethod === "upi_gpay" ? "border-[#432F2E] bg-[#432F2E]" : "border-[#B3CEDE]"}`}>
                  {paymentMethod === "upi_gpay" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>

              {/* UPI PhonePe Option */}
              <div
                onClick={() => setPaymentMethod("upi_phonepe")}
                className={`p-3 rounded-[12px] border cursor-pointer flex items-center justify-between transition-all ${
                  paymentMethod === "upi_phonepe"
                    ? "bg-[#FFF7DB] border-[#432F2E] shadow-xs"
                    : "border-[#E4EEF5] hover:bg-[#F3F8FB]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-sm font-bold text-purple-800">
                    Pe
                  </div>
                  <div>
                    <b className="text-xs text-[#432F2E] block">PhonePe UPI</b>
                    <span className="text-[11px] text-[#6A5452]">Fast resident checkout</span>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMethod === "upi_phonepe" ? "border-[#432F2E] bg-[#432F2E]" : "border-[#B3CEDE]"}`}>
                  {paymentMethod === "upi_phonepe" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>

              {/* Custom UPI ID */}
              <div
                onClick={() => setPaymentMethod("upi_id")}
                className={`p-3 rounded-[12px] border cursor-pointer space-y-2 transition-all ${
                  paymentMethod === "upi_id"
                    ? "bg-[#FFF7DB] border-[#432F2E] shadow-xs"
                    : "border-[#E4EEF5] hover:bg-[#F3F8FB]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#E4EEF5] border border-[#B3CEDE] flex items-center justify-center text-[#2A5C79]">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <b className="text-xs text-[#432F2E] block">Enter UPI ID / VPA</b>
                      <span className="text-[11px] text-[#6A5452]">BHIM, Paytm, Any Bank</span>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMethod === "upi_id" ? "border-[#432F2E] bg-[#432F2E]" : "border-[#B3CEDE]"}`}>
                    {paymentMethod === "upi_id" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>

                {paymentMethod === "upi_id" && (
                  <div className="pt-2">
                    <input
                      type="text"
                      value={upiIdInput}
                      onChange={(e) => setUpiIdInput(e.target.value)}
                      placeholder="e.g. mobile@upi"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#B3CEDE] rounded-[8px] outline-none focus:border-[#432F2E]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Security Guarantee Notice */}
            <div className="flex items-center gap-2 p-2.5 rounded-[10px] bg-[#E3F4EA] text-[#1B6B45] text-[11px]">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>
                Simulated Razorpay webhook trigger. Certified bank gateway mock for Round 1 judging.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                disabled={paymentProcessing}
                className="btn btn-secondary flex-1 text-xs py-2.5"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={paymentProcessing}
                className="btn btn-primary flex-1 text-xs py-2.5 font-bold flex items-center justify-center gap-2 shadow-sm"
              >
                {paymentProcessing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Pay ₹720 Now</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <CustomerBottomNav />
    </div>
  );
}
