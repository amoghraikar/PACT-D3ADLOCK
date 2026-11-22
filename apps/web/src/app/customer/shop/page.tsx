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
  Pagination,
} from "@/components/ui";
import { useCart } from "@/context/CartContext";
import { copy } from "@/lib/copy/en";
import { FALLBACK_CATEGORIES, FALLBACK_PRODUCTS } from "@/lib/catalogue-data";
import { CatalogueService, Product, Category } from "@/lib/services/catalogue.service";
import { Search, Mic, ShoppingBag, ArrowRight, AlertCircle, RefreshCw } from "lucide-react";

const ITEMS_PER_PAGE = 12;

export default function CustomerShopPage() {
  const { isLocked, getItemQuantity, updateQuantity, totalCount, myEstTotalPaise } = useCart();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadCatalogue = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [catRes, prodRes] = await Promise.all([
        CatalogueService.getCategories().catch(() => ({ categories: FALLBACK_CATEGORIES })),
        CatalogueService.getProducts({ limit: 100 }).catch(() => ({ products: FALLBACK_PRODUCTS })),
      ]);

      const loadedCategories = catRes.categories?.length ? catRes.categories : FALLBACK_CATEGORIES;
      const loadedProducts = prodRes.products?.length ? prodRes.products : FALLBACK_PRODUCTS;

      setCategories(loadedCategories);
      setProducts(loadedProducts);

      const defaults: Record<string, string> = {};
      loadedProducts.forEach((p) => {
        if (p.variants && p.variants.length > 0) {
          defaults[p.id] = p.variants[0].id;
        }
      });
      setSelectedVariants(defaults);
    } catch (err: any) {
      console.error("Failed to load catalogue:", err);
      setErrorMsg("Unable to load latest catalogue. Showing cached products.");
      setCategories(FALLBACK_CATEGORIES);
      setProducts(FALLBACK_PRODUCTS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogue();
    const interval = setInterval(loadCatalogue, 6000);
    return () => clearInterval(interval);
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

  // Reset page when search or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  return (
    <CustomerLayout>
      <div className="space-y-4 w-full max-w-full overflow-x-hidden">
        {/* Error notification banner if any */}
        {errorMsg && (
          <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={loadCatalogue}
              className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:underline"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

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

        {/* 12 Category Chips */}
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

        {/* Product Grid */}
        {isLoading && products.length === 0 ? (
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
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
              {paginatedProducts.map((prod) => {
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

                    {/* Stepper or Add button */}
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

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredProducts.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </>
        )}
      </div>

      {/* Sticky "My list" bar */}
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
