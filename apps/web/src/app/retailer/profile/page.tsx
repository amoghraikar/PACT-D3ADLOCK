"use client";

import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Button, StatusPill } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { Store, Phone, MapPin, FileText, LogOut, CheckCircle2 } from "lucide-react";

export default function RetailerProfilePage() {
  const { user, logout } = useAuth();

  return (
    <AppShell>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="pb-2 border-b border-border">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-text">
            Merchant Store Profile
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Verified Kirana Retailer Partner Account
          </p>
        </div>

        {/* Store Card */}
        <Card className="p-6 space-y-6 bg-surface border-border">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-background border border-border flex items-center justify-center text-primary font-bold text-xl">
              <Store className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text">Sharma Supermarket</h2>
              <p className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3.5 h-3.5" />
                <span>{user?.phone || "+91 99999 00010"}</span>
              </p>
              <div className="mt-2">
                <StatusPill status="ACTIVE">Verified Fulfillment Partner</StatusPill>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border text-xs">
            <div className="p-3 bg-background rounded-card border border-border space-y-1">
              <span className="text-muted flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-primary" /> Business Address
              </span>
              <p className="font-bold text-text text-sm">
                Shop 4, Bellandur Main Road, Bengaluru, 560103
              </p>
            </div>

            <div className="p-3 bg-background rounded-card border border-border space-y-1">
              <span className="text-muted flex items-center gap-1.5 font-medium">
                <FileText className="w-3.5 h-3.5 text-primary" /> GSTIN Number
              </span>
              <p className="font-bold text-text text-sm font-mono">
                29AAAAA0000A1Z5
              </p>
            </div>
          </div>

          {/* Sign Out Button */}
          <div className="pt-4 border-t border-border flex justify-end">
            <Button
              variant="outline"
              onClick={() => logout()}
              className="text-danger-700 hover:bg-danger-100 hover:border-danger-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span>Sign Out of PACT Merchant</span>
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
