"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Button, StatusPill, MoneyText, Skeleton, EmptyState } from "@/components/ui";
import { adminService, ResidentCollectionItem } from "@/services/admin.service";
import { useToast } from "@/hooks/useToast";
import { CheckCircle2, ArrowLeft, Clock, FileText, Check } from "lucide-react";

export default function AdminPaidInvoicesPage() {
  const { error: toastError } = useToast();

  const [paidItems, setPaidItems] = useState<ResidentCollectionItem[]>([]);
  const [totalCollectedPaise, setTotalCollectedPaise] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await adminService.getInvoices();
        const paid = (res.items || []).filter((i) => i.status === "PAID");
        setPaidItems(paid);
        setTotalCollectedPaise(res.total_collected_paise || 0);
      } catch (err: any) {
        toastError(err?.message || "Failed to load paid invoices");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [toastError]);

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
              Paid Resident Invoices
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Verified resident grocery bill settlements collected via Razorpay
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-muted block">Total Collected</span>
            <div className="text-xl font-bold text-text">
              <MoneyText paise={totalCollectedPaise} />
            </div>
          </div>
        </div>

        {/* Paid Invoices Table */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="card" className="h-16 w-full" />
            ))}
          </div>
        ) : paidItems.length === 0 ? (
          <EmptyState
            title="No Paid Invoices Recorded"
            description="When residents pay their fair-split bills using Razorpay, settled invoices will appear here."
          />
        ) : (
          <Card className="overflow-hidden border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-background border-b border-border text-muted font-semibold">
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Resident Household</th>
                    <th className="p-3">Flat / Unit</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3 text-right">Settled Amount</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paidItems.map((inv) => (
                    <tr key={inv.invoice_id} className="hover:bg-background/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-text">
                        #{inv.invoice_number}
                      </td>
                      <td className="p-3 font-semibold text-text">{inv.resident_name}</td>
                      <td className="p-3 text-muted">
                        Flat {inv.apartment_unit || "—"} · {inv.building_name || "Tower A"}
                      </td>
                      <td className="p-3 font-mono text-muted">{inv.phone}</td>
                      <td className="p-3 text-right font-bold text-text text-sm">
                        <MoneyText paise={inv.paid_amount_paise} />
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-pill bg-surface border border-primary text-primary">
                          <CheckCircle2 className="w-3 h-3" /> PAID
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
