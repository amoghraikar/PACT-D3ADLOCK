"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Button, StatusPill, Skeleton, EmptyState, Modal, Input } from "@/components/ui";
import {
  adminService,
  DeliveryStatusResponse,
  DeliveryHandoverItem,
} from "@/services/admin.service";
import { useToast } from "@/hooks/useToast";
import {
  Truck,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Home,
  User,
  Phone,
  ShieldCheck,
} from "lucide-react";

export default function AdminDeliveriesPage() {
  const { success, error: toastError } = useToast();

  const [delivery, setDelivery] = useState<DeliveryStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmNotes, setConfirmNotes] = useState<string>("");
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  const loadDeliveries = async () => {
    try {
      const res = await adminService.getDeliveries();
      setDelivery(res);
    } catch (err: any) {
      toastError(err?.message || "Failed to load delivery status");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await adminService.getDeliveries();
        if (!ignore) setDelivery(res);
      } catch (err: any) {
        if (!ignore) toastError(err?.message || "Failed to load delivery status");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [toastError]);

  const handleConfirmHandover = async (handoverId: string) => {
    setIsConfirming(true);
    try {
      await adminService.confirmHandover(handoverId, confirmNotes || undefined);
      success("Doorstep handover confirmed successfully!");
      setConfirmingId(null);
      setConfirmNotes("");
      await loadDeliveries();
    } catch (err: any) {
      toastError(err?.message || "Failed to confirm handover");
    } finally {
      setIsConfirming(false);
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
                href="/admin"
                className="text-xs font-semibold text-muted hover:text-text inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Overview</span>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-text">
              Doorstep Delivery Handovers
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Gate arrival check-in and flat-by-flat grocery delivery checklist
            </p>
          </div>

          {delivery && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Delivery Status:</span>
              <StatusPill status={delivery.status}>{delivery.status}</StatusPill>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="card" className="h-16 w-full" />
            ))}
          </div>
        ) : !delivery ? (
          <EmptyState
            title="No Active Delivery Batch"
            description="No consolidated order is currently in transit or arriving at the main gate."
          />
        ) : (
          <div className="space-y-6">
            {/* Gate Summary Card */}
            <Card className="p-5 space-y-3 bg-surface border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-mono font-bold text-muted">
                    BULK ORDER #{delivery.order_number}
                  </span>
                  <h2 className="text-base font-bold text-text mt-0.5">
                    Consolidated Community Delivery Batch
                  </h2>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-muted block text-[10px]">Total Handovers</span>
                    <span className="font-bold text-text text-sm">
                      {delivery.total_handovers} flats
                    </span>
                  </div>
                  <div className="h-6 w-px bg-border" />
                  <div>
                    <span className="text-muted block text-[10px]">Completed</span>
                    <span className="font-bold text-primary text-sm">
                      {delivery.completed_handovers}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-border" />
                  <div>
                    <span className="text-muted block text-[10px]">Pending</span>
                    <span className="font-bold text-amber-700 text-sm">
                      {delivery.pending_handovers}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Resident Handover Checklist */}
            <Card className="overflow-hidden border border-border">
              <div className="p-4 bg-background border-b border-border">
                <h3 className="text-sm font-bold text-text">Resident Doorstep Checklist</h3>
                <p className="text-xs text-muted">
                  Confirm receipt when groceries are handed over to the resident at their flat
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-background border-b border-border text-muted font-semibold">
                      <th className="p-3">Flat / Unit</th>
                      <th className="p-3">Resident</th>
                      <th className="p-3">Invoice Ref</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {delivery.handovers.map((item) => (
                      <tr key={item.handover_id} className="hover:bg-background/40 transition-colors">
                        <td className="p-3 font-bold text-text text-sm">
                          Flat {item.apartment_unit || "—"}
                          <span className="text-muted block text-[11px] font-normal">
                            {item.building_name || "Tower A"}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-text">{item.recipient_name}</td>
                        <td className="p-3 font-mono text-muted">#{item.invoice_number}</td>
                        <td className="p-3 font-mono text-muted">{item.phone}</td>
                        <td className="p-3 text-center">
                          {item.status === "handed_over" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-pill bg-surface border border-primary text-primary">
                              <CheckCircle2 className="w-3 h-3" /> HANDED OVER
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-pill bg-amber-100 text-amber-900">
                              <Clock className="w-3 h-3" /> PENDING
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {item.status !== "handed_over" ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setConfirmingId(item.handover_id)}
                              className="h-7 text-xs px-2.5 font-semibold"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              <span>Confirm Handover</span>
                            </Button>
                          ) : (
                            <span className="text-[11px] text-muted">
                              {item.handover_timestamp
                                ? new Date(item.handover_timestamp).toLocaleTimeString()
                                : "Completed"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Handover Confirmation Modal */}
            <Modal
              isOpen={!!confirmingId}
              onClose={() => setConfirmingId(null)}
              title="Confirm Doorstep Handover"
              confirmLabel="Confirm Handover Complete"
              onConfirm={() => confirmingId && handleConfirmHandover(confirmingId)}
              isConfirmLoading={isConfirming}
            >
              <div className="space-y-3 text-xs">
                <p className="text-muted">
                  Verify that the resident has received all packed grocery boxes and bags for their flat.
                </p>
                <Input
                  label="Handover Notes (Optional)"
                  placeholder="e.g. Left with resident Mr. Sharma, verified 3 bags"
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                />
              </div>
            </Modal>
          </div>
        )}
      </div>
    </AppShell>
  );
}
