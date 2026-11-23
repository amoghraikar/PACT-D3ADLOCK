"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Button, StatusPill, SearchBar, Skeleton, EmptyState, Modal, Input } from "@/components/ui";
import { retailerService, InventoryItem } from "@/services/retailer.service";
import { useToast } from "@/hooks/useToast";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Package,
  Plus,
  Edit2,
  AlertTriangle,
  History,
  CheckCircle2,
  Layers,
} from "lucide-react";

export default function RetailerInventoryPage() {
  const { success, error: toastError } = useToast();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState<string>("");
  const debouncedSearch = useDebounce(search, 300);
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Inward Modal
  const [inwardModalOpen, setInwardModalOpen] = useState<boolean>(false);
  const [inwardVariantId, setInwardVariantId] = useState<string>("");
  const [inwardQty, setInwardQty] = useState<number>(50);
  const [inwardBatch, setInwardBatch] = useState<string>("B-1001");
  const [isInwarding, setIsInwarding] = useState<boolean>(false);

  // Adjust Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState<boolean>(false);
  const [activeItemForAdjust, setActiveItemForAdjust] = useState<InventoryItem | null>(null);
  const [adjustNewQty, setAdjustNewQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>("");
  const [isAdjusting, setIsAdjusting] = useState<boolean>(false);

  const loadInventory = async () => {
    try {
      const res = await retailerService.getInventory({
        search: debouncedSearch.trim() || undefined,
        low_stock: lowStockOnly || undefined,
        limit: 50,
      });
      setItems(res.items || []);
      if (!inwardVariantId && res.items?.length > 0) {
        setInwardVariantId(res.items[0].variant_id);
      }
    } catch (err: any) {
      toastError(err?.message || "Failed to load stock inventory");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await retailerService.getInventory({
          search: debouncedSearch.trim() || undefined,
          low_stock: lowStockOnly || undefined,
          limit: 50,
        });
        if (!ignore) {
          setItems(res.items || []);
          if (!inwardVariantId && res.items?.length > 0) {
            setInwardVariantId(res.items[0].variant_id);
          }
        }
      } catch (err: any) {
        if (!ignore) toastError(err?.message || "Failed to load stock inventory");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [debouncedSearch, lowStockOnly, toastError, inwardVariantId]);

  const handleInwardStock = async () => {
    if (!inwardVariantId || inwardQty <= 0) {
      toastError("Please provide a valid variant and quantity");
      return;
    }

    setIsInwarding(true);
    try {
      await retailerService.inwardStock({
        variant_id: inwardVariantId,
        quantity: inwardQty,
        batch_number: inwardBatch,
      });
      success(`Successfully inwarded ${inwardQty} units to stock!`);
      setInwardModalOpen(false);
      await loadInventory();
    } catch (err: any) {
      toastError(err?.message || "Failed to inward stock batch");
    } finally {
      setIsInwarding(false);
    }
  };

  const openAdjustModal = (item: InventoryItem) => {
    setActiveItemForAdjust(item);
    setAdjustNewQty(item.current_stock);
    setAdjustReason("");
    setAdjustModalOpen(true);
  };

  const handleAdjustStock = async () => {
    if (!activeItemForAdjust) return;
    if (!adjustReason.trim()) {
      toastError("Please enter an audit reason for adjusting inventory");
      return;
    }

    setIsAdjusting(true);
    try {
      await retailerService.adjustStock(activeItemForAdjust.id, {
        new_quantity: adjustNewQty,
        reason: adjustReason.trim(),
      });
      success(`Stock adjusted for ${activeItemForAdjust.product_title}!`);
      setAdjustModalOpen(false);
      await loadInventory();
    } catch (err: any) {
      toastError(err?.message || "Failed to adjust stock");
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-text">
              Retailer Stock Inventory
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Track warehouse stock levels, batch inwarding, and audit adjustments
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/retailer/inventory/movements">
              <Button variant="outline" size="sm" className="h-9">
                <History className="w-4 h-4 mr-1.5 text-primary" />
                <span>Movements Ledger</span>
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setInwardModalOpen(true)}
              className="h-9"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Inward Batch</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="w-full sm:w-72">
            <SearchBar
              placeholder="Search by title, SKU, brand..."
              value={search}
              onChange={setSearch}
            />
          </div>

          <button
            type="button"
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-3 py-1.5 rounded-pill text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto ${
              lowStockOnly
                ? "bg-amber-100 text-amber-900 border-amber-300"
                : "bg-surface text-muted border-border hover:text-text"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Low Stock Alerts Only</span>
          </button>
        </div>

        {/* Inventory Table */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="card" className="h-16 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No Inventory Items Found"
            description={
              lowStockOnly
                ? "No products are currently at or below reorder threshold."
                : "No inventory records matched your search query."
            }
          />
        ) : (
          <Card className="overflow-hidden border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-background border-b border-border text-muted font-semibold">
                    <th className="p-3">Product Title</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3 text-center">Current</th>
                    <th className="p-3 text-center">Reserved</th>
                    <th className="p-3 text-center">Available</th>
                    <th className="p-3 text-center">Threshold</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-background/40 transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-text block">{item.product_title}</span>
                        <span className="text-muted text-[11px]">
                          {item.variant_title} · {item.brand}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-muted">{item.sku}</td>
                      <td className="p-3 text-center font-bold text-text text-sm">
                        {item.current_stock}
                      </td>
                      <td className="p-3 text-center text-muted">{item.reserved_stock}</td>
                      <td className="p-3 text-center font-bold text-primary">
                        {item.available_stock}
                      </td>
                      <td className="p-3 text-center text-muted">{item.reorder_threshold}</td>
                      <td className="p-3 text-center">
                        {item.is_low_stock ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-pill bg-danger-100 text-danger-700">
                            LOW
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-pill bg-surface border border-primary text-primary">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => openAdjustModal(item)}
                          className="px-2 py-1 rounded border border-border text-xs font-semibold text-text hover:bg-background transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3 text-muted" />
                          <span>Adjust</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Inward Batch Modal */}
        <Modal
          isOpen={inwardModalOpen}
          onClose={() => setInwardModalOpen(false)}
          title="Inward Stock Batch"
          confirmLabel="Inward Stock"
          onConfirm={handleInwardStock}
          isConfirmLoading={isInwarding}
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-text block mb-1">Select Product Variant</label>
              <select
                value={inwardVariantId}
                onChange={(e) => setInwardVariantId(e.target.value)}
                className="w-full p-2.5 rounded-card border border-border bg-background text-text focus-ring text-xs"
              >
                {items.map((it) => (
                  <option key={it.variant_id} value={it.variant_id}>
                    {it.product_title} ({it.variant_title}) — Current: {it.current_stock}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Batch Inward Quantity"
                type="number"
                min={1}
                value={inwardQty}
                onChange={(e) => setInwardQty(parseInt(e.target.value) || 0)}
                required
              />
              <Input
                label="Batch / Invoice Number"
                value={inwardBatch}
                onChange={(e) => setInwardBatch(e.target.value)}
                required
              />
            </div>
          </div>
        </Modal>

        {/* Adjust Stock Modal */}
        <Modal
          isOpen={adjustModalOpen}
          onClose={() => setAdjustModalOpen(false)}
          title={`Adjust Stock: ${activeItemForAdjust?.product_title || ""}`}
          confirmLabel="Save Adjustment"
          onConfirm={handleAdjustStock}
          isConfirmLoading={isAdjusting}
        >
          <div className="space-y-4 text-xs">
            <p className="text-muted">
              Current stock on record: <strong>{activeItemForAdjust?.current_stock}</strong>. Every inventory adjustment is permanently recorded in the system audit trail.
            </p>

            <Input
              label="New Physical Stock Quantity"
              type="number"
              min={0}
              value={adjustNewQty}
              onChange={(e) => setAdjustNewQty(parseInt(e.target.value) || 0)}
              required
            />

            <Input
              label="Audit Justification Reason"
              placeholder="e.g. Physical inventory count discrepancy, expired bag removed"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              helperText="Required for retailer inventory audit compliance"
              required
            />
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
