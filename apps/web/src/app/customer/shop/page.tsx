"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { CustomerBottomNav } from "@/components/CustomerBottomNav";
import { usePact } from "@/context/PactContext";
import {
  Search,
  Mic,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";

export default function ShopPage() {
  const { allProducts, cart, addToCart, updateQuantity, totalCartCount, totalEstimatedAmount } = usePact();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = [
    "All",
    "Rice & Grains",
    "Groceries & Staples",
    "Oils & Ghee",
    "Dal & Pulses",
    "Flours & Atta",
    "Beverages",
  ];

  const filteredProducts = allProducts.filter((product) => {
    const matchesCat =
      selectedCategory === "All" || product.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.brand.toLowerCase().includes(query) ||
      (product.hindiName && product.hindiName.includes(query));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen pb-28 bg-[#F3F8FB]">
      <AppHeader />

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Search Bar with Mic */}
        <div className="input bg-white h-12 shadow-2xs">
          <Search className="w-4 h-4 text-[#6A5452]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rice, atta, oil, dal..."
            className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-[#948180]"
          />
          <Link href="/customer/speak" className="p-1 text-[#2A5C79] hover:bg-[#E4EEF5] rounded-full">
            <Mic className="w-4 h-4" />
          </Link>
        </div>

        {/* Category Scroll Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`chip text-xs transition-all ${
                selectedCategory === cat ? "on" : "hover:bg-[#E4EEF5]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map((p) => {
            const count = cart[p.id] || 0;

            return (
              <div key={p.id} className="card prod p-3.5 flex flex-col justify-between hover:shadow-sm transition-all">
                {/* Product Badge & Icon */}
                <div
                  className={`aspect-square ${p.bgLight} rounded-[12px] flex items-center justify-center text-3xl relative overflow-hidden`}
                >
                  <span className="z-10">{p.imageIcon}</span>
                  <div className="absolute inset-x-0 bottom-0 h-4 bg-[var(--stripes-butter)] opacity-70" />
                  <span className="absolute top-2 left-2 text-[10px] font-bold bg-white/90 px-1.5 py-0.5 rounded-full border border-[#B3CEDE]">
                    {p.variant}
                  </span>
                </div>

                <div className="space-y-1 mt-2.5">
                  <span className="text-[10px] uppercase font-bold text-[#6A5452] tracking-wider block">
                    {p.brand}
                  </span>
                  <b className="text-xs text-[#432F2E] block min-h-[32px] leading-tight">
                    {p.name}
                  </b>
                  {p.hindiName && (
                    <span className="text-[10px] text-[#7A6462] hi block">
                      {p.hindiName}
                    </span>
                  )}
                  <div className="price text-xs font-bold text-[#432F2E]">
                    About ₹{p.price}
                    {p.mrp > p.price && (
                      <s className="text-[10px] text-gray-400 font-normal ml-1">₹{p.mrp}</s>
                    )}
                  </div>
                </div>

                {/* Add / Stepper Control */}
                <div className="mt-3">
                  {count > 0 ? (
                    <div className="stepper h-9 w-full justify-between">
                      <button
                        onClick={() => updateQuantity(p.id, count - 1)}
                        className="hover:bg-[#E4EEF5] rounded-l-[11px]"
                      >
                        {count === 1 ? <Trash2 className="w-3.5 h-3.5 text-red-600" /> : <Minus className="w-3.5 h-3.5" />}
                      </button>
                      <span className="text-xs font-bold">{count}</span>
                      <button
                        onClick={() => updateQuantity(p.id, count + 1)}
                        className="hover:bg-[#E4EEF5] rounded-r-[11px]"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(p.id, 1)}
                      className="btn btn-secondary md h-9 w-full text-xs font-bold"
                    >
                      Add
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Floating Bottom Cart Bar */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-16 inset-x-0 z-30 max-w-md mx-auto px-4">
          <div className="bg-[#432F2E] text-white p-3 rounded-[16px] shadow-xl flex items-center justify-between border border-[#B3CEDE]">
            <div>
              <b className="text-sm text-[#FEEFB8] block">My list · {totalCartCount} items</b>
              <span className="text-xs text-gray-300">about ₹{totalEstimatedAmount}</span>
            </div>
            <Link
              href="/customer/list"
              className="btn btn-primary md h-9 text-xs bg-[#FEEFB8] text-[#432F2E] hover:bg-white"
            >
              View My List <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        </div>
      )}

      <CustomerBottomNav />
    </div>
  );
}
