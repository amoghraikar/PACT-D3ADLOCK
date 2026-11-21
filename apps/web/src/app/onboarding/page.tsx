"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Logo,
  Card,
  Button,
  TextField,
  Banner,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { copy } from "@/lib/copy/en";
import { Building2, Store, Clock } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { onboardResident, onboardRetailer } = useAuth();

  const [roleChoice, setRoleChoice] = useState<"choose" | "resident" | "retailer">("choose");

  // Resident Form
  const [joinCode, setJoinCode] = useState("GREEN1");
  const [name, setName] = useState("");
  const [unitLabel, setUnitLabel] = useState("");

  // Retailer Form
  const [storeName, setStoreName] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [retailerPending, setRetailerPending] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleResidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !unitLabel.trim() || !joinCode.trim()) {
      setErrorMsg("Please fill in all details to join your building.");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    const res = await onboardResident(joinCode, name, unitLabel);
    setIsSubmitting(false);

    if (res.success) {
      router.push("/customer/start");
    } else {
      setErrorMsg(res.error || "Failed to join building.");
    }
  };

  const handleRetailerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !address.trim()) {
      setErrorMsg("Please provide your store name and address.");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    const res = await onboardRetailer(storeName, address, gstin || undefined);
    setIsSubmitting(false);

    if (res.success) {
      setRetailerPending(true);
    } else {
      setErrorMsg(res.error || "Failed to register store.");
    }
  };

  return (
    <div className="min-h-screen bg-ice-50 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-[480px] space-y-6">
        <div className="text-center">
          <Logo size="md" />
        </div>

        {errorMsg && <Banner kind="danger" message={errorMsg} />}

        {roleChoice === "choose" && (
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="font-display text-2xl text-ink-800">
                {copy.onboarding.chooseRoleTitle}
              </h1>
              <p className="text-sm text-ink-600">
                {copy.onboarding.chooseRoleSubtitle}
              </p>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setRoleChoice("resident")}
                className="w-full p-4 rounded-card border-2 border-ice-300 hover:border-teal-700 bg-white hover:bg-ice-50 transition-all text-left flex items-start gap-4 focus-ring cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-ice-100 flex items-center justify-center text-teal-700 group-hover:bg-ice-200 transition-colors shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-base text-ink-800">
                    {copy.onboarding.residentOptionTitle}
                  </h3>
                  <p className="text-xs text-ink-600 leading-relaxed">
                    {copy.onboarding.residentOptionDesc}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRoleChoice("retailer")}
                className="w-full p-4 rounded-card border-2 border-ice-300 hover:border-teal-700 bg-white hover:bg-ice-50 transition-all text-left flex items-start gap-4 focus-ring cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-ice-100 flex items-center justify-center text-teal-700 group-hover:bg-ice-200 transition-colors shrink-0">
                  <Store className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-base text-ink-800">
                    {copy.onboarding.retailerOptionTitle}
                  </h3>
                  <p className="text-xs text-ink-600 leading-relaxed">
                    {copy.onboarding.retailerOptionDesc}
                  </p>
                </div>
              </button>
            </div>
          </Card>
        )}

        {roleChoice === "resident" && (
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1 text-center sm:text-left">
              <h2 className="font-display text-2xl text-ink-800">
                {copy.onboarding.joinTitle}
              </h2>
              <p className="text-xs text-ink-600">
                {copy.onboarding.joinSubtitle}
              </p>
            </div>

            <form onSubmit={handleResidentSubmit} className="space-y-4">
              <TextField
                label={copy.onboarding.joinCodeLabel}
                placeholder={copy.onboarding.joinCodePlaceholder}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                helperText="Green Meadows code is GREEN1 · Lakeview is LAKE01"
              />

              <TextField
                label={copy.onboarding.nameLabel}
                placeholder={copy.onboarding.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <TextField
                label={copy.onboarding.flatLabel}
                placeholder={copy.onboarding.flatPlaceholder}
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
              />

              <div className="pt-2 flex flex-col gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={isSubmitting}
                >
                  {copy.onboarding.joinButton}
                </Button>

                <Button
                  type="button"
                  variant="quiet"
                  fullWidth
                  onClick={() => setRoleChoice("choose")}
                >
                  Go back
                </Button>
              </div>
            </form>
          </Card>
        )}

        {roleChoice === "retailer" && !retailerPending && (
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1 text-center sm:text-left">
              <h2 className="font-display text-2xl text-ink-800">
                {copy.onboarding.storeTitle}
              </h2>
              <p className="text-xs text-ink-600">
                {copy.onboarding.storeSubtitle}
              </p>
            </div>

            <form onSubmit={handleRetailerSubmit} className="space-y-4">
              <TextField
                label={copy.onboarding.storeNameLabel}
                placeholder={copy.onboarding.storeNamePlaceholder}
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
              />

              <TextField
                label={copy.onboarding.addressLabel}
                placeholder={copy.onboarding.addressPlaceholder}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />

              <div className="space-y-1">
                <TextField
                  label={copy.onboarding.gstinLabel}
                  placeholder={copy.onboarding.gstinPlaceholder}
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                />
                <span className="text-[11px] text-ink-500 block">
                  {copy.onboarding.gstinBadge}
                </span>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={isSubmitting}
                >
                  {copy.onboarding.registerButton}
                </Button>

                <Button
                  type="button"
                  variant="quiet"
                  fullWidth
                  onClick={() => setRoleChoice("choose")}
                >
                  Go back
                </Button>
              </div>
            </form>
          </Card>
        )}

        {roleChoice === "retailer" && retailerPending && (
          <Card className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-warning-100 text-warning-700 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8" />
            </div>
            <h2 className="font-display text-2xl text-ink-800">
              {copy.onboarding.pendingApprovalTitle}
            </h2>
            <p className="text-sm text-ink-600 leading-relaxed max-w-sm mx-auto">
              {copy.onboarding.pendingApprovalBody}
            </p>
            <div className="pt-4">
              <Button
                variant="secondary"
                onClick={() => router.push("/login")}
              >
                Back to sign in
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
