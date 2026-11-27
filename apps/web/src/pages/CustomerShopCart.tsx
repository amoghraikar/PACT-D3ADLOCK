import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, Search, Shield, Trash2 } from "lucide-react";
import type {
  CartResponseDTO,
  CategorySummaryDTO,
  ProductSummaryDTO,
} from "@pact/shared";
import {
  Button,
  Card,
  EmptyState,
  Input,
  Money,
  PageHeader,
  ProductThumb,
  Skeleton,
  StatusBadge,
} from "@/components/ui";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/lib/api";
import { cartService, catalogueService } from "@/lib/services";

export function CustomerShopPage() {
  const toast = useToast();
  const [categories, setCategories] = useState<CategorySummaryDTO[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [products, setProducts] = useState<ProductSummaryDTO[]>([]);
  const [cartQtyByVariant, setCartQtyByVariant] = useState<Record<string, number>>({});
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<string, string>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    catalogueService.getCategories().then(setCategories).catch(() => {});
    cartService
      .getCart()
      .then((c) => {
        const map: Record<string, number> = {};
        for (const it of c.items) map[it.variant_id] = it.quantity;
        setCartQtyByVariant(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await catalogueService.getProducts({
          category_slug: selectedSlug,
          search: search.trim() || undefined,
          page,
          limit: 18,
        });
        if (active) {
          setProducts(res.data);
          setTotalPages(res.meta.pages);
        }
      } catch (err) {
        if (active) toast.error(err instanceof ApiError ? err.message : "Failed to load catalogue");
      } finally {
        if (active) setLoading(false);
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selectedSlug, search, page, toast]);

  const setQty = async (variantId: string, nextQty: number) => {
    setUpdatingId(variantId);
    try {
      const updated = await cartService.updateItem(variantId, Math.max(0, nextQty));
      const map: Record<string, number> = {};
      for (const it of updated.items) map[it.variant_id] = it.quantity;
      setCartQtyByVariant(map);
      toast.success(nextQty === 0 ? "Removed from cart" : "Cart updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update cart");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Grocery Catalogue"
        subtitle="Select pack variants to add into your household's monthly allocation"
        action={
          <Link to="/customer/cart">
            <Button variant="outline" size="sm">
              View Shared Cart
            </Button>
          </Link>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted absolute left-3 top-3" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search rice, atta, oil, dairy, spices..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => {
            setSelectedSlug("all");
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-pill text-xs font-medium border shrink-0 cursor-pointer ${
            selectedSlug === "all"
              ? "bg-primary text-white border-primary"
              : "bg-surface text-text border-border"
          }`}
        >
          All Categories
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              setSelectedSlug(cat.slug);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-pill text-xs font-medium border shrink-0 cursor-pointer ${
              selectedSlug === cat.slug
                ? "bg-primary text-white border-primary"
                : "bg-surface text-text border-border"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="No Matching Products"
          description="Try clearing your search query or selecting another grocery category."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => {
            const activeVarId = selectedVariantByProduct[p.id] ?? p.variants[0]?.id;
            const activeVar = p.variants.find((v) => v.id === activeVarId) ?? p.variants[0];
            const inCartQty = activeVar ? (cartQtyByVariant[activeVar.id] ?? 0) : 0;

            return (
              <Card key={p.id} className="overflow-hidden flex flex-col justify-between">
                <div>
                  <ProductThumb src={p.primary_image_url} alt={p.title} />
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-medium text-muted uppercase">
                          {p.brand || p.category_name}
                        </p>
                        <h3 className="text-sm font-semibold text-text line-clamp-2">{p.title}</h3>
                      </div>
                      {!p.is_available && <StatusBadge status="UNAVAILABLE" />}
                    </div>

                    {p.variants.length > 0 && (
                      <select
                        value={activeVar?.id}
                        onChange={(e) =>
                          setSelectedVariantByProduct((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }))
                        }
                        className="w-full h-9 px-2.5 text-xs bg-background border border-border rounded-ctl text-text"
                      >
                        {p.variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.unit} — ₹{(v.default_price_paise / 100).toFixed(0)}
                            {!v.is_available ? " (Out of Stock)" : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {activeVar && (
                  <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-2 bg-background/40">
                    <div>
                      <div className="text-sm font-semibold text-text">
                        <Money paise={activeVar.default_price_paise} />
                      </div>
                      {activeVar.mrp_paise > activeVar.default_price_paise && (
                        <div className="text-[11px] text-muted line-through">
                          <Money paise={activeVar.mrp_paise} />
                        </div>
                      )}
                    </div>

                    {inCartQty > 0 ? (
                      <div className="flex items-center gap-1.5 border border-border rounded-ctl bg-surface p-1">
                        <button
                          type="button"
                          disabled={updatingId === activeVar.id}
                          onClick={() => setQty(activeVar.id, inCartQty - 1)}
                          className="p-1 text-text hover:bg-background rounded cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold tabular-nums">
                          {inCartQty}
                        </span>
                        <button
                          type="button"
                          disabled={updatingId === activeVar.id || !activeVar.is_available}
                          onClick={() => setQty(activeVar.id, inCartQty + 1)}
                          className="p-1 text-text hover:bg-background rounded cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        isLoading={updatingId === activeVar.id}
                        disabled={!activeVar.is_available}
                        onClick={() => setQty(activeVar.id, 1)}
                      >
                        Add
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export function CustomerCartPage() {
  const toast = useToast();
  const [cart, setCart] = useState<CartResponseDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
    try {
      setCart(await cartService.getCart());
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not load cart");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  const changeQty = async (variantId: string, qty: number) => {
    setBusyId(variantId);
    try {
      setCart(
        qty <= 0 ? await cartService.removeItem(variantId) : await cartService.updateItem(variantId, qty)
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update cart item");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shared Collective Cart"
        subtitle="Review your household items alongside anonymized community demand totals"
        action={
          <Link to="/customer/shop">
            <Button variant="outline" size="sm">
              Add Items
            </Button>
          </Link>
        }
      />

      {loading ? (
        <Skeleton className="h-64" />
      ) : !cart ? null : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-3 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-semibold text-text">Your Household Basket</h2>
                <p className="text-xs text-muted">Cycle {cart.cycle.cycle_month}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted block">Estimated Personal Total</span>
                <span className="text-lg font-semibold text-text">
                  <Money paise={cart.personal_total_paise} />
                </span>
              </div>
            </div>

            {cart.items.length === 0 ? (
              <p className="text-sm text-muted py-6 text-center">
                Your basket is currently empty. Add staples from the catalogue.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {cart.items.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text truncate">{item.product_title}</p>
                      <p className="text-xs text-muted">
                        {item.variant_unit} · <Money paise={item.unit_price_paise} /> each ·
                        Building pool: {item.community_aggregate_qty}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 border border-border rounded-ctl p-0.5">
                        <button
                          type="button"
                          disabled={busyId === item.variant_id || cart.cycle.is_cutoff_passed}
                          onClick={() => changeQty(item.variant_id, item.quantity - 1)}
                          className="p-1.5 hover:bg-background rounded cursor-pointer disabled:opacity-40"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center text-xs font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={busyId === item.variant_id || cart.cycle.is_cutoff_passed}
                          onClick={() => changeQty(item.variant_id, item.quantity + 1)}
                          className="p-1.5 hover:bg-background rounded cursor-pointer disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="w-20 text-right text-sm font-semibold">
                        <Money paise={item.subtotal_paise} />
                      </div>

                      <button
                        type="button"
                        disabled={busyId === item.variant_id || cart.cycle.is_cutoff_passed}
                        onClick={() => changeQty(item.variant_id, 0)}
                        className="p-1.5 text-muted hover:text-danger-700 cursor-pointer disabled:opacity-40"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="lg:col-span-2 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-semibold text-text">Community Demand Pool</h2>
                <p className="text-xs text-muted">
                  {cart.community_summary.participating_households_count} participating households
                </p>
              </div>
              <Shield className="w-4 h-4 text-primary" />
            </div>

            <p className="text-[11px] text-muted bg-background border border-border rounded-ctl p-2.5">
              Privacy guaranteed: quantities shown below are aggregate community totals without
              individual resident details.
            </p>

            {cart.community_summary.pool_items.length === 0 ? (
              <p className="text-xs text-muted py-4 text-center">No community items yet.</p>
            ) : (
              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {cart.community_summary.pool_items.map((p) => (
                  <div key={p.variant_id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-text truncate">{p.product_title}</p>
                      <p className="text-[11px] text-muted">{p.variant_unit}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold tabular-nums text-text">
                        {p.total_quantity} units
                      </p>
                      <p className="text-[11px] text-muted">
                        <Money paise={p.estimated_subtotal_paise} />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
