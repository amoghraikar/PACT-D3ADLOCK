"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo, Card, Button, Input } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Building2, Home, User, CheckCircle2, ArrowRight } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { success, error: toastError } = useToast();

  const [communityCode, setCommunityCode] = useState("GGR-01");
  const [buildingName, setBuildingName] = useState("Tower A");
  const [apartmentUnit, setApartmentUnit] = useState("A-402");
  const [residentName, setResidentName] = useState("Amit Sharma");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!communityCode || !apartmentUnit || !residentName) {
      toastError("Please complete all required fields");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsCompleted(true);
      success("Household registered with Green Glen Residency!");
      setTimeout(() => {
        router.push("/customer/shop");
      }, 1500);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
          <Logo size="lg" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-text">Household Onboarding</h1>
        <p className="mt-1 text-sm text-muted">
          Join your apartment building&apos;s collective grocery cart
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="p-6 sm:p-8 space-y-6 bg-surface border-border">
          {isCompleted ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-surface border-2 border-primary mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-text">Welcome to the Collective!</h2>
              <p className="text-sm text-muted">
                Your apartment flat <strong className="text-text">{apartmentUnit}</strong> is now
                connected to Green Glen Residency. Directing to the grocery catalogue...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Community Invitation Code"
                placeholder="e.g. GGR-01"
                value={communityCode}
                onChange={(e) => setCommunityCode(e.target.value.toUpperCase())}
                helperText="Provided by your apartment estate committee"
                leftIcon={<Building2 className="w-4 h-4 text-muted" />}
                required
              />

              <Input
                label="Primary Resident Name"
                placeholder="e.g. Amit Sharma"
                value={residentName}
                onChange={(e) => setResidentName(e.target.value)}
                leftIcon={<User className="w-4 h-4 text-muted" />}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Tower / Block"
                  placeholder="e.g. Tower A"
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  required
                />
                <Input
                  label="Flat / Unit No."
                  placeholder="e.g. A-402"
                  value={apartmentUnit}
                  onChange={(e) => setApartmentUnit(e.target.value)}
                  leftIcon={<Home className="w-4 h-4 text-muted" />}
                  required
                />
              </div>

              <div className="p-3 bg-background rounded-card border border-border text-xs text-muted space-y-1">
                <div className="font-semibold text-text">One Building Rule:</div>
                <p>
                  All orders in your building are combined on the 22nd into one single consolidated bulk order.
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isSubmitting}
                className="h-11 mt-2"
              >
                Join Collective Cart
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          )}
        </Card>

        <p className="mt-6 text-center text-xs text-muted">
          Already a resident?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in with phone OTP
          </Link>
        </p>
      </div>
    </div>
  );
}
