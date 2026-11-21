"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import {
  Card,
  Button,
  Stepper,
  MoneyText,
  Banner,
  EmptyState,
  Toast,
  Skeleton,
} from "@/components/ui";
import { useCart, CartItem } from "@/context/CartContext";
import { copy } from "@/lib/copy/en";
import { ShoppingCart, ChevronDown, ChevronUp, Users, Info, ArrowRight, ShoppingBag } from "lucide-react";

export default function CustomerListPage() {
  const router = useRouter();
  const {
    myItems,
    myEstTotalPaise,
    community,
    isLocked,
    isLoading,
    updateQuantity,
    removeItem,
    restoreItem,
  } = useCart();

  const totalMrpPaise = myItems.reduce(
    (sum, item) => sum + (item.mrp_paise || Math.round(item.est_unit_price_paise * 1.15)) * item.quantity,
    0
  );

  const [removedItem, setRemovedItem] = useState<CartItem | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [showBuildingOrder, setShowBuildingOrder] = useState(true);

  const handleRemove = async (variant_id: string) => {
    const res = await removeItem(variant_id);
    if (res.success && res.removedItem) {
      setRemovedItem(res.removedItem);
      setShowToast(true);
    }
  };

  const handleUndo = async () => {
    if (removedItem) {
      await restoreItem(removedItem);
      setRemovedItem(null);
      setShowToast(false);
    }
  };

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="space-y-4">
          <Skeleton height={28} width="50%" />
          <Skeleton height={70} className="w-full" />
          <Skeleton height={200} className="w-full" />
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="space-y-6 w-full max-w-full overflow-x-hidden">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl text-ink-800 flex items-center gap-2">
              <ShoppingCart className="w-7 h-7 text-teal-700 shrink-0" />
              <span className="truncate">Cart ({myItems.length} items)</span>
            </h1>
            <p className="text-xs text-ink-600 mt-0.5">
              Your household contribution to the November community bulk order
            </p>
          </div>
          <div className="shrink-0">
            <Link href="/customer/shop">
              <Button variant="secondary" size="sm" icon={<ShoppingBag className="w-3.5 h-3.5" />}>
                + Add staples
              </Button>
            </Link>
          </div>
        </div>

        {/* Closing Date Banner */}
        <Banner
          kind={isLocked ? "warning" : "info"}
          message={
            isLocked
              ? copy.customer.home.closedNotice
              : copy.customer.home.orderClosingBanner(6)
          }
        />

        {myItems.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart className="w-8 h-8 text-ink-400" />}
            title="Your Cart is empty"
            description="Add staple groceries from the catalogue or dictate them with voice ordering."
            actionLabel="Browse Groceries"
            onAction={() => router.push("/customer/shop")}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left 2 Columns: Resident's Own Cart Items */}
            <div className="md:col-span-2 space-y-4">
              <Card padding="none" className="divide-y divide-ice-100 overflow-hidden bg-white">
                <div className="px-4 py-3 bg-ice-50 border-b border-ice-100 flex justify-between items-center text-xs font-semibold text-ink-700">
                  <span>Selected Groceries ({myItems.length} items)</span>
                  <span>Unit Price · Subtotal</span>
                </div>
                {myItems.map((item) => (
                  <div
                    key={item.variant_id}
                    className="p-4 flex items-center justify-between gap-3 bg-white hover:bg-ice-50/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-ink-800 truncate">
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-ink-500 mt-0.5">
                        <span className="font-medium text-ink-700">{item.brand}</span>
                        <span>·</span>
                        <span>{item.variant_label}</span>
                        <span>·</span>
                        <MoneyText paise={item.est_unit_price_paise} approx size="sm" />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <MoneyText
                        paise={item.est_line_paise}
                        size="base"
                        className="text-right font-semibold"
                      />

                      {!isLocked ? (
                        <Stepper
                          value={item.quantity}
                          onChange={(qty) => {
                            if (qty === 0) {
                              handleRemove(item.variant_id);
                            } else {
                              updateQuantity(item.variant_id, qty, {
                                name: item.name,
                                brand: item.brand,
                                variant_label: item.variant_label,
                                est_unit_price_paise: item.est_unit_price_paise,
                                mrp_paise: item.mrp_paise,
                              });
                            }
                          }}
                          min={0}
                          max={99}
                        />
                      ) : (
                        <span className="text-sm font-semibold tabular-nums text-ink-600 px-3 py-1 bg-ice-100 rounded-ctl">
                          × {item.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </Card>

              <div className="p-4 bg-ice-100 border border-ice-300 rounded-card flex items-start gap-2.5 text-xs text-ink-600">
                <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <p leading-relaxed>
                  {copy.customer.list.estimateDisclaimer} Final prices are calculated upon consolidated order cutoff on the 25th with full wholesale discount pass-through.
                </p>
              </div>
            </div>

            {/* Right 1 Column: Estimated Total & Community Aggregate */}
            <div className="space-y-4">
              {/* Estimated Total Card */}
              <Card className="p-5 space-y-4 bg-ice-100 border-ice-300">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-ink-600 uppercase tracking-wider block">
                    Estimated Cart Summary
                  </span>
                  
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-ink-600">
                      <span>Standard MRP Total:</span>
                      <span className="font-semibold line-through">
                        ₹{Math.round(totalMrpPaise / 100)}
                      </span>
                    </div>
                    <div className="flex justify-between text-ink-800 font-bold text-sm">
                      <span>Estimated Wholesale Total:</span>
                      <MoneyText paise={myEstTotalPaise} approx size="base" />
                    </div>
                    <div className="flex justify-between text-teal-700 font-bold bg-teal-50 p-2 rounded-ctl mt-1">
                      <span>Wholesale Savings:</span>
                      <span>Save ₹{Math.max(0, Math.round((totalMrpPaise - myEstTotalPaise) / 100))}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-ice-200">
                  <Link href="/customer/bill" className="block w-full">
                    <Button variant="primary" fullWidth icon={<ArrowRight className="w-4 h-4" />}>
                      View Estimated & Actual Bill
                    </Button>
                  </Link>
                </div>
              </Card>

              {/* Collapsible "Our building's order" Anonymous Totals per F4 / U8 */}
              <Card padding="none" className="overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setShowBuildingOrder((prev) => !prev)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-ice-50 transition-colors focus-ring cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-ice-100 flex items-center justify-center text-teal-700 shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-ink-800">
                        {copy.customer.list.buildingOrderHeader}
                      </h3>
                      <p className="text-xs text-ink-500">
                        {community.participants} neighbours ordering together
                      </p>
                    </div>
                  </div>
                  {showBuildingOrder ? (
                    <ChevronUp className="w-4 h-4 text-ink-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-ink-500" />
                  )}
                </button>

                {showBuildingOrder && (
                  <div className="border-t border-ice-100 p-4 space-y-3 bg-ice-50/50">
                    <p className="text-xs text-ink-600">
                      Anonymous building aggregate. No individual orders or apartment names are ever revealed.
                    </p>
                    <div className="divide-y divide-ice-100">
                      {community.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="py-2 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-medium text-ink-800">{item.name}</span>{" "}
                            <span className="text-ink-500">({item.variant_label})</span>
                          </div>
                          <span className="font-semibold text-ink-800 tabular-nums">
                            {item.total_quantity} packs ({item.total_base})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* Undo Toast */}
        <Toast
          isOpen={showToast && !!removedItem}
          message={`Removed ${removedItem?.name} (${removedItem?.variant_label})`}
          undoLabel="Undo"
          onUndo={handleUndo}
          onClose={() => setShowToast(false)}
        />
      </div>
    </CustomerLayout>
  );
}
