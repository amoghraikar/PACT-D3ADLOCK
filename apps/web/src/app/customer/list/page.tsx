"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import {
  Card,
  Button,
  StatusPill,
  MoneyText,
  Skeleton,
  EmptyState,
} from "@/components/ui";
import { cartService, CartResponse, CartItem, CommunityTotalItem } from "@/services/cart.service";
import { useToast } from "@/hooks/useToast";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Users,
  ShieldCheck,
  ArrowRight,
  Store,
  Clock,
  Sparkles,
} from "lucide-react";

export default function CollectiveCartPage() {
  const { success, error: toastError } = useToast();

  const [cart, setCart] = useState<CartResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"personal" | "community">("personal");

  const loadCart = async () => {
    try {
      const res = await cartService.getCart();
      setCart(res);
    } catch (err: any) {
      toastError(err?.message || "Failed to load collective cart");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function fetchCart() {
      try {
        const res = await cartService.getCart();
        if (!ignore) setCart(res);
      } catch (err: any) {
        if (!ignore) toastError(err?.message || "Failed to load collective cart");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    fetchCart();
    return () => {
      ignore = true;
    };
  }, [toastError]);

  const handleUpdateQuantity = async (variantId: string, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    setUpdatingId(variantId);
    try {
      if (newQty <= 0) {
        await cartService.removeItem(variantId);
        success("Item removed from your cart");
      } else {
        await cartService.updateItemQuantity(variantId, newQty);
        success("Cart quantity updated");
      }
      await loadCart();
    } catch (err: any) {
      toastError(err?.message || "Could not update item quantity");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveItem = async (variantId: string) => {
    setUpdatingId(variantId);
    try {
      await cartService.removeItem(variantId);
      success("Item removed from your cart");
      await loadCart();
    } catch (err: any) {
      toastError(err?.message || "Could not remove item");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-text">
              Shared Collective Cart
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Cycle: {cart?.cycle_month || "Current Month"} · Status: {cart?.status || "OPEN"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/customer/shop">
              <Button variant="outline" size="sm" className="h-9">
                <Store className="w-4 h-4 mr-1.5 text-primary" />
                <span>Add More Groceries</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center justify-between border-b border-border pb-1">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("personal")}
              className={`pb-2.5 text-sm font-semibold transition-colors cursor-pointer border-b-2 ${
                activeTab === "personal"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-text"
              }`}
            >
              My Household Basket ({cart?.my_items?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("community")}
              className={`pb-2.5 text-sm font-semibold transition-colors cursor-pointer border-b-2 ${
                activeTab === "community"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-text"
              }`}
            >
              Community Pooled Demand ({cart?.community?.items?.length || 0})
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-muted">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>Cutoff: 22nd 17:27 IST</span>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="card" className="h-20 w-full" />
            ))}
          </div>
        ) : activeTab === "personal" ? (
          /* Personal Household Basket View */
          cart?.my_items && cart.my_items.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Item List */}
              <div className="lg:col-span-2 space-y-3">
                {cart.my_items.map((item) => (
                  <Card key={item.variant_id} className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {item.brand && (
                          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                            {item.brand}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm text-text truncate">{item.name}</h3>
                      <p className="text-xs text-muted mt-0.5">{item.variant_label}</p>
                      <div className="mt-1.5 text-xs text-muted">
                        Unit Price: <MoneyText paise={item.est_unit_price_paise} />
                      </div>
                    </div>

                    {/* Stepper & Line Price */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex items-center gap-2 bg-background p-1 rounded-card border border-border">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.variant_id, item.quantity, -1)}
                          disabled={updatingId === item.variant_id}
                          className="w-7 h-7 rounded border border-border bg-surface text-text hover:bg-background flex items-center justify-center disabled:opacity-40 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold w-6 text-center text-text tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.variant_id, item.quantity, 1)}
                          disabled={updatingId === item.variant_id}
                          className="w-7 h-7 rounded border border-border bg-surface text-text hover:bg-background flex items-center justify-center disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right w-20">
                        <div className="text-sm font-bold text-text">
                          <MoneyText paise={item.est_line_paise} />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.variant_id)}
                        disabled={updatingId === item.variant_id}
                        title="Remove Item"
                        className="p-1.5 text-muted hover:text-danger-700 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Order Estimation Summary Sidebar */}
              <div className="space-y-4">
                <Card className="p-5 space-y-4 bg-surface border-border">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-muted">
                    Estimated Basket Total
                  </h2>

                  <div className="space-y-2 text-xs text-muted pt-1">
                    <div className="flex justify-between">
                      <span>Items Count:</span>
                      <span className="font-semibold text-text">{cart.my_items.length} lines</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated Subtotal:</span>
                      <span className="font-semibold text-text">
                        <MoneyText paise={cart.my_est_total_paise} />
                      </span>
                    </div>
                    <div className="flex justify-between text-primary">
                      <span>Wholesale Bulk Discount:</span>
                      <span className="font-semibold">Applied on Cutoff</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Fee Allocation:</span>
                      <span className="font-semibold">Split Fairly (F7)</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex justify-between items-baseline">
                    <span className="text-sm font-bold text-text">Estimated Net:</span>
                    <span className="text-xl font-bold text-text">
                      <MoneyText paise={cart.my_est_total_paise} />
                    </span>
                  </div>

                  <div className="p-3 bg-background rounded-card border border-border text-xs text-muted space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-text">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span>One Shared Cart Principle</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      You are not charged immediately. When the monthly cycle locks on the 22nd, all building demand is consolidated to negotiate wholesale rates.
                    </p>
                  </div>

                  <Link href="/customer/shop" className="block w-full">
                    <Button variant="primary" fullWidth className="h-10">
                      Continue Adding Groceries
                    </Button>
                  </Link>
                </Card>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Your Personal Basket is Empty"
              description="You have not added any groceries to this month's shared collective order yet."
              action={{
                label: "Browse Grocery Catalogue",
                onClick: () => (window.location.href = "/customer/shop"),
              }}
            />
          )
        ) : (
          /* Community Collective Demand View (Privacy-Preserved) */
          <div className="space-y-4">
            <Card className="p-4 bg-background border border-border flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-muted">
                <span className="font-bold text-text block mb-0.5">
                  Community Demand Aggregation Shield
                </span>
                Individual resident baskets and flat numbers are never exposed. Below is the total pooled demand across all {cart?.community?.participants || 8} participating households in Green Glen Residency.
              </div>
            </Card>

            {cart?.community?.items && cart.community.items.length > 0 ? (
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-text">
                      Consolidated Community Demand Grouped by Variant
                    </h3>
                  </div>
                  <span className="text-xs text-muted">
                    {cart.community.participants} Households Participating
                  </span>
                </div>

                <div className="divide-y divide-border text-xs">
                  {cart.community.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 flex items-center justify-between hover:bg-background/40 transition-colors"
                    >
                      <div>
                        <p className="font-bold text-text text-sm">{item.name}</p>
                        <p className="text-muted">{item.variant_label}</p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-text text-sm">
                          {item.total_quantity} units
                        </span>
                        <span className="block text-[11px] text-muted">
                          Pooled: {item.total_base}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <EmptyState
                title="No Community Demand Yet"
                description="Households have not placed orders in this cycle yet."
              />
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
