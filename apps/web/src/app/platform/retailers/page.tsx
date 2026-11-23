"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Button, StatusPill, Skeleton, EmptyState, Modal, Input } from "@/components/ui";
import { platformService, PlatformRetailerItem } from "@/services/platform.service";
import { useToast } from "@/hooks/useToast";
import { Store, Plus, ArrowLeft, Phone, MapPin, FileText } from "lucide-react";

export default function PlatformRetailersPage() {
  const { success, error: toastError } = useToast();

  const [retailers, setRetailers] = useState<PlatformRetailerItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // New Retailer Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [storeName, setStoreName] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("+919999900010");
  const [businessAddress, setBusinessAddress] = useState<string>("");
  const [gstin, setGstin] = useState<string>("29AAAAA0000A1Z5");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadRetailers = async () => {
    try {
      const data = await platformService.getRetailers();
      setRetailers(data || []);
    } catch (err: any) {
      toastError(err?.message || "Failed to load retailers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await platformService.getRetailers();
        if (!ignore) setRetailers(data || []);
      } catch (err: any) {
        if (!ignore) toastError(err?.message || "Failed to load retailers");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [toastError]);

  const handleCreateRetailer = async () => {
    if (!storeName.trim() || !phone.trim() || !businessAddress.trim()) {
      toastError("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await platformService.createRetailer({
        store_name: storeName.trim(),
        full_name: fullName.trim() || storeName.trim(),
        phone: phone.trim(),
        business_address: businessAddress.trim(),
        gstin: gstin.trim() || undefined,
      });
      success(`Retailer "${storeName}" registered successfully!`);
      setModalOpen(false);
      setStoreName("");
      setBusinessAddress("");
      await loadRetailers();
    } catch (err: any) {
      toastError(err?.message || "Failed to create retailer");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/platform"
                className="text-xs font-semibold text-muted hover:text-text inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Overview</span>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-text">
              Merchant Retailers
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Verified local Kirana merchants fulfilling community bulk orders
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="h-9"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Register New Retailer</span>
          </Button>
        </div>

        {/* Retailers Table */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="card" className="h-20 w-full" />
            ))}
          </div>
        ) : retailers.length === 0 ? (
          <EmptyState
            title="No Retailers Registered"
            description="Register local Kirana merchants to fulfill collective community orders."
          />
        ) : (
          <Card className="overflow-hidden border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-background border-b border-border text-muted font-semibold">
                    <th className="p-3">Store Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">GSTIN</th>
                    <th className="p-3 text-center">Mapped Communities</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {retailers.map((r) => (
                    <tr key={r.id} className="hover:bg-background/40 transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-text block text-sm">{r.store_name}</span>
                        <span className="text-muted text-[11px] truncate block max-w-xs">
                          {r.business_address}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-muted">{r.phone}</td>
                      <td className="p-3 font-mono text-muted">{r.gstin || "—"}</td>
                      <td className="p-3 text-center font-bold text-primary">
                        {r.associated_communities_count} communities
                      </td>
                      <td className="p-3 text-center">
                        <StatusPill status="OPEN">{r.status}</StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Register Retailer Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Register New Merchant Retailer"
          confirmLabel="Create Retailer"
          onConfirm={handleCreateRetailer}
          isConfirmLoading={isSubmitting}
        >
          <div className="space-y-3 text-xs">
            <Input
              label="Store Trade Name"
              placeholder="e.g. Sharma Supermarket"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
            />
            <Input
              label="Merchant Full Name"
              placeholder="e.g. Ramesh Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="Phone Number"
              placeholder="+919999900010"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <Input
              label="Business Address"
              placeholder="e.g. Bellandur Main Road, Bengaluru"
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              required
            />
            <Input
              label="GSTIN Number (Optional)"
              placeholder="e.g. 29AAAAA0000A1Z5"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
            />
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
