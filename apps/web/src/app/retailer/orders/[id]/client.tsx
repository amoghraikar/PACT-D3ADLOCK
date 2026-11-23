"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Button, StatusPill, MoneyText, Skeleton, EmptyState, Modal, Input } from "@/components/ui";
import {
  retailerService,
  RetailerOrderDetail,
  RetailerOrderItemDetail,
} from "@/services/retailer.service";
import { useToast } from "@/hooks/useToast";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  PackageCheck,
  Send,
  Truck,
  AlertTriangle,
  Receipt,
  Users,
} from "lucide-react";

export function RetailerOrderDetailClient() {
  const routeParams = useParams();
  const searchParams = useSearchParams();
  const { success, error: toastError, info } = useToast();

  const orderId =
    (typeof routeParams?.id === "string" && routeParams.id !== "placeholder"
      ? routeParams.id
      : null) ||
    searchParams.get("id") ||
    "placeholder";

  const [order, setOrder] = useState<RetailerOrderDetail | null>(null);
  const [packingItems, setPackingItems] = useState<
    {
      variant_id: string;
      packed_qty: number;
      is_unavailable: boolean;
      notes: string;
    }[]
  >([]);

  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(orderId && orderId !== "placeholder"));
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>("");

  // Bill Preview Modal
  const [billPreviewModalOpen, setBillPreviewModalOpen] = useState<boolean>(false);
  const [billPreviewData, setBillPreviewData] = useState<any>(null);

  const loadOrderDetail = async () => {
    if (!orderId || orderId === "placeholder") {
      setIsLoading(false);
      return;
    }

    try {
      const data = await retailerService.getOrderDetail(orderId);
      setOrder(data);
      // Initialize packing state
      setPackingItems(
        data.items.map((i) => ({
          variant_id: i.variant_id,
          packed_qty: i.packed_qty ?? i.requested_qty,
          is_unavailable: i.is_unavailable || false,
          notes: "",
        }))
      );
    } catch (err: any) {
      toastError(err?.message || "Failed to load order details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!orderId || orderId === "placeholder") {
      return;
    }

    let ignore = false;
    async function load() {
      try {
        const data = await retailerService.getOrderDetail(orderId);
        if (!ignore) {
          setOrder(data);
          setPackingItems(
            data.items.map((i) => ({
              variant_id: i.variant_id,
              packed_qty: i.packed_qty ?? i.requested_qty,
              is_unavailable: i.is_unavailable || false,
              notes: "",
            }))
          );
        }
      } catch (err: any) {
        if (!ignore) toastError(err?.message || "Failed to load order details");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [orderId, toastError]);

  const handleAccept = async () => {
    setIsActionLoading(true);
    try {
      await retailerService.acceptOrder(orderId);
      success("Order accepted! You can now pack the inventory.");
      await loadOrderDetail();
    } catch (err: any) {
      toastError(err?.message || "Failed to accept order");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toastError("Please enter a rejection reason");
      return;
    }
    setIsActionLoading(true);
    try {
      await retailerService.rejectOrder(orderId, rejectReason.trim());
      success("Order rejected");
      setRejectModalOpen(false);
      await loadOrderDetail();
    } catch (err: any) {
      toastError(err?.message || "Failed to reject order");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePackedQtyChange = (variantId: string, val: number) => {
    setPackingItems((prev) =>
      prev.map((i) =>
        i.variant_id === variantId ? { ...i, packed_qty: Math.max(0, val) } : i
      )
    );
  };

  const handleToggleUnavailable = (variantId: string, checked: boolean) => {
    setPackingItems((prev) =>
      prev.map((i) =>
        i.variant_id === variantId
          ? {
              ...i,
              is_unavailable: checked,
              packed_qty: checked ? 0 : i.packed_qty,
            }
          : i
      )
    );
  };

  const handleSavePacking = async () => {
    setIsActionLoading(true);
    try {
      await retailerService.updatePacking(
        orderId,
        packingItems.map((p) => ({
          variant_id: p.variant_id,
          packed_qty: p.packed_qty,
          is_unavailable: p.is_unavailable,
          notes: p.notes || undefined,
        }))
      );
      success("Packing quantities recorded successfully!");
      await loadOrderDetail();
    } catch (err: any) {
      toastError(err?.message || "Failed to save packing updates");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePreviewBill = async () => {
    setIsActionLoading(true);
    try {
      const preview = await retailerService.getBillPreview(orderId);
      setBillPreviewData(preview);
      setBillPreviewModalOpen(true);
    } catch (err: any) {
      toastError(err?.message || "Failed to preview bill");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSendBill = async () => {
    setIsActionLoading(true);
    try {
      await retailerService.sendBill(orderId);
      success("Final Retailer Bill generated and F7 resident invoices created!");
      setBillPreviewModalOpen(false);
      await loadOrderDetail();
    } catch (err: any) {
      toastError(err?.message || "Failed to finalize bill");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDispatch = async () => {
    setIsActionLoading(true);
    try {
      await retailerService.dispatchOrder(orderId);
      success("Order dispatched for delivery to community gate!");
      await loadOrderDetail();
    } catch (err: any) {
      toastError(err?.message || "Failed to dispatch order");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <Link
            href="/retailer/orders"
            className="text-xs font-semibold text-muted hover:text-text inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Orders</span>
          </Link>
        </div>

        {isLoading ? (
          <Skeleton variant="card" className="h-64 w-full" />
        ) : !order ? (
          <EmptyState
            title="Order Not Found"
            description="The requested bulk order could not be retrieved."
          />
        ) : (
          <div className="space-y-6">
            {/* Header Card */}
            <Card className="p-6 space-y-4 bg-surface border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-muted">
                      ORDER #{order.order_number}
                    </span>
                    <StatusPill status={order.status}>{order.status}</StatusPill>
                  </div>
                  <h1 className="text-2xl font-bold text-text mt-1">
                    {order.community_name} Collective Bulk Order
                  </h1>
                  <p className="text-xs text-muted">
                    Cycle: {order.cycle_month} · {order.participating_households_count} Participating Households
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-muted block">Order Total</span>
                  <div className="text-2xl font-bold text-text">
                    <MoneyText paise={order.total_paise} />
                  </div>
                </div>
              </div>

              {/* Order State Machine Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-xs text-muted">
                  Current Workflow Stage: <strong className="text-text uppercase">{order.status}</strong>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {order.status === "PENDING" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRejectModalOpen(true)}
                        disabled={isActionLoading}
                        className="text-danger-700 hover:bg-danger-100"
                      >
                        <XCircle className="w-4 h-4 mr-1.5" />
                        <span>Reject</span>
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleAccept}
                        isLoading={isActionLoading}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        <span>Accept Bulk Order</span>
                      </Button>
                    </>
                  )}

                  {(order.status === "ACCEPTED" || order.status === "PACKING") && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSavePacking}
                        isLoading={isActionLoading}
                      >
                        <PackageCheck className="w-4 h-4 mr-1.5 text-primary" />
                        <span>Save Packing Progress</span>
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handlePreviewBill}
                        isLoading={isActionLoading}
                      >
                        <Receipt className="w-4 h-4 mr-1.5" />
                        <span>Preview & Finalize Bill</span>
                      </Button>
                    </>
                  )}

                  {order.status === "BILLED" && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleDispatch}
                      isLoading={isActionLoading}
                    >
                      <Truck className="w-4 h-4 mr-1.5" />
                      <span>Dispatch Consolidated Delivery</span>
                    </Button>
                  )}

                  {(order.status === "DISPATCHED" || order.status === "COMPLETED") && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface border border-primary text-primary text-xs font-bold rounded-pill">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Order Handed Over for Delivery</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Packing Workstation Table */}
            <Card className="overflow-hidden border border-border">
              <div className="p-4 bg-background border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-text">
                    Consolidated Product Demand & Packing Checklist
                  </h2>
                  <p className="text-xs text-muted">
                    Pack units cannot exceed requested units. Explicitly mark unavailable items.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-background border-b border-border text-muted font-semibold">
                      <th className="p-3">Product Variant</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3 text-center">Requested</th>
                      <th className="p-3 text-center">Packed</th>
                      <th className="p-3 text-center">Unavailable</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {order.items.map((item) => {
                      const packState = packingItems.find((p) => p.variant_id === item.variant_id);
                      const currentPacked = packState ? packState.packed_qty : item.packed_qty;
                      const isUnavail = packState ? packState.is_unavailable : item.is_unavailable;
                      const isEditable = order.status === "ACCEPTED" || order.status === "PACKING";

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-background/40 transition-colors ${
                            isUnavail ? "opacity-60 bg-danger-100/20" : ""
                          }`}
                        >
                          <td className="p-3">
                            <span className="font-bold text-text block">{item.product_title}</span>
                            <span className="text-muted text-[11px]">{item.variant_title}</span>
                          </td>
                          <td className="p-3 font-mono text-muted">{item.variant_sku}</td>
                          <td className="p-3 text-center font-bold text-text">
                            {item.requested_qty}
                          </td>
                          <td className="p-3 text-center">
                            {isEditable ? (
                              <input
                                type="number"
                                min={0}
                                max={item.requested_qty}
                                value={currentPacked}
                                disabled={isUnavail}
                                onChange={(e) =>
                                  handlePackedQtyChange(item.variant_id, parseInt(e.target.value) || 0)
                                }
                                className="w-16 p-1 border border-border rounded text-center text-xs font-bold text-text focus-ring disabled:opacity-50"
                              />
                            ) : (
                              <span className="font-bold text-text">{item.packed_qty}</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {isEditable ? (
                              <input
                                type="checkbox"
                                checked={isUnavail}
                                onChange={(e) =>
                                  handleToggleUnavailable(item.variant_id, e.target.checked)
                                }
                                className="w-4 h-4 accent-primary cursor-pointer"
                              />
                            ) : (
                              <span>{item.is_unavailable ? "Yes" : "No"}</span>
                            )}
                          </td>
                          <td className="p-3 text-right text-muted">
                            <MoneyText paise={item.unit_price_paise} />
                          </td>
                          <td className="p-3 text-right font-bold text-text">
                            <MoneyText paise={item.subtotal_paise} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Bill Finalized Breakdown (if billed) */}
            {order.retailer_bill && (
              <Card className="p-5 space-y-3 bg-surface border-border">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <h3 className="text-sm font-bold text-text">Final Retailer Bill Snapshot</h3>
                  <span className="font-mono text-xs text-muted">
                    BILL #{order.retailer_bill.bill_number}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-muted block">Gross Packed Amount:</span>
                    <span className="font-bold text-text text-sm">
                      <MoneyText paise={order.retailer_bill.gross_amount_paise} />
                    </span>
                  </div>
                  <div>
                    <span className="text-muted block">Bulk Discount:</span>
                    <span className="font-bold text-primary text-sm">
                      - <MoneyText paise={order.retailer_bill.discount_amount_paise} />
                    </span>
                  </div>
                  <div>
                    <span className="text-muted block">Delivery Payout:</span>
                    <span className="font-bold text-text text-sm">
                      + <MoneyText paise={order.retailer_bill.delivery_amount_paise} />
                    </span>
                  </div>
                  <div>
                    <span className="text-muted block">Final Net Payout:</span>
                    <span className="font-bold text-text text-sm">
                      <MoneyText paise={order.retailer_bill.net_amount_paise} />
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* Reject Order Modal */}
            <Modal
              isOpen={rejectModalOpen}
              onClose={() => setRejectModalOpen(false)}
              title="Reject Community Bulk Order"
              confirmLabel="Confirm Rejection"
              onConfirm={handleReject}
              isConfirmLoading={isActionLoading}
            >
              <div className="space-y-3">
                <p className="text-xs text-muted">
                  Please provide a reason for rejecting this consolidated bulk order:
                </p>
                <Input
                  label="Rejection Reason"
                  placeholder="e.g. Temporary stock shortage for requested pulses"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  required
                />
              </div>
            </Modal>

            {/* Bill Preview Modal */}
            <Modal
              isOpen={billPreviewModalOpen}
              onClose={() => setBillPreviewModalOpen(false)}
              title="Preview Final Retailer Bill"
              confirmLabel="Finalize & Send Invoices"
              onConfirm={handleSendBill}
              isConfirmLoading={isActionLoading}
              size="lg"
            >
              <div className="space-y-4">
                <p className="text-xs text-muted">
                  Review the final financial totals. Clicking Finalize will trigger the F7 algorithm, generate resident invoices atomically, and lock financial records.
                </p>

                {billPreviewData && (
                  <div className="p-4 bg-background rounded-card border border-border space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span>Total Packed Units:</span>
                      <span className="font-bold text-text">
                        {billPreviewData.total_packed_items || order.total_requested_items}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gross Merchandise Value:</span>
                      <span className="font-bold text-text">
                        <MoneyText paise={billPreviewData.gross_paise || order.subtotal_paise} />
                      </span>
                    </div>
                    <div className="flex justify-between text-primary">
                      <span>Bulk Volume Discount:</span>
                      <span className="font-bold">
                        - <MoneyText paise={billPreviewData.discount_paise || 0} />
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Fee:</span>
                      <span className="font-bold text-text">
                        + <MoneyText paise={billPreviewData.delivery_fee_paise || order.delivery_fee_paise} />
                      </span>
                    </div>
                    <div className="pt-2 border-t border-border flex justify-between font-bold text-sm text-text">
                      <span>Final Retailer Bill Total:</span>
                      <span>
                        <MoneyText paise={billPreviewData.total_paise || order.total_paise} />
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Modal>
          </div>
        )}
      </div>
    </AppShell>
  );
}
