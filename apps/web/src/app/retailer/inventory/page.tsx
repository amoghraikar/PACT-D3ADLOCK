"use client";

import React, { useState, useEffect, useMemo } from "react";
import { RetailerLayout } from "@/components/layout/RetailerLayout";
import {
  Card,
  Button,
  StatusPill,
  MoneyText,
  Dialog,
  Banner,
  Toast,
} from "@/components/ui";
import {
  Search,
  Plus,
  Edit2,
} from "lucide-react";

interface InventoryItem {
  variant_id: string;
  product_id: string;
  product_name: string;
  brand: string;
  category_id: string;
  category_name: string;
  variant_label: string;
  pack_size: number;
  pack_unit: string;
  mrp_paise: number;
  selling_price_paise: number;
  stock_qty: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
  availability: string;
}

const CATEGORIES = [
  "All",
  "Rice & Grains",
  "Flours & Atta",
  "Dal (Lentils) & Pulses",
  "Spices",
  "Sugar & Jaggery",
  "Cooking Oils & Ghee",
  "Sauces, Pickles & Spreads",
  "Dry Fruits",
  "Fruits & Nuts",
  "Beverages",
  "Snacks",
  "Breakfast & Cereals",
];

export default function RetailerInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editStock, setEditStock] = useState<number>(0);
  const [editSellingRupees, setEditSellingRupees] = useState<string>("");
  const [editMrpRupees, setEditMrpRupees] = useState<string>("");
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Stock Inward Bill Modal State
  const [inwardOpen, setInwardOpen] = useState(false);
  const [supplierName, setSupplierName] = useState("Metro Cash & Carry");
  const [invoiceNo, setInvoiceNo] = useState("INV-2026-9901");
  const [invoiceDate, setInvoiceDate] = useState("2026-11-21");
  const [inwardSelections, setInwardSelections] = useState<
    { variant_id: string; added_stock: number; purchase_rupees: string }[]
  >([
    { variant_id: "var-rice-sona-5kg", added_stock: 20, purchase_rupees: "270" },
    { variant_id: "var-sugar-1kg", added_stock: 40, purchase_rupees: "68" },
  ]);
  const [savingInward, setSavingInward] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load Inventory from API
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/retailer/inventory");
      if (res.ok) {
        const data = await res.json();
        setItems(data.inventory || []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCat =
        selectedCategory === "All" ||
        item.category_name.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        item.category_id === selectedCategory;

      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        item.product_name.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        item.variant_label.toLowerCase().includes(q);

      return matchCat && matchSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  // Metrics
  const totalStockUnits = useMemo(
    () => items.reduce((acc, it) => acc + it.stock_qty, 0),
    [items]
  );
  const lowStockCount = useMemo(
    () => items.filter((it) => it.stock_qty <= 25 && it.stock_qty > 0).length,
    [items]
  );
  const outOfStockCount = useMemo(
    () => items.filter((it) => it.stock_qty === 0).length,
    [items]
  );

  // Open Edit Dialog
  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setEditStock(item.stock_qty);
    setEditSellingRupees((item.selling_price_paise / 100).toString());
    setEditMrpRupees((item.mrp_paise / 100).toString());
    setEditError(null);
  };

  // Submit Edit
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const sellingPaise = Math.round(parseFloat(editSellingRupees || "0") * 100);
    const mrpPaise = Math.round(parseFloat(editMrpRupees || "0") * 100);

    if (sellingPaise > mrpPaise) {
      setEditError(`Selling price (₹${editSellingRupees}) cannot exceed MRP (₹${editMrpRupees})`);
      return;
    }

    try {
      setSavingEdit(true);
      setEditError(null);
      const res = await fetch(`/api/v1/retailer/inventory/${editingItem.variant_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock_qty: editStock,
          selling_price_paise: sellingPaise,
          mrp_paise: mrpPaise,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setEditError(err.detail || "Failed to update item");
        return;
      }

      setItems((prev) =>
        prev.map((it) =>
          it.variant_id === editingItem.variant_id
            ? {
                ...it,
                stock_qty: editStock,
                selling_price_paise: sellingPaise,
                mrp_paise: mrpPaise,
                status: editStock === 0 ? "out_of_stock" : editStock <= 25 ? "low_stock" : "in_stock",
              }
            : it
        )
      );

      setToastMessage(`Updated ${editingItem.product_name} (${editingItem.variant_label})`);
      setEditingItem(null);
    } catch {
      setEditError("Network error while saving item");
    } finally {
      setSavingEdit(false);
    }
  };

  // Submit Stock Inward Bill
  const handleSaveInward = async () => {
    if (inwardSelections.length === 0) return;
    try {
      setSavingInward(true);
      const payload = {
        supplier_name: supplierName,
        invoice_no: invoiceNo,
        invoice_date: invoiceDate,
        items: inwardSelections.map((sel) => ({
          variant_id: sel.variant_id,
          added_stock: sel.added_stock,
          purchase_price_paise: Math.round(parseFloat(sel.purchase_rupees || "0") * 100),
        })),
      };

      const res = await fetch("/api/v1/retailer/inventory/inward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setToastMessage(data.message || "Stock inward recorded successfully!");
        setInwardOpen(false);
        // Refresh inventory
        fetchInventory();
      }
    } catch {
      //
    } finally {
      setSavingInward(false);
    }
  };

  return (
    <RetailerLayout>
      <div className="space-y-6">
        {/* Header with Title and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl text-ink-800">
              Inventory & Price List
            </h1>
            <p className="text-xs sm:text-sm text-ink-600">
              Manage your staple catalogue, wholesale selling prices, and record incoming stock bills.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setInwardOpen(true)}
            >
              + Stock Inward (Supplier Bill)
            </Button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 space-y-1 bg-white">
            <span className="text-xs font-semibold text-ink-600">Active Catalogue</span>
            <div className="font-display text-2xl text-ink-800 tabular-nums">
              {items.length} Products
            </div>
            <span className="text-[11px] text-teal-700 font-medium">12 PACT Categories</span>
          </Card>

          <Card className="p-4 space-y-1 bg-white">
            <span className="text-xs font-semibold text-ink-600">Total Stock in Store</span>
            <div className="font-display text-2xl text-ink-800 tabular-nums">
              {totalStockUnits} Units
            </div>
            <span className="text-[11px] text-ink-500 font-medium">Across all variants</span>
          </Card>

          <Card className="p-4 space-y-1 bg-white">
            <span className="text-xs font-semibold text-ink-600">Low Stock Items</span>
            <div className="font-display text-2xl text-warning-700 tabular-nums">
              {lowStockCount}
            </div>
            <span className="text-[11px] text-warning-700 font-medium">Below 25 packs threshold</span>
          </Card>

          <Card className="p-4 space-y-1 bg-white">
            <span className="text-xs font-semibold text-ink-600">Out of Stock</span>
            <div className="font-display text-2xl text-ink-800 tabular-nums">
              {outOfStockCount}
            </div>
            <span className="text-[11px] text-success-700 font-medium">Needs re-order</span>
          </Card>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search staples by name, brand, or pack size..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-ctl border border-ice-300 bg-white text-xs text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <div className="text-xs font-medium text-ink-600">
            Showing <strong className="text-ink-800">{filteredItems.length}</strong> of {items.length} items
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? "bg-ink-800 text-white shadow-2xs"
                  : "bg-white text-ink-700 border border-ice-200 hover:border-ice-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Inventory Table Card */}
        <Card padding="none" className="overflow-hidden bg-white border border-ice-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-ice-100 text-[11px] font-bold text-ink-700 uppercase tracking-wider border-b border-ice-200">
                  <th className="py-3 px-4">Product & Brand</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Variant Pack</th>
                  <th className="py-3 px-4 text-right">MRP</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-center">Discount</th>
                  <th className="py-3 px-4 text-center">Stock</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ice-100 text-xs">
                {filteredItems.map((item) => {
                  const discountPaise = item.mrp_paise - item.selling_price_paise;
                  const discountPct =
                    item.mrp_paise > 0
                      ? Math.round((discountPaise / item.mrp_paise) * 100)
                      : 0;

                  return (
                    <tr
                      key={item.variant_id}
                      className="hover:bg-ice-50/50 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-ink-800">{item.product_name}</div>
                        <div className="text-[11px] text-ink-500">{item.brand}</div>
                      </td>
                      <td className="py-3.5 px-4 text-ink-600">{item.category_name}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-ink-800 px-2 py-0.5 bg-ice-100 rounded-ctl">
                          {item.variant_label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-ink-500 tabular-nums line-through">
                        <MoneyText paise={item.mrp_paise} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-ink-800 tabular-nums">
                        <MoneyText paise={item.selling_price_paise} size="base" />
                      </td>
                      <td className="py-3.5 px-4 text-center tabular-nums">
                        <span className="text-[11px] font-semibold text-teal-700 bg-ice-100 px-2 py-0.5 rounded-full">
                          {discountPct}% off
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold tabular-nums text-ink-800">
                        {item.stock_qty}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <StatusPill
                          kind={
                            item.status === "in_stock"
                              ? "success"
                              : item.status === "low_stock"
                              ? "warning"
                              : "danger"
                          }
                          label={
                            item.status === "in_stock"
                              ? "In Stock"
                              : item.status === "low_stock"
                              ? "Low Stock"
                              : "Out of Stock"
                          }
                        />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="quiet"
                          size="sm"
                          icon={<Edit2 className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenEdit(item)}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Edit Product Modal */}
        <Dialog
          isOpen={Boolean(editingItem)}
          onClose={() => setEditingItem(null)}
          title={`Edit Inventory: ${editingItem?.product_name || ""}`}
          description={`Variant: ${editingItem?.variant_label || ""} · ${editingItem?.brand || ""}`}
          confirmLabel="Save Changes"
          cancelLabel="Cancel"
          onConfirm={handleSaveEdit}
          isConfirmLoading={savingEdit}
        >
          <div className="space-y-4 py-2">
            {editError && <Banner kind="danger" message={editError} />}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-700">Stock Quantity (Packs on shelf)</label>
              <input
                type="number"
                min="0"
                value={editStock}
                onChange={(e) => setEditStock(parseInt(e.target.value) || 0)}
                className="w-full h-11 px-3.5 rounded-ctl border border-ice-300 bg-white text-sm font-semibold text-ink-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-700">MRP (₹)</label>
                <input
                  type="number"
                  step="0.5"
                  value={editMrpRupees}
                  onChange={(e) => setEditMrpRupees(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-ctl border border-ice-300 bg-white text-sm font-semibold text-ink-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-700">Selling Price (₹)</label>
                <input
                  type="number"
                  step="0.5"
                  value={editSellingRupees}
                  onChange={(e) => setEditSellingRupees(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-ctl border border-ice-300 bg-white text-sm font-semibold text-ink-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
                <span className="text-[11px] text-ink-500">Must be ≤ MRP</span>
              </div>
            </div>
          </div>
        </Dialog>

        {/* Stock Inward Bill Modal */}
        <Dialog
          isOpen={inwardOpen}
          onClose={() => setInwardOpen(false)}
          title="Stock Inward · Supplier Purchase Bill"
          description="Enter details from your wholesale distributor invoice to automatically update inventory counts."
          confirmLabel="Record Inward & Update Stock"
          cancelLabel="Cancel"
          onConfirm={handleSaveInward}
          isConfirmLoading={savingInward}
        >
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-700">Supplier Name</label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full h-10 px-3 rounded-ctl border border-ice-300 text-xs text-ink-800"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-700">Invoice / Bill No</label>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  className="w-full h-10 px-3 rounded-ctl border border-ice-300 text-xs text-ink-800"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-700">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-ctl border border-ice-300 text-xs text-ink-800"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-ice-200">
              <div className="flex items-center justify-between text-xs font-bold text-ink-800">
                <span>Items Received</span>
                <button
                  type="button"
                  onClick={() =>
                    setInwardSelections((prev) => [
                      ...prev,
                      { variant_id: "var-oil-sunflower-1l", added_stock: 10, purchase_rupees: "220" },
                    ])
                  }
                  className="text-teal-700 hover:underline text-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add line
                </button>
              </div>

              {inwardSelections.map((sel, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-ice-50 rounded-ctl border border-ice-200 grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-6">
                    <select
                      value={sel.variant_id}
                      onChange={(e) => {
                        const val = e.target.value;
                        setInwardSelections((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, variant_id: val } : s))
                        );
                      }}
                      className="w-full h-9 px-2 rounded-ctl border border-ice-300 bg-white text-xs text-ink-800"
                    >
                      {items.map((it) => (
                        <option key={it.variant_id} value={it.variant_id}>
                          {it.product_name} ({it.variant_label}) · Current: {it.stock_qty}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={sel.added_stock}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setInwardSelections((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, added_stock: val } : s))
                        );
                      }}
                      className="w-full h-9 px-2 text-center rounded-ctl border border-ice-300 bg-white text-xs text-ink-800 font-bold"
                    />
                  </div>

                  <div className="col-span-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setInwardSelections((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-xs text-danger-700 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Dialog>

        {/* Toast confirmation */}
        {toastMessage && (
          <Toast
            isOpen={Boolean(toastMessage)}
            message={toastMessage}
            onClose={() => setToastMessage(null)}
          />
        )}
      </div>
    </RetailerLayout>
  );
}
