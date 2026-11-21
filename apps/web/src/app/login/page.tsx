"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Logo,
  Card,
  Button,
  PhoneField,
  OtpInput,
  Banner,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { copy } from "@/lib/copy/en";
import { Mic, Keyboard, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, requestOtp, verifyOtp, setOrderMode } = useAuth();

  const [inputMode, setInputMode] = useState<"type" | "speak">("type");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [resendTimer, setResendTimer] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If already logged in with a role, redirect to their home
  useEffect(() => {
    if (user && user.role) {
      if (user.role === "customer") router.push("/customer/start");
      else if (user.role === "retailer") router.push("/retailer");
      else if (user.role === "community_admin") router.push("/admin");
      else if (user.role === "platform_admin") router.push("/platform");
    } else if (user && !user.role) {
      router.push("/onboarding");
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
      if (!res.user.role) {
        router.push("/onboarding");
      } else if (res.user.role === "customer") {
        setOrderMode(inputMode === "speak" ? "speak" : "type");
        router.push("/customer/start");
      } else if (res.user.role === "retailer") {
        router.push("/retailer");
      } else if (res.user.role === "community_admin") {
        router.push("/admin");
      } else if (res.user.role === "platform_admin") {
        router.push("/platform");
      }
    } else {
      setErrorMsg(res.error || "Incorrect or expired code.");
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
      if (res.user.role === "customer") {
        setOrderMode(inputMode === "speak" ? "speak" : "type");
        router.push("/customer/start");
      } else if (res.user.role === "retailer") {
        router.push("/retailer");
      } else if (res.user.role === "community_admin") {
        router.push("/admin");
      } else if (res.user.role === "platform_admin") {
        router.push("/platform");
      } else {
        router.push("/onboarding");
      }
    } else {
      setStep("code");
    }
  };

  return (
    <div className="min-h-screen bg-ice-50 flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Container max 480px per U4 / U8 */}
      <div className="w-full max-w-[440px] space-y-6">
        {/* Brand Header on ice-200 with stripe band per U1 / U8 */}
        <div className="bg-ice-200 border border-ice-300 rounded-card p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-16 bg-stripes opacity-40 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center">
            <Logo size="lg" />
            <h1 className="font-display text-2xl sm:text-3xl text-ink-800 mt-4">
              {copy.auth.welcome}
            </h1>
            <p className="text-sm text-ink-600 mt-1 max-w-xs">
              {copy.auth.signInSubtitle}
            </p>
          </div>
        </div>

        {/* Sign-in Form Card */}
        <Card className="p-6 sm:p-8 space-y-6">
          {/* Type | Speak toggle per U8 */}
          <div className="grid grid-cols-2 p-1 bg-ice-100 rounded-ctl border border-ice-300">
            <button
              type="button"
              onClick={() => setInputMode("type")}
              className={`flex items-center justify-center gap-2 h-10 rounded-[9px] text-sm font-semibold transition-colors focus-ring cursor-pointer ${
                inputMode === "type"
                  ? "bg-ink-800 text-white shadow-xs"
                  : "text-ink-600 hover:text-ink-800"
              }`}
            >
              <Keyboard className="w-4 h-4" />
              <span>{copy.auth.toggleType}</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode("speak")}
              className={`flex items-center justify-center gap-2 h-10 rounded-[9px] text-sm font-semibold transition-colors focus-ring cursor-pointer ${
                inputMode === "speak"
                  ? "bg-ink-800 text-white shadow-xs"
                  : "text-ink-600 hover:text-ink-800"
              }`}
            >
              <Mic className="w-4 h-4 text-teal-700" />
              <span>{copy.auth.toggleSpeak}</span>
            </button>
          </div>

          {errorMsg && (
            <Banner kind="danger" message={errorMsg} />
          )}

          {step === "phone" ? (
            <form onSubmit={handleSendCode} className="space-y-6">
              <PhoneField
                label={copy.auth.phoneLabel}
                value={phone}
                onChange={setPhone}
                helperText="We will send a 6-digit code via SMS."
                autoFocus
              />

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isSubmitting}
                disabled={phone.length < 10}
              >
                {copy.auth.sendCode}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="text-center space-y-1">
                <h3 className="font-display text-xl text-ink-800">
                  {copy.auth.verifyCodeTitle}
                </h3>
                <p className="text-xs text-ink-600">
                  {copy.auth.verifyCodeSubtitle} <span className="font-semibold text-ink-800">+91 {phone}</span>
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
                {copy.auth.verifyCodeButton}
              </Button>

              <div className="flex items-center justify-between text-xs text-ink-600 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="hover:text-ink-800 underline focus-ring rounded-sm cursor-pointer"
                >
                  Change number
                </button>

                {resendTimer > 0 ? (
                  <span className="tabular-nums">
                    {copy.auth.resendWait(resendTimer)}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendCode}
                    className="font-semibold text-teal-700 hover:underline focus-ring rounded-sm cursor-pointer"
                  >
                    {copy.auth.resendNow}
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Golden Persona Quick-Access in Dev Mode */}
          <div className="pt-4 border-t border-ice-100 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-500">
              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
              <span>{copy.auth.devQuickSignIn}</span>
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
      </div>
    </div>
  );
}
