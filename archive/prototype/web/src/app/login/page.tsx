"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Logo,
  Card,
  Button,
  PhoneField,
  OtpInput,
  Banner,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, ArrowLeft, Building2, Store, UserCheck, ShieldCheck } from "lucide-react";
import Link from "next/link";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, requestOtp, verifyOtp, registerResident, registerRetailer, switchPersona } = useAuth();

  const initialTab = searchParams.get("tab") === "register" ? "register" : "signin";
  const [activeTab, setActiveTab] = useState<"signin" | "register">(initialTab);

  // Sign In states
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [resendTimer, setResendTimer] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Register states
  const [registerRole, setRegisterRole] = useState<"resident" | "retailer">("resident");
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regCommunity, setRegCommunity] = useState("GREEN1");
  const [regUnit, setRegUnit] = useState("");
  const [regStoreName, setRegStoreName] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regGstin, setRegGstin] = useState("");

  // Handle auto persona from query param
  useEffect(() => {
    const persona = searchParams.get("persona");
    if (persona && (persona === "asha" || persona === "ravi" || persona === "meera" || persona === "priya")) {
      switchPersona(persona);
      if (persona === "asha") router.push("/customer");
      else if (persona === "ravi") router.push("/retailer");
      else if (persona === "meera") router.push("/admin");
      else if (persona === "priya") router.push("/platform");
    }
  }, [searchParams, switchPersona, router]);

  // If already logged in, redirect directly to dashboard
  useEffect(() => {
    if (user && user.role) {
      if (user.role === "customer") router.push("/customer");
      else if (user.role === "retailer") router.push("/retailer");
      else if (user.role === "community_admin") router.push("/admin");
      else if (user.role === "platform_admin") router.push("/platform");
    }
  }, [user, router]);

  // Resend countdown
  useEffect(() => {
    if (step !== "code") return;
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (phone.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    const res = await requestOtp(phone);
    setIsSubmitting(false);

    if (res.success) {
      setStep("code");
      setResendTimer(30);
    } else {
      setErrorMsg(res.error || "Failed to send verification code.");
    }
  };

  const handleVerifyCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (code.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit code.");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    const res = await verifyOtp(phone, code);
    setIsSubmitting(false);

    if (res.success && res.user) {
      if (res.user.role === "customer") router.push("/customer");
      else if (res.user.role === "retailer") router.push("/retailer");
      else if (res.user.role === "community_admin") router.push("/admin");
      else if (res.user.role === "platform_admin") router.push("/platform");
      else {
        setActiveTab("register");
        setErrorMsg("Please complete your registration first.");
      }
    } else {
      setErrorMsg(res.error || "Incorrect or expired code.");
      if (res.error?.includes("register")) {
        setRegPhone(phone.replace(/[^0-9]/g, "").slice(-10));
      }
    }
  };

  const handleRegisterResident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regPhone.trim() || !regUnit.trim()) {
      setErrorMsg("Please fill in your name, mobile number, and flat number.");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    const res = await registerResident(regName, regPhone, regCommunity, regUnit);
    setIsSubmitting(false);

    if (res.success) {
      router.push("/customer");
    } else {
      setErrorMsg(res.error || "Registration failed. Please try again.");
    }
  };

  const handleRegisterRetailer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regStoreName.trim() || !regName.trim() || !regPhone.trim() || !regAddress.trim()) {
      setErrorMsg("Please provide your store name, owner name, mobile, and address.");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    const res = await registerRetailer(regName, regStoreName, regPhone, regAddress, regGstin);
    setIsSubmitting(false);

    if (res.success) {
      router.push("/retailer");
    } else {
      setErrorMsg(res.error || "Store registration failed. Please try again.");
    }
  };

  // Quick dev persona filler (one-click instant login)
  const handleQuickSignIn = async (p: string) => {
    const rawPhone = p.replace("+91", "");
    setPhone(rawPhone);
    setCode("000000");
    setErrorMsg(null);
    setIsSubmitting(true);
    const res = await verifyOtp(p, "000000");
    setIsSubmitting(false);

    if (res.success && res.user) {
      if (res.user.role === "customer") router.push("/customer");
      else if (res.user.role === "retailer") router.push("/retailer");
      else if (res.user.role === "community_admin") router.push("/admin");
      else if (res.user.role === "platform_admin") router.push("/platform");
    } else {
      setStep("code");
    }
  };

  return (
    <div className="min-h-screen bg-ice-50 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-[460px] space-y-6">
        {/* Navigation link to Home */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-600 hover:text-ink-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <span className="text-xs font-bold text-teal-700">Buy together, better together</span>
        </div>

        {/* Brand Header */}
        <div className="bg-ice-200 border border-ice-300 rounded-card p-6 text-center relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-16 bg-stripes opacity-40 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center">
            <Logo size="lg" />
            <p className="font-display text-xl sm:text-2xl text-ink-800 mt-3 font-bold">
              Buy together, better together
            </p>
            <p className="text-xs text-ink-600 mt-1 max-w-xs">
              {activeTab === "signin"
                ? "Sign in to access your apartment community or store dashboard."
                : "Create your resident or retailer account in seconds."}
            </p>
          </div>
        </div>

        {/* Auth Tabs: Sign In vs Register */}
        <div className="grid grid-cols-2 p-1 bg-ice-200 border border-ice-300 rounded-ctl">
          <button
            type="button"
            onClick={() => {
              setActiveTab("signin");
              setErrorMsg(null);
            }}
            className={`py-2 text-xs font-bold rounded-[9px] transition-colors cursor-pointer ${
              activeTab === "signin"
                ? "bg-ink-800 text-white shadow-xs"
                : "text-ink-700 hover:text-ink-900"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("register");
              setErrorMsg(null);
            }}
            className={`py-2 text-xs font-bold rounded-[9px] transition-colors cursor-pointer ${
              activeTab === "register"
                ? "bg-ink-800 text-white shadow-xs"
                : "text-ink-700 hover:text-ink-900"
            }`}
          >
            Register (New Account)
          </button>
        </div>

        {errorMsg && <Banner kind="danger" message={errorMsg} />}

        {/* Tab 1: SIGN IN */}
        {activeTab === "signin" && (
          <Card className="p-6 sm:p-8 space-y-6">
            {step === "phone" ? (
              <form onSubmit={handleSendCode} className="space-y-5">
                <PhoneField
                  label="Registered Mobile Number"
                  value={phone}
                  onChange={setPhone}
                  helperText="Enter your 10-digit mobile number."
                  autoFocus
                />

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={isSubmitting}
                  disabled={phone.length < 10}
                >
                  Send Verification Code
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-5">
                <div className="text-center space-y-1">
                  <h3 className="font-display text-xl text-ink-800">
                    Verify Your Code
                  </h3>
                  <p className="text-xs text-ink-600">
                    Sent to <span className="font-semibold text-ink-800">+91 {phone}</span>
                  </p>
                </div>

                <OtpInput
                  value={code}
                  onChange={setCode}
                  disabled={isSubmitting}
                  autoFocus
                />

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={isSubmitting}
                  disabled={code.length !== 6}
                >
                  Verify & Enter Dashboard
                </Button>

                <div className="flex items-center justify-between text-xs text-ink-600 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep("phone")}
                    className="hover:text-ink-800 underline cursor-pointer"
                  >
                    Change number
                  </button>

                  {resendTimer > 0 ? (
                    <span className="tabular-nums">Resend in {resendTimer}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendCode}
                      className="font-semibold text-teal-700 hover:underline cursor-pointer"
                    >
                      Resend code
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Quick 1-Click Evaluation Personas */}
            <div className="pt-4 border-t border-ice-100 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-500">
                <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                <span>1-Click Test Personas (Evaluation)</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickSignIn("9999900001")}
                  className="p-2 rounded-ctl border border-ice-300 text-left hover:bg-ice-100 transition-colors cursor-pointer"
                >
                  <b className="block text-ink-800">Asha Rao</b>
                  <span className="text-ink-500">Resident (A-101)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSignIn("9999900021")}
                  className="p-2 rounded-ctl border border-ice-300 text-left hover:bg-ice-100 transition-colors cursor-pointer"
                >
                  <b className="block text-ink-800">Ravi Kumar</b>
                  <span className="text-ink-500">Store (Sri Lakshmi)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSignIn("9999900011")}
                  className="p-2 rounded-ctl border border-ice-300 text-left hover:bg-ice-100 transition-colors cursor-pointer"
                >
                  <b className="block text-ink-800">Meera Sundaram</b>
                  <span className="text-ink-500">Building Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSignIn("9999900099")}
                  className="p-2 rounded-ctl border border-ice-300 text-left hover:bg-ice-100 transition-colors cursor-pointer"
                >
                  <b className="block text-ink-800">Priya Sharma</b>
                  <span className="text-ink-500">Platform Admin</span>
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Tab 2: REGISTER */}
        {activeTab === "register" && (
          <Card className="p-6 sm:p-8 space-y-5">
            {/* Choose Resident vs Retailer */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRegisterRole("resident")}
                className={`p-3 rounded-ctl border text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                  registerRole === "resident"
                    ? "border-teal-700 bg-ice-100 text-teal-800 font-bold"
                    : "border-ice-300 bg-white text-ink-600 hover:bg-ice-50"
                }`}
              >
                <Building2 className="w-4 h-4 text-teal-700 shrink-0" />
                <span className="text-xs">I am a Resident</span>
              </button>

              <button
                type="button"
                onClick={() => setRegisterRole("retailer")}
                className={`p-3 rounded-ctl border text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                  registerRole === "retailer"
                    ? "border-teal-700 bg-ice-100 text-teal-800 font-bold"
                    : "border-ice-300 bg-white text-ink-600 hover:bg-ice-50"
                }`}
              >
                <Store className="w-4 h-4 text-teal-700 shrink-0" />
                <span className="text-xs">I am a Store</span>
              </button>
            </div>

            {/* Resident Registration Form */}
            {registerRole === "resident" ? (
              <form onSubmit={handleRegisterResident} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-700">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kavita Sharma"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-ctl border border-ice-300 bg-white text-sm font-semibold text-ink-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-700">Mobile Number (10 digits)</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value.replace(/[^0-9]/g, ""))}
                    className="w-full h-11 px-3.5 rounded-ctl border border-ice-300 bg-white text-sm font-semibold text-ink-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-700">Apartment Complex</label>
                  <select
                    value={regCommunity}
                    onChange={(e) => setRegCommunity(e.target.value)}
                    className="w-full h-11 px-3 rounded-ctl border border-ice-300 bg-white text-xs font-semibold text-ink-800 focus:outline-none focus:ring-2 focus:ring-teal-700 cursor-pointer"
                  >
                    <option value="GREEN1">Green Meadows Apartments (Code: GREEN1)</option>
                    <option value="LAKE01">Lakeview Residency (Code: LAKE01)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-700">Flat / Apartment Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. B-302 or A-104"
                    value={regUnit}
                    onChange={(e) => setRegUnit(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-ctl border border-ice-300 bg-white text-sm font-semibold text-ink-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={isSubmitting}
                >
                  Register & Enter Resident Dashboard
                </Button>
              </form>
            ) : (
              /* Retailer Registration Form */
              <form onSubmit={handleRegisterRetailer} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-700">Store Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sri Murugan Supermarket"
                    value={regStoreName}
                    onChange={(e) => setRegStoreName(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-ctl border border-ice-300 bg-white text-sm font-semibold text-ink-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-700">Owner Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suresh Murugan"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-ctl border border-ice-300 bg-white text-sm font-semibold text-ink-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-700">Mobile Number (10 digits)</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9845012345"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value.replace(/[^0-9]/g, ""))}
                    className="w-full h-11 px-3.5 rounded-ctl border border-ice-300 bg-white text-sm font-semibold text-ink-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-700">Store Address</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. #14, Main Road, Bellandur, Bengaluru"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-ctl border border-ice-300 bg-white text-sm font-semibold text-ink-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-700">GSTIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="29AAAAA0000A1Z5"
                    value={regGstin}
                    onChange={(e) => setRegGstin(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-ctl border border-ice-300 bg-white text-sm font-semibold text-ink-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={isSubmitting}
                >
                  Register Store & Open Retailer Dashboard
                </Button>
              </form>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ice-50" />}>
      <LoginContent />
    </Suspense>
  );
}
