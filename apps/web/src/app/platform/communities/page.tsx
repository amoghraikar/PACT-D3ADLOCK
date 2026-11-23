"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Button, StatusPill, Skeleton, EmptyState, Modal, Input } from "@/components/ui";
import { platformService, PlatformCommunityItem } from "@/services/platform.service";
import { useToast } from "@/hooks/useToast";
import { Building2, Plus, ArrowLeft, Users, Home, MapPin } from "lucide-react";

export default function PlatformCommunitiesPage() {
  const { success, error: toastError } = useToast();

  const [communities, setCommunities] = useState<PlatformCommunityItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // New Community Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [city, setCity] = useState<string>("Bengaluru");
  const [postalCode, setPostalCode] = useState<string>("560103");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadCommunities = async () => {
    try {
      const data = await platformService.getCommunities();
      setCommunities(data || []);
    } catch (err: any) {
      toastError(err?.message || "Failed to load communities");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await platformService.getCommunities();
        if (!ignore) setCommunities(data || []);
      } catch (err: any) {
        if (!ignore) toastError(err?.message || "Failed to load communities");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [toastError]);

  const handleCreateCommunity = async () => {
    if (!name.trim() || !code.trim() || !address.trim()) {
      toastError("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await platformService.createCommunity({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        address: address.trim(),
        city: city.trim(),
        postal_code: postalCode.trim(),
      });
      success(`Community "${name}" registered successfully!`);
      setModalOpen(false);
      setName("");
      setCode("");
      setAddress("");
      await loadCommunities();
    } catch (err: any) {
      toastError(err?.message || "Failed to create community");
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
              Apartment Communities
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Manage registered apartment societies, member households, and community tenant settings
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="h-9"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Register New Community</span>
          </Button>
        </div>

        {/* Communities Table */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="card" className="h-20 w-full" />
            ))}
          </div>
        ) : communities.length === 0 ? (
          <EmptyState
            title="No Communities Registered"
            description="Register your first apartment community to begin collective shopping cycles."
          />
        ) : (
          <Card className="overflow-hidden border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-background border-b border-border text-muted font-semibold">
                    <th className="p-3">Community Name</th>
                    <th className="p-3">Code</th>
                    <th className="p-3">City & Postal</th>
                    <th className="p-3 text-center">Households</th>
                    <th className="p-3 text-center">Apartments</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {communities.map((c) => (
                    <tr key={c.id} className="hover:bg-background/40 transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-text block text-sm">{c.name}</span>
                        <span className="text-muted text-[11px] truncate block max-w-xs">
                          {c.address}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-primary">{c.code}</td>
                      <td className="p-3 text-muted">
                        {c.city} · {c.postal_code}
                      </td>
                      <td className="p-3 text-center font-bold text-text">
                        {c.total_members}
                      </td>
                      <td className="p-3 text-center text-muted">{c.total_apartments}</td>
                      <td className="p-3 text-center">
                        <StatusPill status={c.is_active ? "OPEN" : "REJECTED"}>
                          {c.is_active ? "ACTIVE" : "INACTIVE"}
                        </StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Register Community Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Register New Apartment Community"
          confirmLabel="Create Community"
          onConfirm={handleCreateCommunity}
          isConfirmLoading={isSubmitting}
        >
          <div className="space-y-3 text-xs">
            <Input
              label="Community Name"
              placeholder="e.g. Prestige Green Gables"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Community Code"
              placeholder="e.g. PGG-01"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              helperText="Invitation code for resident onboarding"
              required
            />
            <Input
              label="Street Address"
              placeholder="e.g. Outer Ring Road, Bellandur"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
              <Input
                label="Postal Code"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                required
              />
            </div>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
