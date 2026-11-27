import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, History, Package, Plus } from "lucide-react";
import {
  formatDateTimeIST,
  type BillingCalculationResult,
  type InventoryItemDTO,
  type InventoryMovementDTO,
  type RetailerDashboardMetricsDTO,
  type RetailerOrderDetailDTO,
  type RetailerOrderSummaryDTO,
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
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/lib/api";
import { catalogueService, retailerService } from "@/lib/services";

export function RetailerDashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<RetailerDashboardMetricsDTO | null>(null);
  const [orders, setOrders] = useState<RetailerOrderSummaryDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([retailerService.getDashboard(), retailerService.getOrders({ limit: 5 })])
      .then(([m, o]) => {
        setMetrics(m);
        setOrders(o.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={user?.retailer?.store_name ?? "Retailer Operations"}
        subtitle="Community bulk fulfillment, F7 billing, and store inventory"
        action={
          <>
            <Link to="/retailer/inventory">
              <Button variant="outline" size="sm">
                <Package className="w-4 h-4 mr-1.5" />
                Inventory
              </Button>
            </Link>
            <Link to="/retailer/orders">
              <Button size="sm">View Orders</Button>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <span className="text-xs text-muted">Pending Acceptance</span>
            <div className="text-2xl font-semibold mt-1">{metrics.pending_orders}</div>
            <span className="text-[11px] text-muted">{metrics.packing_orders} actively packing</span>
          </Card>
          <Card className="p-4">
            <span className="text-xs text-muted">Monthly Sales</span>
            <div className="text-2xl font-semibold mt-1">
              <Money paise={metrics.monthly_sales_paise} />
            </div>
            <span className="text-[11px] text-muted">{metrics.total_orders} total cycles</span>
          </Card>
          <Card className="p-4">
            <span className="text-xs text-muted">Outstanding Receivable</span>
            <div className="text-2xl font-semibold mt-1">
              <Money paise={metrics.outstanding_collections_paise} />
            </div>
            <span className="text-[11px] text-muted">
              GOV: <Money paise={metrics.gross_order_value_paise} />
            </span>
          </Card>
          <Card className="p-4">
            <span className="text-xs text-muted">Low Stock Alerts</span>
            <div className="text-2xl font-semibold mt-1 flex items-center gap-2">
              {metrics.low_stock_items_count}
              {metrics.low_stock_items_count > 0 && (
                <AlertTriangle className="w-4 h-4 text-warning-700" />
              )}
            </div>
            <Link to="/retailer/inventory" className="text-[11px] text-primary hover:underline">
              Review stock &rarr;
            </Link>
          </Card>
        </div>
      )}

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent Community Orders</h2>
          <Link to="/retailer/orders" className="text-xs text-primary hover:underline">
            All orders
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-muted py-4 text-center">No consolidated orders yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {orders.map((o) => (
              <div key={o.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{o.order_number}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {o.community_name} · {o.participating_households_count} households ·{" "}
                    {o.total_requested_items} units
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Money paise={o.total_paise} className="text-sm font-semibold" />
                  <Link to={`/retailer/orders/${o.id}`}>
                    <Button variant="outline" size="sm">
                      Open
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

const ORDER_TABS = ["ALL", "PENDING", "ACCEPTED", "PACKING", "BILLED", "DISPATCHED", "COMPLETED", "REJECTED"];

export function RetailerOrdersPage() {
  const [status, setStatus] = useState("ALL");
  const [orders, setOrders] = useState<RetailerOrderSummaryDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    retailerService
      .getOrders({ status, limit: 50 })
      .then((res) => setOrders(res.data))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div className="space-y-6">
      <PageHeader title="Community Bulk Orders" subtitle="Accept, pack, bill, and dispatch orders" />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {ORDER_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setStatus(t)}
            className={`px-3 py-1.5 rounded-pill text-xs font-medium border shrink-0 cursor-pointer ${
              status === t ? "bg-primary text-white border-primary" : "bg-surface text-text border-border"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-48" />
      ) : orders.length === 0 ? (
        <EmptyState title="No Orders Found" description="No bulk orders match this filter." />
      ) : (
        <Card className="divide-y divide-border">
          {orders.map((o) => (
            <div key={o.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{o.order_number}</span>
                  <StatusBadge status={o.status} />
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {o.community_name} · Cycle {o.cycle_month} · Packed {o.total_packed_items}/
                  {o.total_requested_items} units
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Money paise={o.total_paise} className="text-sm font-semibold" />
                <Link to={`/retailer/orders/${o.id}`}>
                  <Button size="sm">Process</Button>
                </Link>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

export function RetailerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [order, setOrder] = useState<RetailerOrderDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [packMap, setPackMap] = useState<
    Record<string, { packed_qty: number; is_unavailable: boolean; notes: string }>
  >({});

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [billModalOpen, setBillModalOpen] = useState(false);
  const [deliveryRupees, setDeliveryRupees] = useState("150");
  const [discountRupees, setDiscountRupees] = useState("0");
  const [allocMode, setAllocMode] = useState<"EQUAL" | "PRO_RATA">("EQUAL");
  const [preview, setPreview] = useState<BillingCalculationResult | null>(null);

  const loadOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const detail = await retailerService.getOrderDetail(id);
      setOrder(detail);
      setDeliveryRupees(String(Math.round(detail.delivery_fee_paise / 100)));
      const map: Record<string, { packed_qty: number; is_unavailable: boolean; notes: string }> = {};
      for (const it of detail.items) {
        map[it.variant_id] = {
          packed_qty:
            detail.status === "ACCEPTED" && detail.total_packed_items === 0
              ? it.requested_qty
              : it.packed_qty,
          is_unavailable: it.is_unavailable,
          notes: "",
        };
      }
      setPackMap(map);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const handleAccept = async () => {
    if (!order) return;
    setBusy(true);
    try {
      await retailerService.acceptOrder(order.id);
      toast.success("Order accepted.");
      await loadOrder();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to accept order");
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setBusy(true);
    try {
      await retailerService.rejectOrder(order.id, rejectReason);
      toast.info("Order rejected.");
      setRejectOpen(false);
      await loadOrder();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to reject");
    } finally {
      setBusy(false);
    }
  };

  const handleSavePacking = async () => {
    if (!order) return;
    setBusy(true);
    try {
      await retailerService.updatePacking(
        order.id,
        order.items.map((it) => {
          const entry = packMap[it.variant_id];
          return {
            variant_id: it.variant_id,
            packed_qty: entry?.is_unavailable ? 0 : (entry?.packed_qty ?? it.packed_qty),
            is_unavailable: entry?.is_unavailable ?? false,
            notes: entry?.notes || undefined,
          };
        })
      );
      toast.success("Packing quantities saved.");
      await loadOrder();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save packing");
    } finally {
      setBusy(false);
    }
  };

  const openBillPreview = async () => {
    if (!order) return;
    setBillModalOpen(true);
    try {
      const p = await retailerService.previewBill(order.id, {
        delivery_fee_paise: Math.round(Number(deliveryRupees || 0) * 100),
        order_discount_paise: Math.round(Number(discountRupees || 0) * 100),
        delivery_allocation_mode: allocMode,
      });
      setPreview(p);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not preview bill");
    }
  };

  const handleFinalizeBill = async () => {
    if (!order) return;
    setBusy(true);
    try {
      const res = await retailerService.sendBill(order.id, {
        delivery_fee_paise: Math.round(Number(deliveryRupees || 0) * 100),
        order_discount_paise: Math.round(Number(discountRupees || 0) * 100),
        delivery_allocation_mode: allocMode,
      });
      toast.success(`Finalized bill with ${res.invoices_count} resident invoices.`);
      setBillModalOpen(false);
      await loadOrder();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Finalization failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDispatch = async () => {
    if (!order) return;
    setBusy(true);
    try {
      await retailerService.dispatchOrder(order.id);
      toast.success("Order dispatched to apartment community.");
      await loadOrder();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Dispatch failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Skeleton className="h-96" />;
  if (!order) return <EmptyState title="Order Not Found" description="Invalid order ID." />;

  const canPack = order.status === "ACCEPTED" || order.status === "PACKING";

  return (
    <div className="space-y-6">
      <PageHeader
        title={order.order_number}
        subtitle={`${order.community_name} · ${order.participating_households_count} households · Cycle ${order.cycle_month}`}
        action={
          <div className="flex flex-wrap gap-2">
            {order.status === "PENDING" && (
              <>
                <Button variant="outline" size="sm" onClick={() => setRejectOpen(true)}>
                  Reject
                </Button>
                <Button size="sm" isLoading={busy} onClick={handleAccept}>
                  Accept Order
                </Button>
              </>
            )}
            {canPack && (
              <>
                <Button variant="outline" size="sm" isLoading={busy} onClick={handleSavePacking}>
                  Save Packing
                </Button>
                <Button size="sm" onClick={openBillPreview}>
                  Preview &amp; Finalize Bill
                </Button>
              </>
            )}
            {order.status === "BILLED" && (
              <Button size="sm" isLoading={busy} onClick={handleDispatch}>
                Dispatch Order
              </Button>
            )}
            <Link to="/retailer/orders">
              <Button variant="ghost" size="sm">
                Back
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-xs text-muted block">Status</span>
          <div className="mt-1">
            <StatusBadge status={order.status} />
          </div>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted block">Packed / Requested</span>
          <div className="text-lg font-semibold mt-0.5 tabular-nums">
            {order.total_packed_items} / {order.total_requested_items}
          </div>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted block">Subtotal</span>
          <div className="text-lg font-semibold mt-0.5">
            <Money paise={order.subtotal_paise} />
          </div>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted block">Final Bill Total</span>
          <div className="text-lg font-semibold mt-0.5">
            <Money paise={order.total_paise} />
          </div>
        </Card>
      </div>

      <Card className="p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="py-2 pr-3">Product Variant</th>
              <th className="py-2 px-3 text-right">Requested</th>
              <th className="py-2 px-3 text-right">Packed Qty</th>
              <th className="py-2 px-3 text-center">Unavailable</th>
              <th className="py-2 pl-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {order.items.map((it) => {
              const st = packMap[it.variant_id] ?? {
                packed_qty: it.packed_qty,
                is_unavailable: it.is_unavailable,
                notes: "",
              };
              return (
                <tr key={it.id}>
                  <td className="py-3 pr-3">
                    <div className="font-medium text-text">{it.product_title}</div>
                    <div className="text-xs text-muted">
                      {it.variant_unit} · {it.variant_sku} · <Money paise={it.unit_price_paise} />
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums font-medium">
                    {it.requested_qty}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {canPack ? (
                      <input
                        type="number"
                        min={0}
                        max={it.requested_qty}
                        disabled={st.is_unavailable}
                        value={st.is_unavailable ? 0 : st.packed_qty}
                        onChange={(e) => {
                          const v = Math.min(it.requested_qty, Math.max(0, Number(e.target.value)));
                          setPackMap((p) => ({
                            ...p,
                            [it.variant_id]: { ...st, packed_qty: v },
                          }));
                        }}
                        className="w-20 h-8 px-2 text-right border border-border rounded-ctl bg-background text-sm tabular-nums"
                      />
                    ) : (
                      <span className="tabular-nums">{it.packed_qty}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {canPack ? (
                      <input
                        type="checkbox"
                        checked={st.is_unavailable}
                        onChange={(e) =>
                          setPackMap((p) => ({
                            ...p,
                            [it.variant_id]: {
                              ...st,
                              is_unavailable: e.target.checked,
                              packed_qty: e.target.checked ? 0 : st.packed_qty,
                            },
                          }))
                        }
                        className="accent-danger-700"
                      />
                    ) : it.is_unavailable ? (
                      <StatusBadge status="UNAVAILABLE" />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 pl-3 text-right font-medium">
                    <Money paise={it.subtotal_paise} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Modal isOpen={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject Bulk Order">
        <form onSubmit={handleReject} className="space-y-4">
          <Input
            label="Reason for Rejection"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" isLoading={busy}>
              Confirm Reject
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={billModalOpen}
        onClose={() => setBillModalOpen(false)}
        title="F7 Bill Preview & Atomic Finalization"
      >
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Delivery Fee (₹)"
              type="number"
              value={deliveryRupees}
              onChange={(e) => setDeliveryRupees(e.target.value)}
            />
            <Input
              label="Bulk Discount (₹)"
              type="number"
              value={discountRupees}
              onChange={(e) => setDiscountRupees(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-text">Delivery Split Rule</label>
            <select
              value={allocMode}
              onChange={(e) => setAllocMode(e.target.value as "EQUAL" | "PRO_RATA")}
              className="w-full h-10 px-3 bg-surface border border-border rounded-ctl text-sm"
            >
              <option value="EQUAL">Equal across active households</option>
              <option value="PRO_RATA">Pro-rata by household subtotal</option>
            </select>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={openBillPreview}>
            Recalculate Preview
          </Button>

          {preview && (
            <div className="bg-background border border-border rounded-ctl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Retailer Gross</span>
                <Money paise={preview.retailer_bill.gross_amount_paise} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Discounts Applied</span>
                <Money paise={-preview.retailer_bill.discount_amount_paise} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Delivery Fee</span>
                <Money paise={preview.retailer_bill.delivery_amount_paise} />
              </div>
              <div className="flex justify-between font-semibold text-sm pt-2 border-t border-border">
                <span>Final Retailer Net</span>
                <Money paise={preview.retailer_bill.net_amount_paise} />
              </div>
              <div className="text-[11px] text-success-700 pt-1">
                Zero Discrepancy Check: {preview.audit_log.zero_discrepancy_verified ? "PASSED" : "FAILED"} (
                {preview.resident_invoices.length} invoices)
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setBillModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" isLoading={busy} onClick={handleFinalizeBill}>
              Finalize &amp; Issue Invoices
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function RetailerInventoryPage() {
  const toast = useToast();
  const [items, setItems] = useState<InventoryItemDTO[]>([]);
  const [search, setSearch] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [loading, setLoading] = useState(true);

  const [inwardOpen, setInwardOpen] = useState(false);
  const [allVariants, setAllVariants] = useState<{ id: string; label: string }[]>([]);
  const [inwardVarId, setInwardVarId] = useState("");
  const [inwardQty, setInwardQty] = useState("20");
  const [inwardBatch, setInwardBatch] = useState("BATCH-NEW-01");
  const [inwardCostRupees, setInwardCostRupees] = useState("50");
  const [inwardSupplier, setInwardSupplier] = useState("Metro Cash & Carry");

  const [adjustTarget, setAdjustTarget] = useState<InventoryItemDTO | null>(null);
  const [adjustDelta, setAdjustDelta] = useState("-1");
  const [adjustReason, setAdjustReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await retailerService.getInventory({
        low_stock: lowStock,
        search: search.trim() || undefined,
        limit: 50,
      });
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }, [lowStock, search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    catalogueService.getProducts({ limit: 100 }).then((p) => {
      const vars = p.data.flatMap((prod) =>
        prod.variants.map((v) => ({ id: v.id, label: `${prod.title} (${v.unit})` }))
      );
      setAllVariants(vars);
      if (vars[0]) setInwardVarId(vars[0].id);
    });
  }, []);

  const submitInward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await retailerService.inwardStock({
        variant_id: inwardVarId,
        quantity: Number(inwardQty),
        batch_number: inwardBatch,
        cost_price_paise: Math.round(Number(inwardCostRupees) * 100),
        supplier_name: inwardSupplier,
      });
      toast.success("Stock batch inwarded.");
      setInwardOpen(false);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Inward failed");
    }
  };

  const submitAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    try {
      await retailerService.adjustStock(adjustTarget.id, {
        quantity_delta: Number(adjustDelta),
        reason: adjustReason,
      });
      toast.success("Stock adjusted with audit log.");
      setAdjustTarget(null);
      setAdjustReason("");
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Adjustment failed");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Store Inventory"
        subtitle="Track stock levels, reorder alerts, batches, and manual adjustments"
        action={
          <>
            <Link to="/retailer/inventory/movements">
              <Button variant="outline" size="sm">
                <History className="w-4 h-4 mr-1.5" />
                Movements
              </Button>
            </Link>
            <Button size="sm" onClick={() => setInwardOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Inward Batch
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search SKU or product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={lowStock}
            onChange={(e) => setLowStock(e.target.checked)}
            className="accent-primary"
          />
          Low stock only
        </label>
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="p-3">SKU / Product</th>
                <th className="p-3 text-right">Stock</th>
                <th className="p-3 text-right">Reorder Level</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="p-3">
                    <div className="font-medium text-text">{it.product_title}</div>
                    <div className="text-xs text-muted">
                      {it.pack_unit} · {it.sku}
                    </div>
                  </td>
                  <td className="p-3 text-right tabular-nums font-semibold">
                    {it.current_stock_qty}
                  </td>
                  <td className="p-3 text-right tabular-nums text-muted">{it.reorder_level_qty}</td>
                  <td className="p-3 text-center">
                    <StatusBadge status={it.is_low_stock ? "LOW_STOCK" : "ACTIVE"} />
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => setAdjustTarget(it)}>
                      Adjust
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal isOpen={inwardOpen} onClose={() => setInwardOpen(false)} title="Inward Stock Batch">
        <form onSubmit={submitInward} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium">Variant</label>
            <select
              value={inwardVarId}
              onChange={(e) => setInwardVarId(e.target.value)}
              className="w-full h-10 px-3 border border-border rounded-ctl text-sm bg-surface"
            >
              {allVariants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity"
              type="number"
              min={1}
              value={inwardQty}
              onChange={(e) => setInwardQty(e.target.value)}
              required
            />
            <Input
              label="Unit Cost (₹)"
              type="number"
              min={0}
              value={inwardCostRupees}
              onChange={(e) => setInwardCostRupees(e.target.value)}
              required
            />
          </div>
          <Input
            label="Batch Number"
            value={inwardBatch}
            onChange={(e) => setInwardBatch(e.target.value)}
            required
          />
          <Input
            label="Supplier"
            value={inwardSupplier}
            onChange={(e) => setInwardSupplier(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setInwardOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Inward Stock</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(adjustTarget)}
        onClose={() => setAdjustTarget(null)}
        title={`Adjust Stock · ${adjustTarget?.product_title ?? ""}`}
      >
        <form onSubmit={submitAdjust} className="space-y-4">
          <Input
            label="Quantity Delta (e.g. -2 for spoilage or +5 count correction)"
            type="number"
            value={adjustDelta}
            onChange={(e) => setAdjustDelta(e.target.value)}
            required
          />
          <Input
            label="Audit Reason"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            placeholder="Physical cycle count variance"
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAdjustTarget(null)}>
              Cancel
            </Button>
            <Button type="submit">Save Adjustment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function RetailerMovementsPage() {
  const [rows, setRows] = useState<InventoryMovementDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    retailerService
      .getMovements(1, 50)
      .then((res) => setRows(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movement Ledger"
        subtitle="Audit history of batch inwards, packed deductions, and manual adjustments"
      />
      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="p-3">Time</th>
                <th className="p-3">Product</th>
                <th className="p-3">Type</th>
                <th className="p-3 text-right">Delta</th>
                <th className="p-3">Reference / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((m) => (
                <tr key={m.id}>
                  <td className="p-3 text-xs text-muted whitespace-nowrap">
                    {formatDateTimeIST(m.created_at)}
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{m.product_title}</div>
                    <div className="text-xs text-muted">{m.sku}</div>
                  </td>
                  <td className="p-3">
                    <StatusBadge status={m.movement_type} />
                  </td>
                  <td className="p-3 text-right font-semibold tabular-nums">
                    {m.quantity_delta > 0 ? `+${m.quantity_delta}` : m.quantity_delta}
                  </td>
                  <td className="p-3 text-xs text-muted">
                    {m.reference_id} {m.notes ? `— ${m.notes}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export function RetailerPaymentsPage() {
  const [metrics, setMetrics] = useState<RetailerDashboardMetricsDTO | null>(null);
  const [orders, setOrders] = useState<RetailerOrderSummaryDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([retailerService.getDashboard(), retailerService.getOrders({ limit: 30 })])
      .then(([m, o]) => {
        setMetrics(m);
        setOrders(o.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Store Settlements" subtitle="Billed bulk order proceeds and collections" />
      {loading || !metrics ? (
        <Skeleton className="h-48" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <span className="text-xs text-muted">Gross Order Volume</span>
              <div className="text-xl font-semibold mt-1">
                <Money paise={metrics.gross_order_value_paise} />
              </div>
            </Card>
            <Card className="p-4">
              <span className="text-xs text-muted">Monthly Sales Billed</span>
              <div className="text-xl font-semibold mt-1">
                <Money paise={metrics.monthly_sales_paise} />
              </div>
            </Card>
            <Card className="p-4">
              <span className="text-xs text-muted">Pending Resident Collections</span>
              <div className="text-xl font-semibold mt-1">
                <Money paise={metrics.outstanding_collections_paise} />
              </div>
            </Card>
          </div>
          <Card className="divide-y divide-border">
            {orders.map((o) => (
              <div key={o.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <span className="text-sm font-semibold">{o.order_number}</span>
                  <p className="text-xs text-muted">
                    {o.community_name} · Cycle {o.cycle_month}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Money paise={o.total_paise} className="text-sm font-semibold" />
                  <StatusBadge status={o.status} />
                </div>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}

export function RetailerProfilePage() {
  const { user, logout } = useAuth();
  if (!user?.retailer) return null;
  return (
    <div className="space-y-6">
      <PageHeader title="Merchant Store Profile" />
      <Card className="p-5 space-y-4 max-w-xl text-sm">
        <div>
          <span className="text-xs text-muted block">Store Name</span>
          <span className="font-semibold">{user.retailer.store_name}</span>
        </div>
        <div>
          <span className="text-xs text-muted block">Address</span>
          <span>{user.retailer.business_address}</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-muted block">GSTIN</span>
            <span>{user.retailer.gstin ?? "—"}</span>
          </div>
          <div>
            <span className="text-xs text-muted block">Contact</span>
            <span>{user.retailer.phone}</span>
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
