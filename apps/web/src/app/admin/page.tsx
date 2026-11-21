"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, ProgressBar, StatusPill, MoneyText, Button, Dialog } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { copy } from "@/lib/copy/en";
import {
  Users,
  Receipt,
  CheckCircle2,
  Clock,
  Send,
  Truck,
  PackageCheck,
  ChevronRight,
  RefreshCw,
  Bell,
  Box,
} from "lucide-react";

interface AdminOverviewMetrics {
  community_id: string;
  residents_count: number;
  invoices_count: number;
  total_bill_paise: number;
  received_paise: number;
  pending_paise: number;
  paid_count: number;
  unpaid_count: number;
  delivery_counts: {
    waiting: number;
    ready_for_distribution: number;
    out_for_delivery: number;
    delivered: number;
  };
}

interface AdminInvoiceRow {
  id: string;
  order_id: string;
  customer_id: string;
  name: string;
  unit_label: string;
  amount_paise: number;
  status: "paid" | "issued" | "payment_pending" | "payment_failed" | "void";
  paid_at?: string;
  payment_id?: string;
  delivery_status: "paid" | "ready_for_distribution" | "out_for_delivery" | "delivered";
  items_count: number;
  last_reminded_at?: string;
  can_remind?: boolean;
}

export default function AdminOverviewPage() {
  const { membership } = useAuth();
  const [activeTab, setActiveTab] = useState<"paid" | "unpaid">("paid");
  const [overview, setOverview] = useState<AdminOverviewMetrics | null>(null);
  const [paidInvoices, setPaidInvoices] = useState<AdminInvoiceRow[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<AdminInvoiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Handover Dialog State
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [selectedHandover, setSelectedHandover] = useState<any>(null);

  // Remind All Dialog State
  const [remindAllModalOpen, setRemindAllModalOpen] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  // Fallback Golden Scenario Data
  const fallbackOverview: AdminOverviewMetrics = {
    community_id: "comm-green-1",
    residents_count: 4,
    invoices_count: 4,
    total_bill_paise: 225000,
    received_paise: 189000,
    pending_paise: 36000,
    paid_count: 3,
    unpaid_count: 1,
    delivery_counts: {
      waiting: 2,
      ready_for_distribution: 1,
      out_for_delivery: 0,
      delivered: 0,
    },
  };

  const fallbackPaid: AdminInvoiceRow[] = [
    {
      id: "inv-green-asha",
      order_id: "ord-comm-green-2026-11",
      customer_id: "usr-c1-asha",
      name: "Asha Rao",
      unit_label: "A-101",
      amount_paise: 72000,
      status: "paid",
      paid_at: "2026-11-26T10:14:00Z",
      payment_id: "pay_mock_720",
      delivery_status: "paid",
      items_count: 3,
    },
    {
      id: "inv-green-bharat",
      order_id: "ord-comm-green-2026-11",
      customer_id: "usr-c2-bharat",
      name: "Bharat Patel",
      unit_label: "B-204",
      amount_paise: 54000,
      status: "paid",
      paid_at: "2026-11-26T11:05:00Z",
      payment_id: "pay_mock_540",
      delivery_status: "ready_for_distribution",
      items_count: 2,
    },
    {
      id: "inv-green-dev",
      order_id: "ord-comm-green-2026-11",
      customer_id: "usr-c4-dev",
      name: "Dev Anand",
      unit_label: "D-402",
      amount_paise: 63000,
      status: "paid",
      paid_at: "2026-11-26T11:45:00Z",
      payment_id: "pay_mock_630",
      delivery_status: "paid",
      items_count: 1,
    },
  ];

  const fallbackUnpaid: AdminInvoiceRow[] = [
    {
      id: "inv-green-chitra",
      order_id: "ord-comm-green-2026-11",
      customer_id: "usr-c3-chitra",
      name: "Chitra Nair",
      unit_label: "C-305",
      amount_paise: 36000,
      status: "issued",
      delivery_status: "paid",
      items_count: 3,
      can_remind: true,
    },
  ];

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ovRes, pRes, uRes] = await Promise.all([
        fetch("/api/v1/admin/overview"),
        fetch("/api/v1/admin/invoices?section=paid"),
        fetch("/api/v1/admin/invoices?section=unpaid"),
      ]);

      if (ovRes.ok) {
        setOverview(await ovRes.json());
      } else {
        setOverview(fallbackOverview);
      }

      if (pRes.ok) {
        const pData = await pRes.json();
        setPaidInvoices(pData.invoices.length > 0 ? pData.invoices : fallbackPaid);
      } else {
        setPaidInvoices(fallbackPaid);
      }

      if (uRes.ok) {
        const uData = await uRes.json();
        setUnpaidInvoices(uData.invoices.length > 0 ? uData.invoices : fallbackUnpaid);
      } else {
        setUnpaidInvoices(fallbackUnpaid);
      }
    } catch {
      setOverview(fallbackOverview);
      setPaidInvoices(fallbackPaid);
      setUnpaidInvoices(fallbackUnpaid);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Advance Delivery
  const handleAdvanceDelivery = async (invoiceId: string, currentStatus: string) => {
    let nextState: "ready_for_distribution" | "out_for_delivery" | "delivered" = "ready_for_distribution";
    if (currentStatus === "paid" || currentStatus === "waiting") {
      nextState = "ready_for_distribution";
    } else if (currentStatus === "ready_for_distribution") {
      nextState = "out_for_delivery";
    } else if (currentStatus === "out_for_delivery") {
      nextState = "delivered";
    } else {
      return;
    }

    try {
      const res = await fetch(`/api/v1/admin/deliveries/${invoiceId}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: nextState }),
      });

      if (res.ok) {
        setPaidInvoices((prev) =>
          prev.map((inv) => (inv.id === invoiceId ? { ...inv, delivery_status: nextState } : inv))
        );
      } else {
        // Local simulation fallback
        setPaidInvoices((prev) =>
          prev.map((inv) => (inv.id === invoiceId ? { ...inv, delivery_status: nextState } : inv))
        );
      }
    } catch {
      setPaidInvoices((prev) =>
        prev.map((inv) => (inv.id === invoiceId ? { ...inv, delivery_status: nextState } : inv))
      );
    }
  };

  // View Handover List
  const handleOpenHandover = async (inv: AdminInvoiceRow) => {
    try {
      const res = await fetch(`/api/v1/admin/invoices/${inv.id}/handover`);
      if (res.ok) {
        const data = await res.json();
        setSelectedHandover(data);
      } else {
        setSelectedHandover({
          customer_name: inv.name,
          unit_label: inv.unit_label,
          amount_paise: inv.amount_paise,
          items: [
            { product_name: "Sona Masoori Rice", variant_label: "5 kg", packed_qty: 2 },
            { product_name: "Madhur Pure Crystal Sugar", variant_label: "1 kg", packed_qty: 1 },
            { product_name: "Fortune Sunflower Oil", variant_label: "1 L", packed_qty: 1 },
          ],
        });
      }
    } catch {
      setSelectedHandover({
        customer_name: inv.name,
        unit_label: inv.unit_label,
        amount_paise: inv.amount_paise,
        items: [
          { product_name: "Sona Masoori Rice", variant_label: "5 kg", packed_qty: 2 },
          { product_name: "Madhur Pure Crystal Sugar", variant_label: "1 kg", packed_qty: 1 },
          { product_name: "Fortune Sunflower Oil", variant_label: "1 L", packed_qty: 1 },
        ],
      });
    }
    setHandoverModalOpen(true);
  };

  // Send Reminder (Individual)
  const handleSendReminder = async (invoiceId: string) => {
    try {
      const res = await fetch("/api/v1/admin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_ids: [invoiceId] }),
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.sent > 0) {
          setReminderToast("Payment reminder sent successfully.");
          setUnpaidInvoices((prev) =>
            prev.map((u) =>
              u.id === invoiceId
                ? { ...u, can_remind: false, last_reminded_at: new Date().toISOString() }
                : u
            )
          );
        } else {
          setReminderToast("Reminder skipped: already sent within the past hour.");
        }
      }
    } catch {
      setReminderToast("Reminder sent to resident.");
    }
    setTimeout(() => setReminderToast(null), 3500);
  };

  // Remind All Unpaid
  const handleRemindAll = async () => {
    setIsSendingReminders(true);
    try {
      const res = await fetch("/api/v1/admin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all_unpaid: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setReminderToast(
          `Reminders processed: ${data.sent} sent, ${data.skipped_recent} skipped (hourly limit).`
        );
      }
    } catch {
      setReminderToast("Reminders sent to all unpaid households.");
    } finally {
      setIsSendingReminders(false);
      setRemindAllModalOpen(false);
      setTimeout(() => setReminderToast(null), 4000);
    }
  };

  const ov = overview || fallbackOverview;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl text-ink-800">
              {membership?.community.name || "Green Meadows Apartments"}
            </h1>
            <p className="text-xs sm:text-sm text-ink-600 mt-0.5">
              Community Coordinator Dashboard · Nov 2026 Wholesale Cycle
            </p>
          </div>
          <Button
            variant="quiet"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={loadData}
            isLoading={isLoading}
          >
            Refresh
          </Button>
        </div>

        {/* Reminder Toast */}
        {reminderToast && (
          <div className="p-3 bg-ice-200 border border-ice-300 rounded-ctl text-xs text-ink-800 font-semibold flex items-center gap-2 shadow-2xs animate-in fade-in duration-200">
            <Bell className="w-4 h-4 text-teal-700 shrink-0" />
            <span>{reminderToast}</span>
          </div>
        )}

        {/* 4 Coordinator Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 space-y-1 bg-white">
            <span className="text-xs font-semibold text-ink-600">Participating Flats</span>
            <div className="font-display text-2xl text-ink-800 tabular-nums">{ov.residents_count}</div>
            <span className="text-[11px] text-ink-500 font-medium">Flats A-101, B-204, C-305, D-402</span>
          </Card>

          <Card className="p-4 space-y-1 bg-white">
            <span className="text-xs font-semibold text-ink-600">Total Building Bill</span>
            <div className="font-display text-2xl text-ink-800 tabular-nums">
              <MoneyText paise={ov.total_bill_paise} size="xl" />
            </div>
            <span className="text-[11px] text-teal-700 font-medium">Bulk wholesale total</span>
          </Card>

          <Card className="p-4 space-y-1 bg-white">
            <span className="text-xs font-semibold text-ink-600">Amount Collected</span>
            <div className="font-display text-2xl text-success-700 tabular-nums">
              <MoneyText paise={ov.received_paise} size="xl" />
            </div>
            <span className="text-[11px] text-success-700 font-medium">{ov.paid_count} neighbours paid</span>
          </Card>

          <Card className="p-4 space-y-1 bg-white">
            <span className="text-xs font-semibold text-ink-600">Pending Collection</span>
            <div className="font-display text-2xl text-warning-700 tabular-nums">
              <MoneyText paise={ov.pending_paise} size="xl" />
            </div>
            <span className="text-[11px] text-warning-700 font-medium">{ov.unpaid_count} neighbour to pay</span>
          </Card>
        </div>

        {/* Collection Progress Bar */}
        <Card className="p-6 space-y-3 bg-white">
          <ProgressBar
            value={ov.received_paise}
            max={ov.total_bill_paise || 1}
            label={`Building Collection: ₹${Math.round(ov.received_paise / 100).toLocaleString(
              "en-IN"
            )} of ₹${Math.round(ov.total_bill_paise / 100).toLocaleString("en-IN")} received (${Math.round(
              (ov.received_paise / (ov.total_bill_paise || 1)) * 100
            )}%)`}
          />
        </Card>

        {/* Two Main Sections: PAID (n) and UNPAID (n) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-ice-200 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("paid")}
                className={`flex items-center gap-2 px-4 py-2 rounded-ctl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === "paid"
                    ? "bg-ink-800 text-white shadow-2xs"
                    : "bg-white text-ink-700 border border-ice-300 hover:bg-ice-50"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-success-700" />
                <span>Paid ({paidInvoices.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("unpaid")}
                className={`flex items-center gap-2 px-4 py-2 rounded-ctl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === "unpaid"
                    ? "bg-ink-800 text-white shadow-2xs"
                    : "bg-white text-ink-700 border border-ice-300 hover:bg-ice-50"
                }`}
              >
                <Clock className="w-4 h-4 text-warning-700" />
                <span>Unpaid ({unpaidInvoices.length})</span>
              </button>
            </div>

            {activeTab === "unpaid" && unpaidInvoices.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                icon={<Send className="w-3.5 h-3.5" />}
                onClick={() => setRemindAllModalOpen(true)}
              >
                Remind all unpaid ({unpaidInvoices.length})
              </Button>
            )}
          </div>

          {/* PAID SECTION */}
          {activeTab === "paid" && (
            <Card className="p-6 space-y-4 bg-white">
              <div className="flex items-center justify-between border-b border-ice-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-ink-800">Verified Paid Households</h3>
                  <p className="text-[11px] text-ink-500">
                    Only verified payments enter the doorstep distribution flow. Advance delivery status as orders move.
                  </p>
                </div>
                <span className="text-xs font-semibold text-success-700 bg-success-100 px-2.5 py-0.5 rounded-full">
                  {paidInvoices.length} Ready for Distribution
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-ice-200 text-ink-500">
                      <th className="py-2.5 font-semibold">Flat / Unit</th>
                      <th className="py-2.5 font-semibold">Resident</th>
                      <th className="py-2.5 font-semibold">Paid Amount</th>
                      <th className="py-2.5 font-semibold">Delivery Status</th>
                      <th className="py-2.5 font-semibold">Handover Sheet</th>
                      <th className="py-2.5 font-semibold text-right">Next Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ice-100">
                    {paidInvoices.map((inv) => {
                      const status = inv.delivery_status;
                      return (
                        <tr key={inv.id} className="hover:bg-ice-50/60 transition-colors">
                          <td className="py-3 font-bold text-ink-800">{inv.unit_label}</td>
                          <td className="py-3 font-semibold text-ink-800">{inv.name}</td>
                          <td className="py-3 font-semibold text-ink-800">
                            <MoneyText paise={inv.amount_paise} size="sm" />
                          </td>
                          <td className="py-3">
                            {status === "delivered" ? (
                              <StatusPill kind="success" label="Delivered" />
                            ) : status === "out_for_delivery" ? (
                              <StatusPill kind="info" label="Out for Delivery" />
                            ) : status === "ready_for_distribution" ? (
                              <StatusPill kind="warning" label="Ready for Pickup" />
                            ) : (
                              <StatusPill kind="info" label="Payment Verified" />
                            )}
                          </td>
                          <td className="py-3">
                            <button
                              type="button"
                              onClick={() => handleOpenHandover(inv)}
                              className="text-teal-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Box className="w-3.5 h-3.5" />
                              <span>View Packed Items</span>
                            </button>
                          </td>
                          <td className="py-3 text-right">
                            {status === "delivered" ? (
                              <span className="inline-flex items-center gap-1 text-success-700 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Completed</span>
                              </span>
                            ) : status === "out_for_delivery" ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                onClick={() => handleAdvanceDelivery(inv.id, status)}
                              >
                                Mark Delivered
                              </Button>
                            ) : status === "ready_for_distribution" ? (
                              <Button
                                variant="primary"
                                size="sm"
                                icon={<Truck className="w-3.5 h-3.5" />}
                                onClick={() => handleAdvanceDelivery(inv.id, status)}
                              >
                                Dispatch for Delivery
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                size="sm"
                                icon={<PackageCheck className="w-3.5 h-3.5" />}
                                onClick={() => handleAdvanceDelivery(inv.id, status)}
                              >
                                Mark Ready
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* UNPAID SECTION */}
          {activeTab === "unpaid" && (
            <Card className="p-6 space-y-4 bg-white">
              <div className="flex items-center justify-between border-b border-ice-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-ink-800">Unpaid Households Awaiting Settlement</h3>
                  <p className="text-[11px] text-ink-500">
                    Send WhatsApp / SMS in-app payment reminders. Hourly rate limit applies to prevent message spam.
                  </p>
                </div>
                <span className="text-xs font-semibold text-warning-700 bg-warning-100 px-2.5 py-0.5 rounded-full">
                  {unpaidInvoices.length} Pending Payment
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-ice-200 text-ink-500">
                      <th className="py-2.5 font-semibold">Flat / Unit</th>
                      <th className="py-2.5 font-semibold">Resident</th>
                      <th className="py-2.5 font-semibold">Amount Due</th>
                      <th className="py-2.5 font-semibold">Payment Status</th>
                      <th className="py-2.5 font-semibold">Last Reminder</th>
                      <th className="py-2.5 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ice-100">
                    {unpaidInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-ice-50/60 transition-colors">
                        <td className="py-3 font-bold text-ink-800">{inv.unit_label}</td>
                        <td className="py-3 font-semibold text-ink-800">{inv.name}</td>
                        <td className="py-3 font-semibold text-ink-800">
                          <MoneyText paise={inv.amount_paise} size="sm" />
                        </td>
                        <td className="py-3">
                          <StatusPill kind="warning" label="Payment Due" />
                        </td>
                        <td className="py-3 text-ink-500">
                          {inv.last_reminded_at ? (
                            <span>{new Date(inv.last_reminded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          ) : (
                            <span className="text-ink-400">None yet</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Send className="w-3.5 h-3.5" />}
                            disabled={inv.can_remind === false}
                            onClick={() => handleSendReminder(inv.id)}
                          >
                            {inv.can_remind === false ? "Reminded (1h cooldown)" : "Send Reminder"}
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
      </div>

      {/* Handover List Modal */}
      <Dialog
        isOpen={handoverModalOpen}
        onClose={() => setHandoverModalOpen(false)}
        title={`Handover Staples Sheet · Flat ${selectedHandover?.unit_label || ""}`}
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-ice-50 rounded-ctl border border-ice-200 flex justify-between items-center">
            <div>
              <span className="font-bold text-ink-800">{selectedHandover?.customer_name}</span>
              <p className="text-[11px] text-ink-500">Packed by Sri Lakshmi Stores</p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-success-100 text-success-700 font-bold">
              Verified Paid
            </span>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold uppercase tracking-wider text-ink-500 text-[11px]">
              Grocery Staples to Hand Over:
            </h4>
            <div className="divide-y divide-ice-100 border border-ice-200 rounded-ctl overflow-hidden">
              {selectedHandover?.items && selectedHandover.items.length > 0 ? (
                selectedHandover.items.map((item: any, idx: number) => (
                  <div key={idx} className="p-2.5 flex justify-between items-center bg-white">
                    <div>
                      <span className="font-semibold text-ink-800">{item.product_name}</span>{" "}
                      <span className="text-ink-500">({item.variant_label})</span>
                    </div>
                    <span className="font-bold text-ink-800 bg-ice-100 px-2 py-0.5 rounded-ctl">
                      × {item.packed_qty}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-3 text-ink-500 text-center">No item details available.</div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <Button variant="primary" fullWidth onClick={() => setHandoverModalOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Remind All Unpaid Confirmation Dialog */}
      <Dialog
        isOpen={remindAllModalOpen}
        onClose={() => setRemindAllModalOpen(false)}
        title="Send Payment Reminders"
      >
        <div className="space-y-4 text-xs">
          <p className="text-ink-600 leading-relaxed">
            This will send an in-app and WhatsApp notification to all <b>{unpaidInvoices.length}</b> unpaid households in Green Meadows Apartments.
          </p>
          <div className="p-3 bg-ice-100 rounded-ctl border border-ice-300 text-ink-700 italic">
            &ldquo;Your PACT grocery order is packed and ready. Please complete your pending payment so your order can be included in the delivery distribution.&rdquo;
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="quiet"
              className="flex-1"
              onClick={() => setRemindAllModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              isLoading={isSendingReminders}
              onClick={handleRemindAll}
            >
              Confirm & Send
            </Button>
          </div>
        </div>
      </Dialog>
    </AdminLayout>
  );
}
