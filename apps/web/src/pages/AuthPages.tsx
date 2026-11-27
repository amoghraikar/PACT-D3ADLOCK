import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ROLES } from "@pact/shared";
import { Button, Card, Input } from "@/components/ui";
import { homeForRole, useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/lib/api";
import { authService } from "@/lib/services";

export function LoginPage() {
  const { user, isLoading: authLoading, setAuthenticatedSession } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [devHint, setDevHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!authLoading && user) {
    if (user.role === ROLES.CUSTOMER && user.communities.length === 0) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setDevHint(null);
    try {
      const res = await authService.requestOtp(phone.trim());
      if (res.dev_otp) setDevHint(res.dev_otp);
      setStep("otp");
      toast.info("OTP sent to your mobile number.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not send OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authService.verifyOtp(phone.trim(), otp.trim());
      setAuthenticatedSession(res.access_token, res.user);
      if (res.user.role === ROLES.CUSTOMER && res.user.communities.length === 0) {
        navigate("/onboarding", { replace: true });
      } else {
        navigate(homeForRole(res.user.role), { replace: true });
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "OTP verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center mb-1">
            <img src="/brand/pact-logo-lockup.png" alt="PACT" className="h-10 w-auto" />
          </div>
          <h1 className="text-2xl font-serif text-text">Sign in to PACT</h1>
          <p className="text-sm text-muted">
            Collective apartment ordering &amp; fair monthly settlement
          </p>
        </div>

        <Card className="p-6">
          {step === "phone" ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <Input
                label="Mobile Number"
                type="tel"
                placeholder="+919999900001"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoFocus
              />
              <Button type="submit" fullWidth isLoading={submitting}>
                Send Verification Code
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Code sent to {phone}</span>
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setOtp("");
                    setDevHint(null);
                  }}
                  className="text-primary font-medium hover:underline cursor-pointer"
                >
                  Change number
                </button>
              </div>

              {devHint && (
                <div className="text-xs px-3 py-2 rounded-ctl bg-background border border-border text-muted">
                  Development OTP: <span className="font-semibold text-text">{devHint}</span>
                </div>
              )}

              <Input
                label="6-Digit OTP"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                autoFocus
              />
              <Button type="submit" fullWidth isLoading={submitting} disabled={otp.length !== 6}>
                Verify &amp; Continue
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

export function OnboardingPage() {
  const { user, refreshUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [communityCode, setCommunityCode] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authService.joinCommunity({
        community_code: communityCode.trim(),
        unit_number: unitNumber.trim(),
        full_name: fullName.trim() || undefined,
      });
      await refreshUser();
      toast.success("Joined apartment community.");
      navigate("/customer", { replace: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not join community");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <img src="/brand/pact-mark.png" alt="PACT" className="h-9 mx-auto mb-2" />
          <h1 className="text-2xl font-serif text-text">Complete Household Setup</h1>
          <p className="text-sm text-muted">
            Enter your apartment community code to join the monthly shared cart
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Your Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Asha Sharma"
              required
            />
            <Input
              label="Community Invite Code"
              value={communityCode}
              onChange={(e) => setCommunityCode(e.target.value.toUpperCase())}
              placeholder="e.g. GREEN_MEADOWS"
              required
            />
            <Input
              label="Apartment / Flat Number"
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              placeholder="e.g. A-402"
              required
            />
            <Button type="submit" fullWidth isLoading={submitting}>
              Join Community
            </Button>
            <button
              type="button"
              onClick={() => void logout().then(() => navigate("/login"))}
              className="w-full text-xs text-muted hover:text-text py-1 cursor-pointer"
            >
              Sign out
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
