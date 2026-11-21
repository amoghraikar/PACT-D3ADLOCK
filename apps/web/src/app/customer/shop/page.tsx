"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { usePact } from "@/context/PactContext";
import {
  Search,
  Mic,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  Filter,
  Check,
  TrendingDown,
  Building2,
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
    <div className="min-h-screen bg-[#F3F8FB] text-[#432F2E]">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#E4EEF5]">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#6A5452] mb-1">
              <Link href="/" className="hover:underline">Dashboard</Link>
              <span>/</span>
              <span className="font-semibold text-[#432F2E]">Groceries Catalogue</span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#2E201F]">
              Community Grocery Catalogue
            </h1>
            <p className="text-xs sm:text-sm text-[#6A5452]">
              Select items for Green Meadows November 2026 collective bulk order.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/customer/speak"
              className="btn btn-secondary md text-xs font-bold bg-white"
            >
              <Mic className="w-4 h-4 mr-1 text-[#2A5C79]" />
              Speak Orders (Hindi / English)
            </Link>
            <Link
              href="/customer/list"
              className="btn btn-primary md text-xs font-bold"
            >
              <ShoppingBag className="w-4 h-4 mr-1" />
              View My List ({totalCartCount})
            </Link>
          </div>
        </div>

        {/* 2-Column Desktop Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Left Sidebar: Filters & Categories */}
          <div className="lg:col-span-1 space-y-5">
            {/* Search Input */}
            <div className="input bg-white h-12 shadow-2xs">
              <Search className="w-4 h-4 text-[#6A5452]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rice, atta, oil..."
                className="flex-1 bg-transparent border-0 outline-none text-xs placeholder:text-[#948180]"
              />
            </div>

            {/* Category Navigation */}
            <div className="card p-4 space-y-2 bg-white">
              <div className="flex items-center gap-2 pb-2 border-b border-[#E4EEF5] text-xs font-bold text-[#432F2E]">
                <Filter className="w-3.5 h-3.5 text-[#2A5C79]" />
                <span>Categories</span>
              </div>
              <div className="space-y-1">
                {categories.map((cat) => {
                  const count =
                    cat === "All"
                      ? allProducts.length
                      : allProducts.filter((p) => p.category === cat).length;
                  const isSelected = selectedCategory === cat;

                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full flex justify-between items-center px-3 py-2 rounded-[10px] text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#432F2E] text-[#FEEFB8] font-bold shadow-xs"
                          : "text-[#6A5452] hover:bg-[#F3F8FB] hover:text-[#432F2E]"
                      }`}
                    >
                      <span>{cat}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-[#FEEFB8] text-[#432F2E]" : "bg-[#E4EEF5] text-[#6A5452]"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bulk Wholesale Guarantee Card */}
            <div className="card p-5 bg-[#FFF7DB] border-[#EFDB93] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#432F2E]">
                <TrendingDown className="w-4 h-4 text-[#1B6B45]" />
                <span>Wholesale Pricing</span>
              </div>
              <p className="text-xs text-[#6A5452] leading-relaxed">
                By purchasing together as a building, Green Meadows secures wholesale tier rates directly from local partner Sri Lakshmi Stores.
              </p>
            </div>
          </div>

          {/* Right Product Grid */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex justify-between items-center text-xs text-[#6A5452]">
              <span>Showing <strong>{filteredProducts.length}</strong> items in <strong>{selectedCategory}</strong></span>
              <span>Prices in Indian Rupees (₹)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProducts.map((product) => {
                const count = cart[product.id] || 0;

                return (
                  <div
                    key={product.id}
                    className="card p-4 flex flex-col justify-between hover:shadow-md transition-all bg-white"
                  >
                    <div>
                      {/* Product Visual Container */}
                      <div
                        className={`aspect-video ${product.bgLight} rounded-[12px] flex items-center justify-center text-4xl relative overflow-hidden`}
                      >
                        <span>{product.imageIcon}</span>
                        <span className="absolute top-2 left-2 text-[10px] font-bold bg-white/95 px-2 py-0.5 rounded-full border border-[#B3CEDE]">
                          {product.variant}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[#6A5452] tracking-wider block">
                          {product.brand}
                        </span>
                        <h3 className="font-bold text-sm text-[#432F2E] leading-tight">
                          {product.name}
                        </h3>
                        {product.hindiName && (
                          <p className="hi text-xs text-[#6A5452]">
                            {product.hindiName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 mt-4 border-t border-[#E4EEF5] flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="num font-bold text-base text-[#432F2E]">
                            ₹{product.price}
                          </span>
                          <span className="num text-xs text-[#948180] line-through">
                            ₹{product.mrp}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#1B6B45] font-semibold block">
                          Save ₹{product.mrp - product.price} vs MRP
                        </span>
                      </div>

                      {count === 0 ? (
                        <button
                          onClick={() => addToCart(product.id, 1)}
                          className="btn btn-secondary md h-9 px-3.5 text-xs font-bold cursor-pointer hover:bg-[#FEEFB8]"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add
                        </button>
                      ) : (
                        <div className="stepper h-9">
                          <button
                            onClick={() => updateQuantity(product.id, count - 1)}
                            className="px-2.5 hover:bg-[#E4EEF5] cursor-pointer"
                          >
                            {count === 1 ? (
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            ) : (
                              <Minus className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <span className="text-xs font-bold px-2.5">{count}</span>
                          <button
                            onClick={() => updateQuantity(product.id, count + 1)}
                            className="px-2.5 hover:bg-[#E4EEF5] cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Floating Bottom Cart Bar for Quick Checkout */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-6 inset-x-0 z-30 max-w-4xl mx-auto px-4">
          <div className="bg-[#432F2E] text-white p-4 rounded-[16px] shadow-2xl flex items-center justify-between border border-[#2E201F] animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FEEFB8] text-[#432F2E] flex items-center justify-center font-bold">
                <ShoppingBag className="w-5 h-5 text-[#2A5C79]" />
              </div>
              <div>
                <b className="text-sm block">My Household Contribution</b>
                <span className="text-xs text-[#FEEFB8]">
                  {totalCartCount} products selected · Estimated ₹{totalEstimatedAmount}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/customer/list"
                className="btn btn-primary md text-xs font-bold bg-[#FEEFB8] text-[#432F2E] hover:bg-white"
              >
                Review Contribution <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
