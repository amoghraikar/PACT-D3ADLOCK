"use client";

import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
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
  ShieldCheck,
  Building2,
  Receipt,
} from "lucide-react";

export default function MyListPage() {
  const {
    allProducts,
    cart,
    updateQuantity,
    removeFromCart,
    clearCart,
    totalCartCount,
    totalEstimatedAmount,
    currentUser,
  } = usePact();

  const cartEntries = Object.entries(cart)
    .map(([id, qty]) => {
      const product = allProducts.find((p) => p.id === id);
      return { product, quantity: qty };
    })
    .filter((item) => item.product !== undefined);

  const discountAmount = Math.round(totalEstimatedAmount * 0.1);
  const netEstimatedPayable = totalEstimatedAmount - discountAmount;

  return (
    <div className="min-h-screen bg-[#F3F8FB] text-[#432F2E]">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Breadcrumb */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#E4EEF5]">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#6A5452] mb-1">
              <Link href="/" className="hover:underline">Dashboard</Link>
              <span>/</span>
              <span className="font-semibold text-[#432F2E]">My Contribution</span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#2E201F]">
              My Household Contribution
            </h1>
            <p className="text-xs sm:text-sm text-[#6A5452]">
              Flat {currentUser.flat || "A-101"} · Green Meadows Apartments · November 2026 Cycle
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/customer/speak"
              className="btn btn-secondary md text-xs font-bold bg-white"
            >
              <Mic className="w-4 h-4 mr-1 text-[#2A5C79]" />
              Add via Voice
            </Link>
            <Link
              href="/customer/shop"
              className="btn btn-primary md text-xs font-bold"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add More Groceries
            </Link>
          </div>
        </div>

        {/* Ordering Cutoff Alert Banner */}
        <div className="banner warning text-xs py-3 px-4 flex items-center justify-between rounded-[12px] bg-[#FFF7DB] border border-[#EFDB93]">
          <div className="flex items-center gap-2 text-[#8A3A00]">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">
              Ordering closes on <strong>24 Nov at midnight</strong>. You can freely adjust your quantities until the cutoff.
            </span>
          </div>
          <span className="text-[11px] text-[#6A5452] hidden md:inline">
            All changes auto-save in real-time
          </span>
        </div>

        {cartEntries.length === 0 ? (
          /* Empty State */
          <div className="card text-center py-16 space-y-4 max-w-lg mx-auto bg-white">
            <div className="w-16 h-16 rounded-full bg-[#E4EEF5] flex items-center justify-center text-[#2A5C79] mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#432F2E]">
              Your household contribution is empty
            </h2>
            <p className="text-xs text-[#6A5452] max-w-sm mx-auto leading-relaxed">
              Add the monthly groceries your home needs. On the 25th, PACT combines your list with your neighbours for one wholesale order.
            </p>
            <div className="pt-2">
              <Link href="/customer/shop" className="btn btn-primary md text-xs font-bold">
                Browse Grocery Shop
              </Link>
            </div>
          </div>
        ) : (
          /* 2-Column Desktop Layout: Table + Summary Sidebar */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Table Column (8 Columns) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="card flush bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#F3F8FB] border-b border-[#E4EEF5] text-[#6A5452]">
                        <th className="py-3 px-4 font-bold">Product</th>
                        <th className="py-3 px-4 font-bold">Variant & Rate</th>
                        <th className="py-3 px-4 font-bold text-center">Quantity</th>
                        <th className="py-3 px-4 font-bold text-right">Line Total</th>
                        <th className="py-3 px-4 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4EEF5]">
                      {cartEntries.map(({ product, quantity }) => {
                        if (!product) return null;
                        const lineTotal = product.price * quantity;

                        return (
                          <tr key={product.id} className="hover:bg-[#F3F8FB]/50 transition-colors">
                            {/* Product Info */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-[10px] bg-[#E4EEF5] flex items-center justify-center text-xl flex-shrink-0">
                                  {product.imageIcon}
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-[#6A5452] tracking-wider block">
                                    {product.brand}
                                  </span>
                                  <b className="text-xs text-[#432F2E] block">
                                    {product.name}
                                  </b>
                                  {product.hindiName && (
                                    <span className="hi text-[11px] text-[#6A5452]">
                                      {product.hindiName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Variant & Unit Rate */}
                            <td className="py-3.5 px-4 text-[#6A5452]">
                              <span className="block font-medium text-[#432F2E]">
                                {product.variant}
                              </span>
                              <span className="text-[11px]">
                                ₹{product.price} wholesale (MRP ₹{product.mrp})
                              </span>
                            </td>

                            {/* Stepper */}
                            <td className="py-3.5 px-4">
                              <div className="stepper h-8 mx-auto w-fit">
                                <button
                                  onClick={() => updateQuantity(product.id, quantity - 1)}
                                  className="px-2 hover:bg-[#E4EEF5] cursor-pointer"
                                  title="Decrease"
                                >
                                  {quantity === 1 ? (
                                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                  ) : (
                                    <Minus className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <span className="text-xs font-bold px-2">{quantity}</span>
                                <button
                                  onClick={() => updateQuantity(product.id, quantity + 1)}
                                  className="px-2 hover:bg-[#E4EEF5] cursor-pointer"
                                  title="Increase"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>

                            {/* Line Total */}
                            <td className="py-3.5 px-4 text-right">
                              <b className="num text-sm text-[#432F2E]">₹{lineTotal}</b>
                            </td>

                            {/* Remove Icon */}
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => removeFromCart(product.id)}
                                className="p-1.5 text-[#948180] hover:text-red-600 rounded-full hover:bg-red-50 transition-colors cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-[#F3F8FB] border-t border-[#E4EEF5] flex justify-between items-center text-xs">
                  <button
                    onClick={clearCart}
                    className="text-[#948180] hover:text-red-600 font-medium cursor-pointer"
                  >
                    Clear All Items
                  </button>
                  <Link
                    href="/customer/shop"
                    className="font-bold text-[#2A5C79] hover:underline"
                  >
                    + Add More Products from Shop
                  </Link>
                </div>
              </div>
            </div>

            {/* Order Summary Sidebar (4 Columns) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="card p-6 bg-white space-y-4 shadow-xs">
                <h3 className="font-serif text-lg font-bold text-[#2E201F] pb-2 border-b border-[#E4EEF5]">
                  Contribution Summary
                </h3>

                <div className="space-y-2.5 text-xs text-[#6A5452]">
                  <div className="flex justify-between">
                    <span>Selected Items ({totalCartCount}):</span>
                    <span className="num font-medium text-[#432F2E]">₹{totalEstimatedAmount}</span>
                  </div>
                  <div className="flex justify-between text-[#1B6B45] font-semibold">
                    <span>Negotiated 10% Community Discount:</span>
                    <span className="num">− ₹{discountAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Doorstep Delivery:</span>
                    <span className="text-[#1B6B45] font-medium">FREE</span>
                  </div>

                  <div className="flex justify-between pt-3 border-t border-[#E4EEF5] text-sm">
                    <span className="font-bold text-[#432F2E]">Estimated Payable:</span>
                    <b className="num font-serif text-xl text-[#2E201F]">₹{netEstimatedPayable}</b>
                  </div>
                </div>

                <div className="bg-[#E4EEF5] p-3 rounded-[10px] text-[11px] text-[#2A5C79] flex items-start gap-2">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    No immediate payment required! PACT locks the cart on 25 Nov. You only pay after Sri Lakshmi Stores packs the actual quantities.
                  </span>
                </div>

                <Link
                  href="/customer/bill"
                  className="btn btn-primary block w-full text-center text-xs font-bold shadow-xs py-3"
                >
                  Proceed to Split Bill Preview <ArrowRight className="w-4 h-4 inline ml-1" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
