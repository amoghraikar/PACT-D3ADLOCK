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
  Truck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Store,
  Package,
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

// Preferred / Frequently used wholesale distributors by category for the retailer
const FREQUENT_SUPPLIERS_MAP: Record<string, { supplier: string; orderHistory: string }> = {
  "Rice & Grains": { supplier: "Bangalore Grain Merchants Wholesale Co-op (APMC Yard)", orderHistory: "14 previous POs" },
  "Cooking Oils & Ghee": { supplier: "Karnataka Oil Mills & Refineries Syndicate", orderHistory: "18 previous POs" },
  "Dal & Pulses": { supplier: "Sri Balaji Pulses & Agro Wholesale", orderHistory: "12 previous POs" },
  "Flours & Atta": { supplier: "Harvest Gold Mills Wholesale Depot", orderHistory: "15 previous POs" },
  "Spices": { supplier: "Metro Cash & Carry Wholesale", orderHistory: "24 previous POs" },
  "Sugar & Jaggery": { supplier: "Metro Cash & Carry Wholesale", orderHistory: "22 previous POs" },
  "Dry Fruits & Nuts": { supplier: "Bangalore Dry Fruits & Wholesale Merchants (APMC)", orderHistory: "9 previous POs" },
  "Dry Fruits": { supplier: "Bangalore Dry Fruits & Wholesale Merchants (APMC)", orderHistory: "9 previous POs" },
  "Fruits & Nuts": { supplier: "Bangalore Dry Fruits & Wholesale Merchants (APMC)", orderHistory: "9 previous POs" },
  "Beverages": { supplier: "Universal FMCG & Beverage Wholesale Distributors", orderHistory: "11 previous POs" },
  "Snacks": { supplier: "Karnataka Savouries & Snacks Wholesale", orderHistory: "8 previous POs" },
  "Breakfast & Cereals": { supplier: "Metro Cash & Carry Wholesale", orderHistory: "10 previous POs" },
};

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

  // Add Product Modal State
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdBrand, setNewProdBrand] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("Rice & Grains");
  const [newProdVariantLabel, setNewProdVariantLabel] = useState("1 kg");
  const [newProdPackSize, setNewProdPackSize] = useState("1");
  const [newProdPackUnit, setNewProdPackUnit] = useState("kg");
  const [newProdMrpRupees, setNewProdMrpRupees] = useState("");
  const [newProdSellingRupees, setNewProdSellingRupees] = useState("");
  const [newProdStock, setNewProdStock] = useState("50");
  const [newProdImageUrl, setNewProdImageUrl] = useState("");
  const [addProdError, setAddProdError] = useState<string | null>(null);
  const [savingNewProd, setSavingNewProd] = useState(false);

  // Auto-Restock / Low Stock Quick Reorder Modal State
  const [autoRestockOpen, setAutoRestockOpen] = useState(false);
  const [submittingRestock, setSubmittingRestock] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load Inventory from API
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/retailer/inventory", { credentials: "include" });
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
    const interval = setInterval(fetchInventory, 4000);
    return () => clearInterval(interval);
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
  const lowStockItems = useMemo(
    () => items.filter((it) => it.stock_qty <= 25),
    [items]
  );
  const lowStockCount = lowStockItems.length;
  const outOfStockCount = useMemo(
    () => items.filter((it) => it.stock_qty === 0).length,
    [items]
  );

  // Low stock auto-reorder summary
  const lowStockSummary = useMemo(() => {
    let units = 0;
    let estimatedCostRupees = 0;
    const suppliersSet = new Set<string>();

    lowStockItems.forEach((it) => {
      const qty = it.pack_unit === "kg" && it.pack_size >= 5 ? 30 : 50;
      units += qty;
      const rateRupees = Math.round((it.selling_price_paise * 0.82) / 100);
      estimatedCostRupees += rateRupees * qty;
      const sup = FREQUENT_SUPPLIERS_MAP[it.category_name]?.supplier || "Metro Cash & Carry Wholesale";
      suppliersSet.add(sup);
    });

    return {
      totalUnits: units,
      estimatedCostRupees,
      suppliersCount: suppliersSet.size,
      suppliersList: Array.from(suppliersSet),
    };
  }, [lowStockItems]);

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
        credentials: "include",
        body: JSON.stringify({
          stock_qty: editStock,
          selling_price_paise: sellingPaise,
          mrp_paise: mrpPaise,
        }),
      });

      if (res.ok) {
        setToastMessage(`Updated ${editingItem.product_name} (${editingItem.variant_label})`);
        setEditingItem(null);
        fetchInventory();
      } else {
        const err = await res.json().catch(() => ({}));
        setEditError(err.detail || err.message || "Failed to update item");
      }
    } catch {
      setEditError("Network error updating item");
    } finally {
      setSavingEdit(false);
    }
  };

  // Submit Inward Bill
  const handleSaveInward = async () => {
    if (!supplierName.trim() || !invoiceNo.trim()) return;

    try {
      setSavingInward(true);
      const res = await fetch("/api/v1/retailer/inventory/inward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          supplier_name: supplierName,
          invoice_no: invoiceNo,
          invoice_date: invoiceDate,
          items: inwardSelections.map((sel) => ({
            variant_id: sel.variant_id,
            added_stock: sel.added_stock,
            purchase_price_paise: Math.round(parseFloat(sel.purchase_rupees || "0") * 100),
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setToastMessage(data.message || "Stock inward recorded successfully!");
        setInwardOpen(false);
        fetchInventory();
      }
    } catch {
      //
    } finally {
      setSavingInward(false);
    }
  };

  // 1-Click Confirmation for Low-Stock Auto Restock
  const handleConfirmAutoRestock = async () => {
    if (lowStockItems.length === 0) {
      setAutoRestockOpen(false);
      return;
    }

    try {
      setSubmittingRestock(true);
      const reorderPayload = lowStockItems.map((it) => {
        const sup = FREQUENT_SUPPLIERS_MAP[it.category_name]?.supplier || "Metro Cash & Carry Wholesale";
        const qty = it.pack_unit === "kg" && it.pack_size >= 5 ? 30 : 50;
        return {
          variant_id: it.variant_id,
          reorder_qty: qty,
          supplier_name: sup,
          wholesale_rate_paise: Math.round(it.selling_price_paise * 0.82),
        };
      });

      const res = await fetch("/api/v1/retailer/inventory/auto-reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items: reorderPayload }),
      });

      if (res.ok) {
        const data = await res.json();
        setToastMessage(data.message || "Restock purchase orders placed with distributors! Stock updated.");
        setAutoRestockOpen(false);
        await fetchInventory();
      } else {
        const err = await res.json().catch(() => ({}));
        setToastMessage(err.message || "Failed to place auto-reorder.");
      }
    } catch {
      setToastMessage("Network error placing restock order.");
    } finally {
      setSubmittingRestock(false);
    }
  };

  // Add New Product Submission
  const handleAddNewProduct = async () => {
    if (!newProdName.trim() || !newProdBrand.trim() || !newProdVariantLabel.trim()) {
      setAddProdError("Please enter product name, brand, and variant label.");
      return;
    }
    const mrp = Math.round(parseFloat(newProdMrpRupees || "0") * 100);
    const selling = Math.round(parseFloat(newProdSellingRupees || "0") * 100);
    const stock = parseInt(newProdStock || "0");
    const packSize = parseFloat(newProdPackSize || "1");

    if (mrp <= 0 || selling <= 0) {
      setAddProdError("MRP and Selling price must be greater than zero.");
      return;
    }
    if (selling > mrp) {
      setAddProdError(`Selling price (₹${newProdSellingRupees}) cannot exceed MRP (₹${newProdMrpRupees}).`);
      return;
    }

    try {
      setSavingNewProd(true);
      setAddProdError(null);
      const res = await fetch("/api/v1/retailer/inventory/add-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newProdName.trim(),
          brand: newProdBrand.trim(),
          category_name: newProdCategory,
          variant_label: newProdVariantLabel.trim(),
          pack_size: packSize,
          pack_unit: newProdPackUnit,
          mrp_paise: mrp,
          selling_price_paise: selling,
          stock_qty: stock,
          image_url: newProdImageUrl.trim() || undefined,
        }),
      });

      if (res.ok) {
        setToastMessage(`🎉 Successfully added "${newProdName}" to catalogue & inventory!`);
        setAddProductOpen(false);
        setNewProdName("");
        setNewProdBrand("");
        setNewProdVariantLabel("1 kg");
        setNewProdMrpRupees("");
        setNewProdSellingRupees("");
        setNewProdStock("50");
        setNewProdImageUrl("");
        fetchInventory();
      } else {
        const err = await res.json().catch(() => ({}));
        setAddProdError(err.detail || err.message || "Failed to add product");
      }
    } catch {
      setAddProdError("Network error while adding product");
    } finally {
      setSavingNewProd(false);
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

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus className="w-4 h-4 text-teal-700" />}
              onClick={() => {
                setAddProdError(null);
                setAddProductOpen(true);
              }}
            >
              + Add New Product
            </Button>

            {lowStockCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Truck className="w-4 h-4 text-warning-700" />}
                onClick={() => setAutoRestockOpen(true)}
              >
                Auto-Restock ({lowStockCount})
              </Button>
            )}

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

          {/* Interactive Low Stock Card with Reorder Trigger */}
          <button
            type="button"
            onClick={() => setAutoRestockOpen(true)}
            className="text-left w-full focus-ring rounded-card"
          >
            <Card className="p-4 space-y-1 bg-white hover:border-warning-700 hover:shadow-xs transition-all cursor-pointer group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-600">Low Stock Items</span>
                <span className="text-[10px] font-bold text-warning-700 bg-warning-50 px-2 py-0.5 rounded-full flex items-center gap-1 group-hover:bg-warning-700 group-hover:text-white transition-colors">
                  <Truck className="w-3 h-3" />
                  Quick Reorder →
                </span>
              </div>
              <div className="font-display text-2xl text-warning-700 tabular-nums">
                {lowStockCount}
              </div>
              <span className="text-[11px] text-warning-700 font-medium">
                {lowStockCount > 0 ? "Click to reorder from frequent suppliers" : "All items well stocked"}
              </span>
            </Card>
          </button>

          <Card className="p-4 space-y-1 bg-white">
            <span className="text-xs font-semibold text-ink-600">Out of Stock</span>
            <div className="font-display text-2xl text-ink-800 tabular-nums">
              {outOfStockCount}
            </div>
            <span className="text-[11px] text-teal-700 font-medium">Needs re-order</span>
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
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors focus-ring cursor-pointer ${
                selectedCategory === cat
                  ? "bg-ink-800 text-white"
                  : "bg-white text-ink-700 hover:bg-ice-100 border border-ice-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Inventory Data Table */}
        <Card className="overflow-hidden p-0 border border-ice-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ice-100 border-b border-ice-200 text-ink-700 font-bold">
                <tr>
                  <th className="py-3 px-4">Product & Brand</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Pack Variant</th>
                  <th className="py-3 px-4 text-right">MRP</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-center">Stock Count</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ice-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-ink-500">
                      Loading inventory catalogue...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-ink-500">
                      No products found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.variant_id} className="hover:bg-ice-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-ink-800">
                        <span className="block text-ink-900">{item.product_name}</span>
                        <span className="text-[11px] text-ink-500 font-normal">{item.brand}</span>
                      </td>
                      <td className="py-3 px-4 text-ink-600">{item.category_name}</td>
                      <td className="py-3 px-4 font-medium text-ink-700">
                        <span className="px-2 py-0.5 rounded-full bg-ice-100 border border-ice-200 text-[11px]">
                          {item.variant_label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-ink-500 tabular-nums">
                        ₹{(item.mrp_paise / 100).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-teal-700 tabular-nums">
                        ₹{(item.selling_price_paise / 100).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center font-bold tabular-nums">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                            item.stock_qty <= 25
                              ? "bg-warning-50 text-warning-700 font-bold"
                              : "bg-ice-100 text-ink-800"
                          }`}
                        >
                          {item.stock_qty} packs
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.stock_qty === 0 ? (
                          <StatusPill kind="danger" label="Out of Stock" />
                        ) : item.stock_qty <= 25 ? (
                          <StatusPill kind="warning" label="Low Stock" />
                        ) : (
                          <StatusPill kind="success" label="In Stock" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="px-2.5 py-1 rounded-ctl border border-ice-300 text-xs font-semibold text-ink-700 hover:bg-ice-100 hover:text-ink-900 transition-colors focus-ring"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 1-Click Auto Restock / Low Stock Reorder Dialog */}
        <Dialog
          isOpen={autoRestockOpen}
          onClose={() => setAutoRestockOpen(false)}
          title="Auto Restock · Frequent Supplier Purchase Orders"
          description="Review suggested reorders from the verified distributors you frequently order from. 1-click confirmation dispatches orders and updates stock."
          confirmLabel={lowStockItems.length > 0 ? "Confirm & Place Purchase Orders (1-Click)" : "Close"}
          cancelLabel="Cancel"
          onConfirm={handleConfirmAutoRestock}
          isConfirmLoading={submittingRestock}
        >
          <div className="space-y-4 py-2">
            {lowStockItems.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-teal-700 mx-auto" />
                <h4 className="font-display text-lg text-ink-800">All Inventory Healthy</h4>
                <p className="text-xs text-ink-600 max-w-xs mx-auto">
                  No items are currently below the low-stock threshold (25 packs).
                </p>
              </div>
            ) : (
              <>
                {/* Order Summary Header Card */}
                <div className="p-4 bg-ice-100 rounded-ctl border border-ice-300 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-ink-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                      Suggested Restock Plan
                    </span>
                    <span className="font-bold text-teal-700">
                      {lowStockSummary.suppliersCount} Wholesale Distributors
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-2 bg-white rounded-ctl border border-ice-200">
                      <span className="text-[10px] text-ink-500 block">Low Stock Items</span>
                      <strong className="text-xs text-warning-700">{lowStockItems.length} Products</strong>
                    </div>
                    <div className="p-2 bg-white rounded-ctl border border-ice-200">
                      <span className="text-[10px] text-ink-500 block">Total Units to Add</span>
                      <strong className="text-xs text-ink-800">+{lowStockSummary.totalUnits} Packs</strong>
                    </div>
                    <div className="p-2 bg-white rounded-ctl border border-ice-200">
                      <span className="text-[10px] text-ink-500 block">Est. Wholesale Cost</span>
                      <strong className="text-xs text-teal-700">₹{lowStockSummary.estimatedCostRupees.toLocaleString("en-IN")}</strong>
                    </div>
                  </div>
                </div>

                {/* Items & Frequent Suppliers List */}
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  <span className="text-xs font-bold text-ink-700 block">
                    Distributor Recommendations ({lowStockItems.length} items)
                  </span>

                  {lowStockItems.map((item) => {
                    const supplierInfo =
                      FREQUENT_SUPPLIERS_MAP[item.category_name] || {
                        supplier: "Metro Cash & Carry Wholesale",
                        orderHistory: "20+ orders placed",
                      };
                    const suggestedQty = item.pack_unit === "kg" && item.pack_size >= 5 ? 30 : 50;
                    const wholesaleRate = Math.round((item.selling_price_paise * 0.82) / 100);

                    return (
                      <div
                        key={item.variant_id}
                        className="p-3 bg-white rounded-ctl border border-ice-200 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-xs text-ink-800 block">
                              {item.product_name} ({item.variant_label})
                            </span>
                            <span className="text-[11px] text-ink-500">
                              {item.brand} · {item.category_name}
                            </span>
                          </div>

                          <span className="px-2 py-0.5 rounded-full bg-warning-50 text-warning-700 text-[11px] font-bold shrink-0">
                            Current: {item.stock_qty} left
                          </span>
                        </div>

                        {/* Preferred Supplier Information Box */}
                        <div className="p-2 bg-ice-50 rounded-ctl border border-ice-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Store className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                            <div>
                              <span className="font-semibold text-ink-800 text-[11px] block">
                                {supplierInfo.supplier}
                              </span>
                              <span className="text-[10px] text-teal-700 font-medium">
                                Frequent supplier · {supplierInfo.orderHistory}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-teal-700 block">
                              +{suggestedQty} packs
                            </span>
                            <span className="text-[10px] text-ink-500">
                              @ ₹{wholesaleRate}/pack
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </Dialog>

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
                <label className="text-xs font-semibold text-ink-700">Invoice Number</label>
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
                      className="text-xs text-teal-700 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Dialog>

        {/* Add New Product Dialog */}
        <Dialog
          isOpen={addProductOpen}
          onClose={() => setAddProductOpen(false)}
          title="Add New Product to Store Catalogue"
          description="Enter product details to list it in your inventory and make it available for community orders."
          confirmLabel={savingNewProd ? "Adding Product..." : "Add Product to Catalogue"}
          onConfirm={handleAddNewProduct}
        >
          <div className="space-y-4 pt-2">
            {addProdError && (
              <Banner kind="danger" message={addProdError} />
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-ink-700 block">Product Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Sona Masoori Rice, Aashirvaad Atta"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full h-10 px-3 rounded-ctl border border-ice-300 bg-white text-xs text-ink-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="space-y-1 col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-ink-700 block">Brand *</label>
                <input
                  type="text"
                  placeholder="e.g. Heritage, Tata, Sunpure"
                  value={newProdBrand}
                  onChange={(e) => setNewProdBrand(e.target.value)}
                  className="w-full h-10 px-3 rounded-ctl border border-ice-300 bg-white text-xs text-ink-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-700 block">Category *</label>
                <select
                  value={newProdCategory}
                  onChange={(e) => setNewProdCategory(e.target.value)}
                  className="w-full h-10 px-2 rounded-ctl border border-ice-300 bg-white text-xs text-ink-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-700 block">Pack Variant Label *</label>
                <input
                  type="text"
                  placeholder="e.g. 5 kg, 1 L, 500 g, 1 pack"
                  value={newProdVariantLabel}
                  onChange={(e) => setNewProdVariantLabel(e.target.value)}
                  className="w-full h-10 px-3 rounded-ctl border border-ice-300 bg-white text-xs text-ink-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-700 block">Pack Size</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={newProdPackSize}
                  onChange={(e) => setNewProdPackSize(e.target.value)}
                  className="w-full h-10 px-3 text-center rounded-ctl border border-ice-300 bg-white text-xs text-ink-800 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-700 block">Unit</label>
                <select
                  value={newProdPackUnit}
                  onChange={(e) => setNewProdPackUnit(e.target.value)}
                  className="w-full h-10 px-2 rounded-ctl border border-ice-300 bg-white text-xs text-ink-800"
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="l">L</option>
                  <option value="ml">ml</option>
                  <option value="pack">pack</option>
                  <option value="pcs">pcs</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-700 block">Initial Stock</label>
                <input
                  type="number"
                  min="0"
                  value={newProdStock}
                  onChange={(e) => setNewProdStock(e.target.value)}
                  className="w-full h-10 px-3 text-center rounded-ctl border border-ice-300 bg-white text-xs text-ink-800 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-ice-50 rounded-ctl border border-ice-200">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-700 block">MRP (₹) *</label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  placeholder="e.g. 350"
                  value={newProdMrpRupees}
                  onChange={(e) => setNewProdMrpRupees(e.target.value)}
                  className="w-full h-10 px-3 text-center rounded-ctl border border-ice-300 bg-white text-xs text-ink-800 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-teal-700 block">Selling Price (₹) *</label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  placeholder="e.g. 320"
                  value={newProdSellingRupees}
                  onChange={(e) => setNewProdSellingRupees(e.target.value)}
                  className="w-full h-10 px-3 text-center rounded-ctl border border-teal-500 bg-white text-xs text-teal-800 font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-700 block">Image URL (Optional)</label>
              <input
                type="url"
                placeholder="https://... (leave blank for realistic grocery photo)"
                value={newProdImageUrl}
                onChange={(e) => setNewProdImageUrl(e.target.value)}
                className="w-full h-10 px-3 rounded-ctl border border-ice-300 bg-white text-xs text-ink-800"
              />
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
