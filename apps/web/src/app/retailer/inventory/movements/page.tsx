"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Button, StatusPill, Skeleton, EmptyState } from "@/components/ui";
import { retailerService, InventoryMovement } from "@/services/retailer.service";
import { useToast } from "@/hooks/useToast";
import { ArrowLeft, History, Package, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

export default function StockMovementsPage() {
  const { error: toastError } = useToast();

  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadMovements() {
      setIsLoading(true);
      try {
        const res = await retailerService.getMovements({ limit: 50 });
        setMovements(res.items || []);
      } catch (err: any) {
        toastError(err?.message || "Failed to load stock movements");
      } finally {
        setIsLoading(false);
      }
    }
    loadMovements();
  }, [toastError]);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/retailer/inventory"
                className="text-xs font-semibold text-muted hover:text-text inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Inventory</span>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-text">
              Stock Movement History
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Audit log of all inwarding, order packing, and manual stock reconciliations
            </p>
          </div>
        </div>

        {/* Ledger Table */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="card" className="h-16 w-full" />
            ))}
          </div>
        ) : movements.length === 0 ? (
          <EmptyState
            title="No Stock Movements Recorded"
            description="Inventory movements will automatically record when you inward batches or pack bulk orders."
          />
        ) : (
          <Card className="overflow-hidden border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-background border-b border-border text-muted font-semibold">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Product Variant</th>
                    <th className="p-3 text-center">Movement Type</th>
                    <th className="p-3 text-center">Quantity Delta</th>
                    <th className="p-3 text-center">Balance</th>
                    <th className="p-3">Batch / Ref</th>
                    <th className="p-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {movements.map((m) => {
                    const isInward = m.movement_type === "INWARD";
                    const isOutward = m.movement_type === "OUTWARD_PACKED";

                    return (
                      <tr key={m.id} className="hover:bg-background/40 transition-colors">
                        <td className="p-3 text-muted">
                          {new Date(m.created_at).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-text block">{m.product_title}</span>
                          <span className="text-muted text-[11px]">{m.variant_title}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-pill ${
                              isInward
                                ? "bg-surface border border-primary text-primary"
                                : isOutward
                                ? "bg-background border border-border text-text"
                                : "bg-surface border border-amber-600 text-amber-700"
                            }`}
                          >
                            {m.movement_type}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-sm">
                          {isInward ? (
                            <span className="text-primary">+{m.quantity}</span>
                          ) : (
                            <span className="text-text">-{m.quantity}</span>
                          )}
                        </td>
                        <td className="p-3 text-center text-muted font-mono">
                          {m.balance_before} → <strong className="text-text">{m.balance_after}</strong>
                        </td>
                        <td className="p-3 font-mono text-muted text-[11px]">
                          {m.batch_number || m.reference_order_id || "—"}
                        </td>
                        <td className="p-3 text-muted text-[11px] max-w-xs truncate">
                          {m.notes || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
