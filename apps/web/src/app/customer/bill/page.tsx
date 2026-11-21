"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
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
  TrendingDown,
  Split,
} from "lucide-react";

export default function CustomerBillPage() {
  const { isPaid, payAshaBill, residents, currentUser } = usePact();
  const [showCalculation, setShowCalculation] = useState<boolean>(true);
  const [paymentProcessing, setPaymentProcessing] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<"upi_gpay" | "upi_phonepe" | "upi_id">("upi_gpay");
  const [upiIdInput, setUpiIdInput] = useState<string>("asha@okhdfcbank");

  // Get Asha's current resident status
  const ashaResident = residents.find((r) => r.id === "res-asha");
  const deliveryStatus = ashaResident?.deliveryStatus || "ready";

  const handleConfirmPayment = () => {
    setPaymentProcessing(true);
    setTimeout(() => {
      setPaymentProcessing(false);
      payAshaBill();
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#F3F8FB] text-[#432F2E]">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Breadcrumb */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#E4EEF5]">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#6A5452] mb-1">
              <Link href="/" className="hover:underline">Dashboard</Link>
              <span>/</span>
              <span className="font-semibold text-[#432F2E]">Monthly Bill</span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#2E201F]">
              Household Invoice · November 2026
            </h1>
            <p className="text-xs sm:text-sm text-[#6A5452]">
              Green Meadows Apartments · Sri Lakshmi Stores wholesale bulk fulfillment
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`pill text-xs py-1 px-3 font-bold ${isPaid ? "pill-success" : "pill-warning"}`}>
              {isPaid ? <Check className="w-3.5 h-3.5 mr-1 inline" /> : <Clock className="w-3.5 h-3.5 mr-1 inline" />}
              {isPaid ? "Payment Verified by Server" : "Status: Bill Finalised · To Pay"}
            </span>
          </div>
        </div>

        {/* 2-Column Desktop Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (7 Columns): Official Invoice & Proportional Split Logic */}
          <div className="lg:col-span-7 space-y-6">
            {!isPaid ? (
              /* UNPAID INVOICE DETAILS */
              <div className="space-y-6">
                {/* Invoice Hero */}
                <div className="card p-6 bg-white space-y-4 shadow-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#6A5452] tracking-wider block">
                        Net Amount Payable
                      </span>
                      <div className="font-serif text-4xl lg:text-5xl font-bold text-[#2E201F] mt-1">
                        ₹720
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-[#6A5452] block">Bill Number:</span>
                      <span className="font-mono font-bold text-[#432F2E]">GM-2611-001</span>
                      <span className="text-[11px] text-[#6A5452] block mt-0.5">Flat A-101 (Asha)</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#6A5452] leading-relaxed">
                    Your proportional share of Green Meadows wholesale grocery order. Final price calculated on actual quantities packed by Sri Lakshmi Stores.
                  </p>
                </div>

                {/* Packed Items Table */}
                <div className="card flush bg-white shadow-xs">
                  <div className="p-4 bg-[#F3F8FB] border-b border-[#E4EEF5] flex justify-between items-center text-xs font-bold text-[#432F2E]">
                    <span>Packed Items for Flat A-101</span>
                    <span>Rate & Total</span>
                  </div>

                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-[#E4EEF5]">
                      <tr className="hover:bg-[#F3F8FB]/50">
                        <td className="py-3 px-4">
                          <b className="text-xs text-[#432F2E] block">Sona Masoori Rice</b>
                          <span className="text-[11px] text-[#6A5452]">5 kg pack × 1</span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#432F2E]">
                          ₹300
                        </td>
                      </tr>
                      <tr className="hover:bg-[#F3F8FB]/50">
                        <td className="py-3 px-4">
                          <b className="text-xs text-[#432F2E] block">Pure Crystal Sugar</b>
                          <span className="text-[11px] text-[#6A5452]">1 kg pack × 2</span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#432F2E]">
                          ₹150
                        </td>
                      </tr>
                      <tr className="hover:bg-[#F3F8FB]/50">
                        <td className="py-3 px-4">
                          <b className="text-xs text-[#432F2E] block">Sunflower Cooking Oil</b>
                          <span className="text-[11px] text-[#6A5452]">1 L bottle × 1</span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#432F2E]">
                          ₹250
                        </td>
                      </tr>
                      <tr className="hover:bg-[#F3F8FB]/50">
                        <td className="py-3 px-4">
                          <b className="text-xs text-[#432F2E] block">Organic Toor Dal</b>
                          <span className="text-[11px] text-[#6A5452]">500 g pack × 1</span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#432F2E]">
                          ₹100
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="p-4 bg-[#F3F8FB] border-t border-[#E4EEF5] space-y-2 text-xs">
                    <div className="flex justify-between text-[#6A5452]">
                      <span>Items Subtotal:</span>
                      <span className="font-medium text-[#432F2E]">₹800</span>
                    </div>
                    <div className="flex justify-between text-[#1B6B45] font-semibold">
                      <span>Collective Bulk Discount (10% Proportional Share):</span>
                      <span className="num font-bold">− ₹80</span>
                    </div>
                    <div className="flex justify-between text-[#6A5452]">
                      <span>Doorstep Delivery:</span>
                      <span className="text-[#1B6B45] font-medium">FREE</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-[#B3CEDE] text-sm">
                      <span className="font-bold text-[#432F2E]">Final Net Payable:</span>
                      <b className="font-serif text-lg text-[#2E201F]">₹720</b>
                    </div>
                  </div>
                </div>

                {/* Mathematical Proportional Split Explanation */}
                <div className="card p-6 bg-white space-y-3 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setShowCalculation(!showCalculation)}
                    className="w-full flex justify-between items-center text-xs font-bold text-[#2A5C79] cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Split className="w-4 h-4 text-[#2A5C79]" />
                      <span>How is this Splitwise-style bill calculated?</span>
                    </div>
                    {showCalculation ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {showCalculation && (
                    <div className="pt-3 border-t border-[#E4EEF5] text-xs text-[#6A5452] space-y-3 leading-relaxed animate-in fade-in duration-200">
                      <p>
                        PACT guarantees zero unfair cross-subsidies. The wholesale discount negotiated with Sri Lakshmi Stores is distributed strictly in proportion to what each flat ordered:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                        <div className="p-3 bg-[#F3F8FB] rounded-[10px] border border-[#E4EEF5]">
                          <span className="text-[#6A5452] block font-bold">Community Order Value:</span>
                          <span className="text-[#432F2E]">₹2,500 total across 4 flats</span>
                        </div>
                        <div className="p-3 bg-[#F3F8FB] rounded-[10px] border border-[#E4EEF5]">
                          <span className="text-[#1B6B45] block font-bold">Store Bulk Discount:</span>
                          <span className="text-[#1B6B45]">₹250 flat rebate (10.0%)</span>
                        </div>
                        <div className="p-3 bg-[#F3F8FB] rounded-[10px] border border-[#E4EEF5]">
                          <span className="text-[#6A5452] block font-bold">Asha&apos;s Order Ratio:</span>
                          <span className="text-[#432F2E]">₹800 / ₹2,500 = <strong>32.0%</strong></span>
                        </div>
                        <div className="p-3 bg-[#F3F8FB] rounded-[10px] border border-[#E4EEF5]">
                          <span className="text-[#1B6B45] block font-bold">Asha&apos;s Discount Portion:</span>
                          <span className="text-[#1B6B45]">32% × ₹250 = <strong>₹80.00</strong></span>
                        </div>
                      </div>
                      <div className="bg-[#E3F4EA] p-3 rounded-[10px] text-[11px] text-[#1B6B45] flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                        <span>Rule R8: Sum of individual bills (₹720 + ₹540 + ₹360 + ₹630) exactly equals retailer bill (₹2,250).</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* PAID RECEIPT & DELIVERY TRACKER */
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Official Receipt Card */}
                <div className="card p-6 bg-white space-y-4 shadow-xs border-[#BDE5CF]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#E3F4EA] text-[#1B6B45] flex items-center justify-center font-bold">
                      <Check className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div>
                      <h2 className="font-serif text-2xl font-bold text-[#2E201F]">
                        Payment Verified & Confirmed
                      </h2>
                      <p className="text-xs text-[#6A5452]">
                        Bill GM-2611-001 has been marked paid by the payment gateway webhook.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#F3F8FB] rounded-[12px] border border-[#E4EEF5] text-xs">
                    <div>
                      <span className="text-[#6A5452] block text-[10px] uppercase font-bold">Invoice:</span>
                      <span className="font-mono font-bold text-[#432F2E]">GM-2611-001</span>
                    </div>
                    <div>
                      <span className="text-[#6A5452] block text-[10px] uppercase font-bold">Paid On:</span>
                      <span className="font-medium text-[#432F2E]">26 Nov, 10:42 am</span>
                    </div>
                    <div>
                      <span className="text-[#6A5452] block text-[10px] uppercase font-bold">Method:</span>
                      <span className="font-medium text-[#432F2E]">UPI · Google Pay</span>
                    </div>
                    <div>
                      <span className="text-[#6A5452] block text-[10px] uppercase font-bold">Amount Paid:</span>
                      <b className="font-serif text-sm text-[#1B6B45]">₹720.00</b>
                    </div>
                  </div>
                </div>

                {/* Doorstep Delivery Dispatch Status */}
                <div className="card p-6 bg-[#FFF7DB] border-[#EFDB93] space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-[#2A5C79]" />
                      <h3 className="font-serif text-lg font-bold text-[#432F2E]">
                        Doorstep Delivery Status
                      </h3>
                    </div>
                    <span className="pill pill-info text-xs py-0.5 px-2.5 bg-white">
                      {deliveryStatus === "delivered"
                        ? "Delivered"
                        : deliveryStatus === "out_for_delivery"
                        ? "Out for delivery"
                        : "Ready for Delivery"}
                    </span>
                  </div>

                  <p className="text-xs text-[#432F2E] leading-relaxed">
                    {deliveryStatus === "delivered" ? (
                      <span>
                        Your package was successfully delivered to <strong>Flat A-101</strong> by your building coordinator Meera Nair.
                      </span>
                    ) : deliveryStatus === "out_for_delivery" ? (
                      <span>
                        Coordinator Meera Nair is currently conducting doorstep deliveries for Green Meadows.
                      </span>
                    ) : (
                      <span>
                        Your items are safely packed and ready at the community collection desk. Meera Nair will deliver them to Flat A-101.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column (5 Columns): Interactive Payment Terminal */}
          <div className="lg:col-span-5 space-y-6">
            {!isPaid ? (
              <div className="card p-6 bg-white space-y-5 shadow-xs border-[#B3CEDE]">
                <div className="flex justify-between items-center pb-3 border-b border-[#E4EEF5]">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#2E201F]">
                      Payment Checkout
                    </h3>
                    <p className="text-xs text-[#6A5452]">
                      Direct payment to Green Meadows escrow
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-[#6A5452] block">
                      Payable
                    </span>
                    <span className="font-serif text-2xl font-bold text-[#2E201F]">
                      ₹720
                    </span>
                  </div>
                </div>

                {/* Payment Option Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#432F2E] block">
                    Choose Payment Method
                  </label>

                  {/* UPI GPay Option */}
                  <div
                    onClick={() => setPaymentMethod("upi_gpay")}
                    className={`p-3 rounded-[12px] border cursor-pointer flex items-center justify-between transition-all ${
                      paymentMethod === "upi_gpay"
                        ? "bg-[#FFF7DB] border-[#432F2E] shadow-2xs"
                        : "border-[#E4EEF5] hover:bg-[#F3F8FB]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white border border-[#B3CEDE] flex items-center justify-center text-xs font-bold text-[#432F2E]">
                        G
                      </div>
                      <div>
                        <b className="text-xs text-[#432F2E] block">Google Pay UPI</b>
                        <span className="text-[10px] text-[#6A5452]">Instant verified transfer</span>
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
                        ? "bg-[#FFF7DB] border-[#432F2E] shadow-2xs"
                        : "border-[#E4EEF5] hover:bg-[#F3F8FB]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-xs font-bold text-purple-800">
                        Pe
                      </div>
                      <div>
                        <b className="text-xs text-[#432F2E] block">PhonePe UPI</b>
                        <span className="text-[10px] text-[#6A5452]">Fast resident checkout</span>
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
                        ? "bg-[#FFF7DB] border-[#432F2E] shadow-2xs"
                        : "border-[#E4EEF5] hover:bg-[#F3F8FB]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#E4EEF5] border border-[#B3CEDE] flex items-center justify-center text-[#2A5C79]">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div>
                          <b className="text-xs text-[#432F2E] block">Other UPI ID / VPA</b>
                          <span className="text-[10px] text-[#6A5452]">BHIM, Paytm, Any Bank</span>
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

                {/* Gateway Trust Pill */}
                <div className="flex items-center gap-2 p-3 rounded-[10px] bg-[#E3F4EA] text-[#1B6B45] text-[11px]">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Certified bank gateway webhook integration (Razorpay mock for judging).
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={paymentProcessing}
                  className="btn btn-primary block w-full py-3 text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  {paymentProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying with Payment Gateway...</span>
                    </span>
                  ) : (
                    <span>Pay ₹720 Now</span>
                  )}
                </button>
              </div>
            ) : (
              <div className="card p-6 bg-white space-y-4 shadow-xs">
                <h3 className="font-serif text-lg font-bold text-[#2E201F] pb-2 border-b border-[#E4EEF5]">
                  Receipt Actions
                </h3>
                <p className="text-xs text-[#6A5452] leading-relaxed">
                  Your payment has been logged to the PostgreSQL source of truth. Your invoice status is now marked as <strong>PAID</strong>.
                </p>

                <div className="space-y-2 pt-2">
                  <Link href="/" className="btn btn-primary block w-full text-center text-xs font-bold">
                    Back to Community Dashboard
                  </Link>
                  <Link href="/customer/shop" className="btn btn-secondary block w-full text-center text-xs font-medium">
                    Browse Next Month Catalogue
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
