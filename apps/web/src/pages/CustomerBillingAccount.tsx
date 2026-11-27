import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, CreditCard } from "lucide-react";
import {
  formatDateIST,
  formatDateTimeIST,
  NOTIFICATION_CHANNELS,
  type InvoiceDTO,
  type NotificationItemDTO,
  type NotificationPreferenceDTO,
  type PaymentHistoryItemDTO,
} from "@pact/shared";
import {
  Button,
  Card,
  EmptyState,
  Money,
  PageHeader,
  Skeleton,
  StatusBadge,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/lib/api";
import { billingService, notificationsService, paymentsService } from "@/lib/services";

function InvoiceView({
  invoice,
  history,
  onPaid,
}: {
  invoice: InvoiceDTO;
  history: PaymentHistoryItemDTO[];
  onPaid: () => void;
}) {
  const toast = useToast();
  const [paying, setPaying] = useState(false);

  const outstanding = Math.max(0, invoice.total_amount_paise - invoice.paid_amount_paise);

  const handlePayNow = async () => {
    setPaying(true);
    try {
      const order = await paymentsService.createOrder(invoice.id);
      const mockTxnId = `pay_${order.gateway}_${Date.now()}`;
      await paymentsService.verifyPayment({
        invoice_id: invoice.id,
        gateway_order_id: order.order_id,
        payment_id: mockTxnId,
      });
      toast.success("Payment verified and invoice settled.");
      onPaid();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-text">{invoice.invoice_number}</h2>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-xs text-muted mt-0.5">
              {invoice.community_name} · Cycle {invoice.cycle_month} · Issued{" "}
              {formatDateIST(invoice.created_at)}
            </p>
          </div>
          {outstanding > 0 && (
            <Button onClick={handlePayNow} isLoading={paying}>
              <CreditCard className="w-4 h-4 mr-1.5" />
              Pay <Money paise={outstanding} className="ml-1" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-background border border-border rounded-ctl p-4 text-sm">
          <div>
            <span className="text-xs text-muted block">Packed Base</span>
            <Money paise={invoice.base_amount_paise} className="font-semibold" />
          </div>
          <div>
            <span className="text-xs text-muted block">Bulk Discount</span>
            <Money paise={-invoice.discount_amount_paise} className="font-semibold text-success-700" />
          </div>
          <div>
            <span className="text-xs text-muted block">Delivery Share</span>
            <Money paise={invoice.delivery_fee_paise} className="font-semibold" />
          </div>
          <div>
            <span className="text-xs text-muted block">Net Payable</span>
            <Money paise={invoice.total_amount_paise} className="font-bold text-base" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="py-2 pr-3">Item</th>
                <th className="py-2 px-3 text-right">Requested</th>
                <th className="py-2 px-3 text-right">Packed</th>
                <th className="py-2 px-3 text-right">Unit Price</th>
                <th className="py-2 pl-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoice.items.map((it) => (
                <tr key={it.id}>
                  <td className="py-2.5 pr-3">
                    <div className="font-medium text-text">{it.product_title}</div>
                    <div className="text-xs text-muted">{it.variant_unit}</div>
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{it.requested_qty}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    <span className={it.packed_qty < it.requested_qty ? "text-warning-700 font-medium" : ""}>
                      {it.packed_qty}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Money paise={it.unit_price_paise} />
                  </td>
                  <td className="py-2.5 pl-3 text-right font-medium">
                    <Money paise={it.line_total_paise} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {history.length > 0 && (
        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-semibold text-text">Transaction History</h3>
          <div className="divide-y divide-border text-xs">
            {history.map((h) => (
              <div key={h.id} className="py-2.5 flex items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-text">{h.transaction_id || h.gateway_order_id}</span>
                  <span className="text-muted block">
                    {h.gateway.toUpperCase()} · {formatDateTimeIST(h.recorded_at)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Money paise={h.amount_paise} className="font-semibold" />
                  <StatusBadge status={h.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export function CustomerBillPage() {
  const [invoice, setInvoice] = useState<InvoiceDTO | null>(null);
  const [history, setHistory] = useState<PaymentHistoryItemDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLatest = async () => {
    setLoading(true);
    try {
      const list = await billingService.getMyInvoices();
      const latest = list[0] ?? null;
      setInvoice(latest);
      if (latest) {
        setHistory(await paymentsService.getHistory(latest.id));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLatest();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Current Monthly Bill"
        subtitle="F7 deterministic fair-split invoice calculated strictly on actual packed units"
        action={
          <Link to="/customer/bills">
            <Button variant="outline" size="sm">
              Invoice Archive
            </Button>
          </Link>
        }
      />
      {loading ? (
        <Skeleton className="h-64" />
      ) : !invoice ? (
        <EmptyState
          title="No Finalized Bill Yet"
          description="Your monthly F7 invoice will appear once the retailer packs and finalizes this month's collective order."
        />
      ) : (
        <InvoiceView invoice={invoice} history={history} onPaid={loadLatest} />
      )}
    </div>
  );
}

export function CustomerBillsHistoryPage() {
  const [invoices, setInvoices] = useState<InvoiceDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    billingService
      .getMyInvoices()
      .then(setInvoices)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Invoice History" subtitle="All finalized monthly statements" />
      {loading ? (
        <Skeleton className="h-48" />
      ) : invoices.length === 0 ? (
        <EmptyState title="No Past Invoices" description="Finalized monthly statements will be archived here." />
      ) : (
        <Card className="divide-y divide-border">
          {invoices.map((inv) => (
            <div key={inv.id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text">{inv.invoice_number}</span>
                  <StatusBadge status={inv.status} />
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Cycle {inv.cycle_month} · {formatDateIST(inv.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Money paise={inv.total_amount_paise} className="text-sm font-semibold" />
                <Link to={`/customer/bills/${inv.id}`}>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

export function CustomerBillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDTO | null>(null);
  const [history, setHistory] = useState<PaymentHistoryItemDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [inv, hist] = await Promise.all([
        billingService.getInvoiceDetail(id),
        paymentsService.getHistory(id),
      ]);
      setInvoice(inv);
      setHistory(hist);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoice Detail"
        action={
          <Link to="/customer/bills">
            <Button variant="outline" size="sm">
              Back to Archive
            </Button>
          </Link>
        }
      />
      {loading ? (
        <Skeleton className="h-64" />
      ) : !invoice ? (
        <EmptyState title="Invoice Not Found" description="Could not locate this invoice." />
      ) : (
        <InvoiceView invoice={invoice} history={history} onPaid={load} />
      )}
    </div>
  );
}

export function CustomerNotificationsPage() {
  const toast = useToast();
  const [items, setItems] = useState<NotificationItemDTO[]>([]);
  const [prefs, setPrefs] = useState<NotificationPreferenceDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [n, p] = await Promise.all([
        notificationsService.list(false),
        notificationsService.getPreferences(),
      ]);
      setItems(n);
      setPrefs(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const markAll = async () => {
    await notificationsService.markAllRead();
    toast.success("All notifications marked read.");
    void load();
  };

  const toggleChannel = async (channel: (typeof NOTIFICATION_CHANNELS)[number], enabled: boolean) => {
    const next = prefs.map((p) => (p.channel === channel ? { ...p, enabled } : p));
    setPrefs(next);
    await notificationsService.updatePreferences(next);
    toast.success("Notification preferences saved.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Billing updates, order alerts, and delivery status"
        action={
          <Button variant="outline" size="sm" onClick={markAll}>
            <Check className="w-4 h-4 mr-1.5" />
            Mark All Read
          </Button>
        }
      />

      <Card className="p-4 flex flex-wrap items-center justify-between gap-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Delivery Channels
        </span>
        <div className="flex flex-wrap gap-4">
          {prefs.map((p) => (
            <label key={p.channel} className="inline-flex items-center gap-2 text-xs text-text cursor-pointer">
              <input
                type="checkbox"
                checked={p.enabled}
                onChange={(e) => void toggleChannel(p.channel, e.target.checked)}
                className="accent-primary"
              />
              <span className="uppercase">{p.channel.replace("_", " ")}</span>
            </label>
          ))}
        </div>
      </Card>

      {loading ? (
        <Skeleton className="h-48" />
      ) : items.length === 0 ? (
        <EmptyState title="No Notifications" description="You are all caught up." />
      ) : (
        <Card className="divide-y divide-border">
          {items.map((n) => (
            <div key={n.id} className="p-4 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text">{n.title}</span>
                  {!n.is_read && <StatusBadge status="NEW" />}
                </div>
                <p className="text-xs text-muted mt-1">{n.message}</p>
                <p className="text-[11px] text-muted mt-1">{formatDateTimeIST(n.created_at)}</p>
              </div>
              {!n.is_read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await notificationsService.markRead(n.id);
                    void load();
                  }}
                >
                  Mark Read
                </Button>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

export function CustomerProfilePage() {
  const { user, logout } = useAuth();
  if (!user) return null;
  const comm = user.communities[0];

  return (
    <div className="space-y-6">
      <PageHeader title="Resident Profile" subtitle="Household account details" />
      <Card className="p-5 space-y-4 max-w-xl">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs text-muted block">Full Name</span>
            <span className="font-medium text-text">{user.full_name}</span>
          </div>
          <div>
            <span className="text-xs text-muted block">Mobile</span>
            <span className="font-medium text-text">{user.phone}</span>
          </div>
          <div>
            <span className="text-xs text-muted block">Community</span>
            <span className="font-medium text-text">{comm?.community_name ?? "Not linked"}</span>
          </div>
          <div>
            <span className="text-xs text-muted block">Flat / Unit</span>
            <span className="font-medium text-text">{comm?.unit_number ?? "—"}</span>
          </div>
        </div>
        <div className="pt-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => void logout()}>
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  );
}
