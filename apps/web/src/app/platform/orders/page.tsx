"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Button, StatusPill, MoneyText, Skeleton, EmptyState, Modal, Input } from "@/components/ui";
import {
  platformService,
  GlobalTransactionSummary,
  PlatformCommunityItem,
  PlatformRetailerItem,
} from "@/services/platform.service";
import { useToast } from "@/hooks/useToast";
import { ShoppingBag, ArrowLeft, Layers, MapPin, Plus, CheckCircle2 } from "lucide-react";

export default function PlatformOrdersPage() {
  const { success, error: toastError } = useToast();

  const [txn, setTxn] = useState<GlobalTransactionSummary | null>(null);
  const [communities, setCommunities] = useState<PlatformCommunityItem[]>([]);
  const [retailers, setRetailers] = useState<PlatformRetailerItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Mapping Modal
  const [mappingModalOpen, setMappingModalOpen] = useState<boolean>(false);
  const [selectedRetailerId, setSelectedRetailerId] = useState<string>("");
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>("");
  const [deliveryFeePaise, setDeliveryFeePaise] = useState<number>(15000);
  const [isMapping, setIsMapping] = useState<boolean>(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [tRes, cRes, rRes] = await Promise.allSettled([
          platformService.getTransactions(),
          platformService.getCommunities(),
          platformService.getRetailers(),
        ]);

        if (tRes.status === "fulfilled") setTxn(tRes.value);
        if (cRes.status === "fulfilled") {
          setCommunities(cRes.value || []);
          if (cRes.value?.length > 0) setSelectedCommunityId(cRes.value[0].id);
        }
        if (rRes.status === "fulfilled") {
          setRetailers(rRes.value || []);
          if (rRes.value?.length > 0) setSelectedRetailerId(rRes.value[0].id);
        }
      } catch (err: any) {
        toastError(err?.message || "Failed to load transaction summary");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [toastError]);

  const handleMapRetailer = async () => {
    if (!selectedRetailerId || !selectedCommunityId) {
      toastError("Please select both a retailer and a community");
      return;
    }

    setIsMapping(true);
    try {
      await platformService.mapRetailerToCommunity({
        retailer_id: selectedRetailerId,
        community_id: selectedCommunityId,
        delivery_fee_paise: deliveryFeePaise,
        is_primary: true,
      });
      success("Retailer mapped to community successfully!");
      setMappingModalOpen(false);
    } catch (err: any) {
      toastError(err?.message || "Failed to map retailer to community");
    } finally {
      setIsMapping(false);
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
              Consolidated Orders Monitoring
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Platform-wide GMV settlement monitoring and fulfillment merchant mapping
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setMappingModalOpen(true)}
            className="h-9"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Map Retailer to Community</span>
          </Button>
        </div>

        {/* Global Financial Metrics Card */}
        {isLoading ? (
          <Skeleton variant="card" className="h-40 w-full" />
        ) : (
          <Card className="p-6 space-y-4 bg-surface border-border">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
              Platform-Wide Transaction Totals
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-background rounded-card border border-border">
                <span className="text-muted block text-[10px]">Total Bulk Orders</span>
                <span className="font-bold text-text text-base">{txn?.total_orders || 0}</span>
              </div>
              <div className="p-3 bg-background rounded-card border border-border">
                <span className="text-muted block text-[10px]">Total Gross GMV</span>
                <span className="font-bold text-text text-base">
                  <MoneyText paise={txn?.total_gross_paise || 0} />
                </span>
              </div>
              <div className="p-3 bg-background rounded-card border border-border">
                <span className="text-muted block text-[10px]">Wholesale Bulk Discounts</span>
                <span className="font-bold text-primary text-base">
                  <MoneyText paise={txn?.total_discount_paise || 0} />
                </span>
              </div>
              <div className="p-3 bg-background rounded-card border border-border">
                <span className="text-muted block text-[10px]">Settled Net GMV</span>
                <span className="font-bold text-text text-base">
                  <MoneyText paise={txn?.total_net_paise || 0} />
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Map Retailer Modal */}
        <Modal
          isOpen={mappingModalOpen}
          onClose={() => setMappingModalOpen(false)}
          title="Map Retailer Merchant to Community"
          confirmLabel="Create Fulfillment Mapping"
          onConfirm={handleMapRetailer}
          isConfirmLoading={isMapping}
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-text block mb-1">Select Community</label>
              <select
                value={selectedCommunityId}
                onChange={(e) => setSelectedCommunityId(e.target.value)}
                className="w-full p-2.5 rounded-card border border-border bg-background text-text focus-ring text-xs"
              >
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-text block mb-1">Select Kirana Retailer</label>
              <select
                value={selectedRetailerId}
                onChange={(e) => setSelectedRetailerId(e.target.value)}
                className="w-full p-2.5 rounded-card border border-border bg-background text-text focus-ring text-xs"
              >
                {retailers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.store_name} ({r.phone})
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Standard Community Delivery Fee (in Paise)"
              type="number"
              min={0}
              value={deliveryFeePaise}
              onChange={(e) => setDeliveryFeePaise(parseInt(e.target.value) || 0)}
              helperText="e.g. 15000 paise = ₹150 delivery fee"
              required
            />
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
