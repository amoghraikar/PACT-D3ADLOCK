"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Button, StatusPill, MoneyText, Skeleton, EmptyState } from "@/components/ui";
import { adminService, ResidentCollectionItem } from "@/services/admin.service";
import { useToast } from "@/hooks/useToast";
import { Clock, ArrowLeft, Send, AlertTriangle, CheckCircle2, MessageSquare } from "lucide-react";

export default function AdminUnpaidInvoicesPage() {
  const { success, error: toastError, info } = useToast();

  const [unpaidItems, setUnpaidItems] = useState<ResidentCollectionItem[]>([]);
  const [totalOutstandingPaise, setTotalOutstandingPaise] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await adminService.getInvoices();
      const unpaid = (res.items || []).filter((i) => i.status !== "PAID");
      setUnpaidItems(unpaid);
      setTotalOutstandingPaise(res.total_outstanding_paise || 0);
    } catch (err: any) {
      toastError(err?.message || "Failed to load unpaid invoices");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await adminService.getInvoices();
        if (!ignore) {
          const unpaid = (res.items || []).filter((i) => i.status !== "PAID");
          setUnpaidItems(unpaid);
          setTotalOutstandingPaise(res.total_outstanding_paise || 0);
        }
      } catch (err: any) {
        if (!ignore) toastError(err?.message || "Failed to load unpaid invoices");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [toastError]);

  const handleSendReminder = async (item: ResidentCollectionItem) => {
    setSendingInvoiceId(item.invoice_id);
    try {
      const res = await adminService.triggerReminder(
        item.invoice_id,
        ["in_app", "sms", "whatsapp"],
        `Friendly reminder from ${item.building_name || "Estate Office"}: Your monthly collective grocery bill of ₹${(item.outstanding_amount_paise / 100).toFixed(0)} is due.`
      );
      success(`Payment reminder dispatched to ${item.resident_name} via In-App, SMS & WhatsApp!`);
      await loadData();
    } catch (err: any) {
      toastError(err?.message || "Rate limit: Maximum 1 reminder per hour per resident.");
    } finally {
      setSendingInvoiceId(null);
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
              Unpaid Invoices & Reminders
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Trigger rate-limited payment alerts across SMS, WhatsApp, and in-app notifications
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-muted block">Total Outstanding</span>
            <div className="text-xl font-bold text-amber-700">
              <MoneyText paise={totalOutstandingPaise} />
            </div>
          </div>
        </div>

        {/* Rate Limiting Notice */}
        <div className="p-3 bg-background rounded-card border border-border text-xs text-muted flex items-start gap-2">
          <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>
            <strong>Reminder Rate Limiting:</strong> Enforces a maximum of one reminder per hour per recipient to prevent resident spamming. Delivery adapter confirms actual dispatch.
          </span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="card" className="h-16 w-full" />
            ))}
          </div>
        ) : unpaidItems.length === 0 ? (
          <EmptyState
            title="All Invoices Settled!"
            description="100% of participating households have cleared their monthly grocery bills."
          />
        ) : (
          <Card className="overflow-hidden border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-background border-b border-border text-muted font-semibold">
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Resident</th>
                    <th className="p-3">Flat / Unit</th>
                    <th className="p-3 text-right">Outstanding</th>
                    <th className="p-3 text-center">Last Reminded</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {unpaidItems.map((inv) => (
                    <tr key={inv.invoice_id} className="hover:bg-background/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-text">
                        #{inv.invoice_number}
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-text block">{inv.resident_name}</span>
                        <span className="text-muted text-[11px]">{inv.phone}</span>
                      </td>
                      <td className="p-3 text-muted">
                        Flat {inv.apartment_unit || "—"} · {inv.building_name || "Tower A"}
                      </td>
                      <td className="p-3 text-right font-bold text-amber-700 text-sm">
                        <MoneyText paise={inv.outstanding_amount_paise} />
                      </td>
                      <td className="p-3 text-center text-muted text-[11px]">
                        {inv.last_reminder_at
                          ? new Date(inv.last_reminder_at).toLocaleTimeString()
                          : "Never"}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleSendReminder(inv)}
                          isLoading={sendingInvoiceId === inv.invoice_id}
                          className="h-7 text-xs px-2.5 font-semibold"
                        >
                          <Send className="w-3 h-3 mr-1" />
                          <span>Remind</span>
                        </Button>
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
