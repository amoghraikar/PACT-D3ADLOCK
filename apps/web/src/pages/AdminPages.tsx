import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Send } from "lucide-react";
import {
  formatDateTimeIST,
  NOTIFICATION_CHANNELS,
  type AdminDashboardMetricsDTO,
  type AdminDeliveryStatusDTO,
  type AdminResidentInvoiceDTO,
  type NotificationChannel,
  type NotificationItemDTO,
} from "@pact/shared";
import {
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Money,
  PageHeader,
  Skeleton,
  StatusBadge,
} from "@/components/ui";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/lib/api";
import { adminService, notificationsService } from "@/lib/services";

export function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminDashboardMetricsDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .getDashboard()
      .then(setMetrics)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={metrics?.community_name ?? "Apartment Administration"}
        subtitle={metrics ? `Active Cycle: ${metrics.cycle_month}` : "Community metrics"}
        action={
          <>
            <Link to="/admin/unpaid">
              <Button variant="outline" size="sm">
                Unpaid Invoices
              </Button>
            </Link>
            <Link to="/admin/deliveries">
              <Button size="sm">Deliveries</Button>
            </Link>
          </>
        }
      />

      {loading || !metrics ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <span className="text-xs text-muted">Ordering / Total Households</span>
              <div className="text-2xl font-semibold mt-1 tabular-nums">
                {metrics.participating_households} / {metrics.total_households}
              </div>
            </Card>
            <Card className="p-4">
              <span className="text-xs text-muted">Total Cycle Billing</span>
              <div className="text-2xl font-semibold mt-1">
                <Money paise={metrics.total_billing_paise} />
              </div>
            </Card>
            <Card className="p-4">
              <span className="text-xs text-muted">Collected ({metrics.collection_percentage}%)</span>
              <div className="text-2xl font-semibold mt-1 text-success-700">
                <Money paise={metrics.amount_collected_paise} />
              </div>
            </Card>
            <Card className="p-4">
              <span className="text-xs text-muted">Outstanding</span>
              <div className="text-2xl font-semibold mt-1 text-danger-700">
                <Money paise={metrics.outstanding_paise} />
              </div>
            </Card>
          </div>

          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Collection Progress</span>
              <span className="font-semibold tabular-nums">{metrics.collection_percentage}%</span>
            </div>
            <div className="w-full h-2.5 bg-background border border-border rounded-pill overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(100, metrics.collection_percentage)}%` }}
              />
            </div>
            <p className="text-xs text-muted">
              Doorstep Handovers: {metrics.deliveries_completed} completed ·{" "}
              {metrics.deliveries_pending} pending
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

export function AdminInvoicesPage({ filter }: { filter: "paid" | "unpaid" }) {
  const toast = useToast();
  const [rows, setRows] = useState<AdminResidentInvoiceDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [remindTarget, setRemindTarget] = useState<AdminResidentInvoiceDTO | null>(null);
  const [channels, setChannels] = useState<NotificationChannel[]>(["in_app"]);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await adminService.getInvoices(filter));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const sendReminder = async () => {
    if (!remindTarget) return;
    setSending(true);
    try {
      const res = await adminService.remindInvoice(remindTarget.invoice_id, channels);
      const unconfigured = res.details.filter((d) => d.status !== "sent").map((d) => d.channel);
      if (unconfigured.length > 0) {
        toast.info(
          `Confirmed: ${res.channels_confirmed.join(", ") || "none"}. Unconfigured adapters: ${unconfigured.join(", ")}.`
        );
      } else {
        toast.success(`Reminder sent to ${res.recipient_name}.`);
      }
      setRemindTarget(null);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not send reminder");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={filter === "paid" ? "Paid Resident Invoices" : "Unpaid Resident Invoices"}
        subtitle={
          filter === "unpaid"
            ? "Rate-limited reminders (max 1 per hour per resident)"
            : "Settled resident statements for this community"
        }
      />
      {loading ? (
        <Skeleton className="h-48" />
      ) : rows.length === 0 ? (
        <EmptyState
          title={filter === "paid" ? "No Paid Invoices Yet" : "Zero Unpaid Invoices"}
          description={
            filter === "unpaid"
              ? "All resident invoices have been settled."
              : "No resident payments recorded yet."
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="p-3">Resident / Flat</th>
                <th className="p-3">Invoice</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-center">Status</th>
                {filter === "unpaid" && <th className="p-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.invoice_id}>
                  <td className="p-3">
                    <div className="font-medium">{r.resident_name}</div>
                    <div className="text-xs text-muted">
                      Flat {r.unit_number ?? "—"} · {r.phone}
                    </div>
                  </td>
                  <td className="p-3 text-xs">{r.invoice_number}</td>
                  <td className="p-3 text-right font-semibold">
                    <Money paise={filter === "unpaid" ? r.outstanding_paise : r.total_amount_paise} />
                  </td>
                  <td className="p-3 text-center">
                    <StatusBadge status={r.status} />
                  </td>
                  {filter === "unpaid" && (
                    <td className="p-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => setRemindTarget(r)}>
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Remind
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        isOpen={Boolean(remindTarget)}
        onClose={() => setRemindTarget(null)}
        title={`Send Payment Reminder · ${remindTarget?.resident_name ?? ""}`}
      >
        <div className="space-y-4 text-sm">
          <p className="text-xs text-muted">
            Select delivery channels. External SMS/WhatsApp adapters will report unconfigured if no
            provider credentials are set.
          </p>
          <div className="space-y-2">
            {NOTIFICATION_CHANNELS.map((ch) => (
              <label key={ch} className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={channels.includes(ch)}
                  onChange={(e) =>
                    setChannels((prev) =>
                      e.target.checked ? [...prev, ch] : prev.filter((x) => x !== ch)
                    )
                  }
                  className="accent-primary"
                />
                <span className="uppercase">{ch.replace("_", " ")}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRemindTarget(null)}>
              Cancel
            </Button>
            <Button isLoading={sending} disabled={channels.length === 0} onClick={sendReminder}>
              Trigger Reminder
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function AdminDeliveriesPage() {
  const toast = useToast();
  const [data, setData] = useState<AdminDeliveryStatusDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setData(await adminService.getDeliveries());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submitHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmId) return;
    try {
      await adminService.confirmHandover(confirmId, notes || undefined);
      toast.success("Doorstep handover confirmed.");
      setConfirmId(null);
      setNotes("");
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to confirm handover");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Readiness & Handovers"
        subtitle="Confirm doorstep delivery completion per participating flat"
      />
      {loading ? (
        <Skeleton className="h-64" />
      ) : !data ? (
        <EmptyState
          title="No Active Delivery"
          description="Delivery handovers are created once the retailer finalizes billing."
        />
      ) : (
        <div className="space-y-4">
          <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-sm font-semibold">{data.order_number}</span>
              <span className="text-xs text-muted block">
                Completed {data.completed_handovers} of {data.total_handovers} doorstep handovers
              </span>
            </div>
            <StatusBadge status={data.status} />
          </Card>

          <Card className="divide-y divide-border">
            {data.handovers.map((h) => (
              <div key={h.handover_id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{h.recipient_name}</span>
                    <StatusBadge status={h.status} />
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    Flat {h.unit_number ?? "—"} · {h.invoice_number} · Invoice: {h.invoice_status}
                  </p>
                </div>
                {h.status === "pending" ? (
                  <Button size="sm" onClick={() => setConfirmId(h.handover_id)}>
                    Confirm Handover
                  </Button>
                ) : (
                  <span className="text-xs text-success-700">
                    {h.handover_timestamp ? formatDateTimeIST(h.handover_timestamp) : "Done"}
                  </span>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}

      <Modal
        isOpen={Boolean(confirmId)}
        onClose={() => setConfirmId(null)}
        title="Confirm Doorstep Handover"
      >
        <form onSubmit={submitHandover} className="space-y-4">
          <Input
            label="Handover Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Received at door / gate"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirmId(null)}>
              Cancel
            </Button>
            <Button type="submit">Confirm</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function AdminNotificationsPage() {
  const [items, setItems] = useState<NotificationItemDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationsService
      .list(false)
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Coordinator Alerts" subtitle="Community-level event updates" />
      {loading ? (
        <Skeleton className="h-48" />
      ) : items.length === 0 ? (
        <EmptyState title="No Alerts" description="No community notifications logged." />
      ) : (
        <Card className="divide-y divide-border">
          {items.map((n) => (
            <div key={n.id} className="p-4">
              <div className="text-sm font-medium">{n.title}</div>
              <p className="text-xs text-muted mt-0.5">{n.message}</p>
              <span className="text-[11px] text-muted">{formatDateTimeIST(n.created_at)}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
