"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo, Card, Button, Input, OtpInput } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { ShieldCheck, ArrowRight, UserCheck, PhoneCall, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { requestOtp, verifyOtp, user, isAuthenticated } = useAuth();
  const { error: toastError, success: toastSuccess, info: toastInfo } = useToast();

  const [phone, setPhone] = useState("+919999900001");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<string | null>(null);

  const redirectByRole = (role: string) => {
    switch (role) {
      case "customer":
        router.push("/customer");
        break;
      case "retailer":
        router.push("/retailer");
        break;
      case "admin":
        router.push("/admin");
        break;
      case "platform_admin":
        router.push("/platform");
        break;
      default:
        router.push("/customer");
    }
  };

  // If already logged in, redirect based on role
  React.useEffect(() => {
    if (isAuthenticated && user?.role) {
      redirectByRole(user.role);
    }
  }, [isAuthenticated, user]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phone || phone.trim().length < 10) {
      toastError("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsLoading(true);
    try {
      await requestOtp(phone.trim());
      setStep("otp");
      toastSuccess("Verification code sent! (Dev OTP: 123456)");
    } catch (err: any) {
      toastError(err?.message || "Failed to request OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpCode;
    if (code.length < 6) {
      toastError("Please enter the complete 6-digit OTP code");
      return;
    }

    setIsLoading(true);
    try {
      const authRes = await verifyOtp(phone.trim(), code);
      toastSuccess(`Welcome back, ${authRes.user.full_name || "Resident"}!`);
      redirectByRole(authRes.user.role);
    } catch (err: any) {
      toastError(err?.message || "Invalid OTP code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Quick switch for development / testing personas
  const selectQuickPersona = (
    personaPhone: string,
    label: string
  ) => {
    setPhone(personaPhone);
    setStep("phone");
    setOtpCode("");
    toastInfo(`Selected ${label} account: ${personaPhone}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
          <Logo size="lg" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-text">Sign In to PACT</h1>
        <p className="mt-1 text-sm text-muted">
          Pantry Collective Commerce for your apartment community
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="p-6 sm:p-8 space-y-6 bg-surface border-border">
          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <Input
                label="Mobile Phone Number"
                type="tel"
                placeholder="+919876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                helperText="We will send an SMS verification OTP"
                required
                leftIcon={<PhoneCall className="w-4 h-4 text-muted" />}
              />

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isLoading}
                className="h-11"
              >
                Send Verification OTP
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-xs text-muted">Verification code sent to</p>
                <p className="text-sm font-semibold text-text">{phone}</p>
                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="text-xs text-primary hover:underline mt-1 cursor-pointer"
                >
                  Change phone number
                </button>
              </div>

              <div className="flex flex-col items-center justify-center py-2">
                <OtpInput
                  length={6}
                  value={otpCode}
                  onChange={(val) => {
                    setOtpCode(val);
                    if (val.length === 6) handleVerifyOtp(val);
                  }}
                  disabled={isLoading}
                />
              </div>

              <Button
                type="button"
                variant="primary"
                fullWidth
                isLoading={isLoading}
                onClick={() => handleVerifyOtp()}
                className="h-11"
              >
                Verify & Sign In
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={isLoading}
                  className="text-xs text-muted hover:text-text cursor-pointer"
                >
                  Didn&apos;t receive code? Resend OTP
                </button>
              </div>
            </div>
          )}

          {/* Quick Persona Selector for Testing */}
          <div className="pt-5 border-t border-border space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Dev / Testing Quick Personas</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => selectQuickPersona("+919999900001", "Resident Customer")}
                className="p-2 text-left rounded border border-border hover:bg-background transition-colors cursor-pointer"
              >
                <span className="font-semibold block text-text">Customer</span>
                <span className="text-muted block text-[11px] truncate">Amit Sharma</span>
              </button>
              <button
                type="button"
                onClick={() => selectQuickPersona("+919999900010", "Kirana Retailer")}
                className="p-2 text-left rounded border border-border hover:bg-background transition-colors cursor-pointer"
              >
                <span className="font-semibold block text-text">Retailer</span>
                <span className="text-muted block text-[11px] truncate">Sharma Supermarket</span>
              </button>
              <button
                type="button"
                onClick={() => selectQuickPersona("+919999900020", "Apartment Admin")}
                className="p-2 text-left rounded border border-border hover:bg-background transition-colors cursor-pointer"
              >
                <span className="font-semibold block text-text">Apartment Admin</span>
                <span className="text-muted block text-[11px] truncate">Green Glen Admin</span>
              </button>
              <button
                type="button"
                onClick={() => selectQuickPersona("+919999900030", "Platform Admin")}
                className="p-2 text-left rounded border border-border hover:bg-background transition-colors cursor-pointer"
              >
                <span className="font-semibold block text-text">Platform Admin</span>
                <span className="text-muted block text-[11px] truncate">PACT Central</span>
              </button>
            </div>
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-muted">
          New community?{" "}
          <Link href="/onboarding" className="font-medium text-primary hover:underline">
            Register your apartment household
          </Link>
        </p>
      </div>
    </div>
  );
}
