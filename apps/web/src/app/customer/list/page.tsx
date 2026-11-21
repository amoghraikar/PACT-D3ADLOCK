"use client";

import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { CustomerBottomNav } from "@/components/CustomerBottomNav";
import { usePact } from "@/context/PactContext";
import {
  Clock,
  Plus,
  Minus,
  Trash2,
  Mic,
  ShoppingBag,
  ArrowRight,
  Info,
} from "lucide-react";

export default function MyListPage() {
  const { allProducts, cart, updateQuantity, removeFromCart, totalCartCount, totalEstimatedAmount } = usePact();

  const cartEntries = Object.entries(cart).map(([id, qty]) => {
    const product = allProducts.find((p) => p.id === id);
    return { product, quantity: qty };
  }).filter((item) => item.product !== undefined);

  return (
    <div className="min-h-screen pb-24 bg-[#F3F8FB]">
      <AppHeader />

      <main className="max-w-md mx-auto px-4 py-5 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="h-display text-2xl text-[#2E201F]">My list</h1>
          <Link
            href="/customer/speak"
            className="chip sm text-xs font-bold bg-[#FEEFB8] border-[#EFDB93] text-[#432F2E]"
          >
            <Mic className="w-3.5 h-3.5 text-[#2A5C79]" /> Speak list
          </Link>
        </div>

        {/* Deadline Warning Banner */}
        <div className="banner warning text-xs py-2 px-3">
          <Clock className="w-4 h-4 text-[#8A3A00] flex-shrink-0" />
          <span>Ordering closes on 24 Nov, midnight. All changes auto-save.</span>
        </div>

        {/* Empty State */}
        {cartEntries.length === 0 ? (
          <div className="card text-center py-10 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#E4EEF5] flex items-center justify-center text-[#2A5C79] mx-auto">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#432F2E]">Your list is empty</h3>
            <p className="text-xs text-[#6A5452] max-w-xs mx-auto">
              Add what your household needs for the month. On 25 Nov your order combines with neighbours.
            </p>
            <Link href="/customer/shop" className="btn btn-primary md text-xs">
              Go to the shop
            </Link>
          </div>
        ) : (
          <>
            {/* List Lines */}
            <div className="card flush divide-y divide-[#E4EEF5]">
              {cartEntries.map(({ product, quantity }) => {
                if (!product) return null;
                const lineTotal = product.price * quantity;

                return (
                  <div key={product.id} className="p-3.5 flex items-center justify-between gap-3">
                    <div className="w-10 h-10 rounded-[10px] bg-[#E4EEF5] flex items-center justify-center text-xl flex-shrink-0">
                      {product.imageIcon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <b className="text-xs text-[#432F2E] block truncate">
                        {product.name}
                      </b>
                      <span className="text-[11px] text-[#6A5452] block">
                        {product.variant} · about ₹{product.price} each
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="stepper h-8">
                        <button
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          className="hover:bg-[#E4EEF5] px-2"
                        >
                          {quantity === 1 ? (
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          ) : (
                            <Minus className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span className="text-xs px-2">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          className="hover:bg-[#E4EEF5] px-2"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-xs font-bold font-mono text-[#432F2E] w-12 text-right">
                        ₹{lineTotal}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Estimated Total Card */}
            <div className="card p-4 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#6A5452] font-semibold">Estimated total ({totalCartCount} items)</span>
                <b className="text-lg text-[#432F2E] font-mono">About ₹{totalEstimatedAmount}</b>
              </div>
              <p className="text-[11px] text-[#7A6462] flex items-center gap-1">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                The store confirms actual packed items and bulk discount on 25 Nov.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Link href="/customer/shop" className="btn btn-secondary flex-1 text-xs">
                Add more items
              </Link>
              <Link href="/customer/bill" className="btn btn-primary flex-1 text-xs">
                View Bill Preview <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>
          </>
        )}
      </main>

      <CustomerBottomNav />
    </div>
  );
}
