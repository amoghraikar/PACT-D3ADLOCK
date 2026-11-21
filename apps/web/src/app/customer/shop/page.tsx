"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import {
  Card,
  Button,
  TextField,
  Chip,
  Stepper,
  MoneyText,
  Skeleton,
  EmptyState,
} from "@/components/ui";
import { useCart } from "@/context/CartContext";
import { copy } from "@/lib/copy/en";
import { FALLBACK_CATEGORIES, FALLBACK_PRODUCTS } from "@/lib/catalogue-data";
import { Search, Mic, ShoppingBag, ArrowRight } from "lucide-react";

interface Variant {
  id: string;
  label: string;
  pack_size: number;
  pack_unit: string;
  selling_price_paise: number;
  mrp_paise: number;
}

interface Product {
  id: string;
  name: string;
  brand: string;
  category_id: string;
  category_name: string;
  image_url: string;
  est_unit_price_paise: number;
  mrp_paise: number;
  variants: Variant[];
}

interface Category {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
}

export default function CustomerShopPage() {
  const { isLocked, getItemQuantity, updateQuantity, totalCount, myEstTotalPaise } = useCart();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch categories and products on mount
  useEffect(() => {
    async function loadCatalogue() {
      try {
        const [catRes, prodRes] = await Promise.all([
          fetch("/api/v1/catalogue/categories"),
          fetch("/api/v1/catalogue/products"),
        ]);

        let loadedCategories: Category[] = [];
        let loadedProducts: Product[] = [];

        if (catRes.ok) {
          const catData = await catRes.json();
          loadedCategories = catData.categories || [];
        }

        if (prodRes.ok) {
          const prodData = await prodRes.json();
          loadedProducts = prodData.products || [];
        }

        if (loadedCategories.length === 0) {
          loadedCategories = FALLBACK_CATEGORIES;
        }
        if (loadedProducts.length === 0) {
          loadedProducts = FALLBACK_PRODUCTS;
        }

        setCategories(loadedCategories);
        setProducts(loadedProducts);

        // Default selected variant to the first variant of each product
        const defaults: Record<string, string> = {};
        loadedProducts.forEach((p) => {
          if (p.variants && p.variants.length > 0) {
            defaults[p.id] = p.variants[0].id;
          }
        });
        setSelectedVariants(defaults);
      } catch {
        setCategories(FALLBACK_CATEGORIES);
        setProducts(FALLBACK_PRODUCTS);
        const defaults: Record<string, string> = {};
        FALLBACK_PRODUCTS.forEach((p) => {
          if (p.variants && p.variants.length > 0) {
            defaults[p.id] = p.variants[0].id;
          }
        });
        setSelectedVariants(defaults);
      } finally {
        setIsLoading(false);
      }
    }
    loadCatalogue();
  }, []);

  // Filter products by category and search query
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      if (activeCategory !== "All") {
        if (prod.category_id !== activeCategory && prod.category_name !== activeCategory) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = prod.name.toLowerCase().includes(q);
        const matchesBrand = prod.brand.toLowerCase().includes(q);
        return matchesName || matchesBrand;
      }
      return true;
    });
  }, [products, activeCategory, searchQuery]);

  return (
    <CustomerLayout>
      <div className="space-y-4 w-full max-w-full overflow-x-hidden">
        {/* Search Bar with Mic shortcut */}
        <div className="relative">
          <TextField
            label="Search groceries"
            placeholder={copy.customer.shop.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefix={<Search className="w-5 h-5 text-ink-400" />}
            suffix={
              <Link
                href="/customer/speak"
                className="p-1 rounded-ctl text-teal-700 hover:bg-ice-100 transition-colors focus-ring"
                title="Voice order"
              >
                <Mic className="w-5 h-5" />
              </Link>
            }
          />
        </div>

        {/* 12 Category Chips (horizontal scroll per U5) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <Chip
            selected={activeCategory === "All"}
            onClick={() => setActiveCategory("All")}
          >
            All
          </Chip>
          {categories.map((cat) => (
            <Chip
              key={cat.id}
              selected={activeCategory === cat.name || activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.name)}
            >
              {cat.name}
            </Chip>
          ))}
        </div>

        {/* Product Grid (2 columns on mobile/desktop per U8) */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[1, 2, 3, 4].map((n) => (
              <Card key={n} className="p-3 space-y-2">
                <Skeleton height={110} className="w-full" />
                <Skeleton height={16} width="80%" />
                <Skeleton height={14} width="40%" />
                <Skeleton height={36} className="w-full" />
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="w-8 h-8" />}
            title="No items found"
            description="Try searching with a different name or browse by category."
            actionLabel="View all categories"
            onAction={() => {
              setActiveCategory("All");
              setSearchQuery("");
            }}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
            {filteredProducts.map((prod) => {
              const activeVarId = selectedVariants[prod.id] || prod.variants[0]?.id;
              const activeVariant =
                prod.variants.find((v) => v.id === activeVarId) || prod.variants[0];
              const qty = activeVariant ? getItemQuantity(activeVariant.id) : 0;

              return (
                <Card
                  key={prod.id}
                  padding="sm"
                  className="flex flex-col justify-between space-y-3 bg-white hover:border-ice-400 transition-colors"
                >
                  <div className="space-y-2">
                    {/* Placeholder image card */}
                    <div className="w-full h-28 bg-ice-50 rounded-ctl border border-ice-100 flex items-center justify-center text-teal-700/60 p-2">
                      <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
                    </div>

                    {/* Product Name & Brand */}
                    <div>
                      <h3 className="font-semibold text-sm text-ink-800 line-clamp-1">
                        {prod.name}
                      </h3>
                      <p className="text-[11px] text-ink-500 truncate">{prod.brand}</p>
                    </div>

                    {/* Variant Chips */}
                    {prod.variants.length > 1 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {prod.variants.map((v) => (
                          <Chip
                            key={v.id}
                            size="sm"
                            selected={activeVariant?.id === v.id}
                            onClick={() =>
                              setSelectedVariants((prev) => ({
                                ...prev,
                                [prod.id]: v.id,
                              }))
                            }
                          >
                            {v.label}
                          </Chip>
                        ))}
                      </div>
                    )}

                    {/* Estimated Price */}
                    {activeVariant && (
                      <div className="flex items-baseline gap-1.5 pt-1">
                        <MoneyText
                          paise={activeVariant.selling_price_paise}
                          approx
                          size="base"
                        />
                        {activeVariant.mrp_paise > activeVariant.selling_price_paise && (
                          <MoneyText
                            paise={activeVariant.mrp_paise}
                            strikeThrough
                            size="sm"
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Add Button or Stepper per U8 */}
                  <div className="pt-2">
                    {isLocked ? (
                      <div className="h-10 text-center flex items-center justify-center text-xs text-ink-400 bg-ice-100 rounded-ctl">
                        Closed
                      </div>
                    ) : qty > 0 ? (
                      <div className="flex justify-center">
                        <Stepper
                          value={qty}
                          onChange={(newQty) =>
                            activeVariant &&
                            updateQuantity(activeVariant.id, newQty, {
                              name: prod.name,
                              brand: prod.brand,
                              variant_label: activeVariant.label,
                              est_unit_price_paise: activeVariant.selling_price_paise,
                              mrp_paise: activeVariant.mrp_paise,
                            })
                          }
                          min={0}
                          max={99}
                          className="w-full justify-between"
                        />
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        onClick={() =>
                          activeVariant &&
                          updateQuantity(activeVariant.id, 1, {
                            name: prod.name,
                            brand: prod.brand,
                            variant_label: activeVariant.label,
                            est_unit_price_paise: activeVariant.selling_price_paise,
                            mrp_paise: activeVariant.mrp_paise,
                          })
                        }
                      >
                        Add
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky "My list" bar per U8 */}
      {totalCount > 0 && (
        <div className="sticky bottom-18 inset-x-0 z-30">
          <Link
            href="/customer/list"
            className="flex items-center justify-between p-3.5 bg-ink-800 text-white rounded-ctl shadow-[var(--shadow-float)] border border-ink-600 focus-ring"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">My list</span>
              <span className="text-xs text-ice-200">·</span>
              <span className="text-xs text-ice-200">
                {totalCount} {totalCount === 1 ? "item" : "items"}
              </span>
              <span className="text-xs text-ice-200">·</span>
              <MoneyText
                paise={myEstTotalPaise}
                approx
                size="sm"
                className="text-white"
              />
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-ice-200">
              <span>View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      )}
    </CustomerLayout>
  );
}
