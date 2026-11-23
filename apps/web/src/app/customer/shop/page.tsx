"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Card,
  Button,
  SearchBar,
  MoneyText,
  Modal,
  Skeleton,
  EmptyState,
} from "@/components/ui";
import { catalogueService, Product, Category, Variant } from "@/services/catalogue.service";
import { cartService } from "@/services/cart.service";
import { useToast } from "@/hooks/useToast";
import { useDebounce } from "@/hooks/useDebounce";
import { ShoppingBag, Plus, Minus, Check, Layers, Store } from "lucide-react";

export default function ShopPage() {
  const { success, error: toastError } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Variant Modal State
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [variantQuantity, setVariantQuantity] = useState<number>(1);
  const [isAdding, setIsAdding] = useState<boolean>(false);

  // Fetch Categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await catalogueService.getCategories();
        setCategories(res.categories || []);
      } catch {
        // fallback
      }
    }
    loadCategories();
  }, []);

  // Fetch Products on filter/search change
  useEffect(() => {
    let mounted = true;
    async function loadProducts() {
      setIsLoading(true);
      try {
        const res = await catalogueService.getProducts({
          category: selectedCategory !== "All" ? selectedCategory : undefined,
          q: debouncedSearch.trim() || undefined,
          limit: 60,
        });
        if (mounted) {
          setProducts(res.products || []);
        }
      } catch (err: any) {
        if (mounted) {
          toastError(err?.message || "Failed to load products");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadProducts();
    return () => {
      mounted = false;
    };
  }, [selectedCategory, debouncedSearch, toastError]);

  const openVariantModal = (product: Product) => {
    setActiveProduct(product);
    setSelectedVariant(product.variants?.[0] || null);
    setVariantQuantity(1);
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) return;

    setIsAdding(true);
    try {
      await cartService.updateItemQuantity(selectedVariant.id, variantQuantity);
      success(
        `Added ${variantQuantity} × ${activeProduct?.name} (${selectedVariant.label}) to shared cart!`
      );
      setActiveProduct(null);
    } catch (err: any) {
      toastError(err?.message || "Failed to update collective cart");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-text">
              Community Grocery Catalogue
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Wholesale staple groceries aggregated for Green Glen Residency
            </p>
          </div>

          <div className="w-full sm:w-72">
            <SearchBar
              placeholder="Search rice, atta, oil, milk..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory("All")}
            className={`px-3 py-1.5 rounded-pill text-xs font-semibold shrink-0 transition-colors cursor-pointer border ${
              selectedCategory === "All"
                ? "bg-primary text-white border-primary"
                : "bg-surface text-text border-border hover:bg-background"
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id || cat.slug}
              type="button"
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-3 py-1.5 rounded-pill text-xs font-medium shrink-0 transition-colors cursor-pointer border ${
                selectedCategory === cat.name
                  ? "bg-primary text-white border-primary font-semibold"
                  : "bg-surface text-text border-border hover:bg-background"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} variant="card" className="h-64 rounded-card" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title="No Products Found"
            description={
              searchQuery
                ? `No groceries matched "${searchQuery}". Try searching for rice, oil, sugar, or tea.`
                : "No products available in this category."
            }
            action={{
              label: "Clear Search Filters",
              onClick: () => {
                setSearchQuery("");
                setSelectedCategory("All");
              },
            }}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map((product) => {
              const defaultVariant = product.variants?.[0];
              const pricePaise = defaultVariant?.selling_price_paise || product.est_unit_price_paise;
              const mrpPaise = defaultVariant?.mrp_paise || product.mrp_paise;

              return (
                <Card
                  key={product.id}
                  className="p-4 flex flex-col justify-between hover:border-primary transition-all duration-150 group"
                >
                  <div className="space-y-3">
                    {/* Product Image / Placeholder */}
                    <div className="w-full aspect-square rounded-card bg-background border border-border flex items-center justify-center overflow-hidden relative">
                      {product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <Store className="w-10 h-10 text-muted/40" />
                      )}
                      {product.brand && (
                        <span className="absolute top-2 left-2 bg-surface/90 backdrop-blur-xs text-[10px] font-bold text-text px-1.5 py-0.5 rounded border border-border">
                          {product.brand}
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div>
                      <span className="text-[10px] font-medium text-muted uppercase tracking-wider block">
                        {product.category_name}
                      </span>
                      <h3 className="font-bold text-text text-sm line-clamp-2 mt-0.5" title={product.name}>
                        {product.name}
                      </h3>
                      {defaultVariant && (
                        <p className="text-xs text-muted mt-0.5">
                          {defaultVariant.label || `${defaultVariant.pack_size} ${defaultVariant.pack_unit}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div className="pt-3 mt-3 border-t border-border flex items-center justify-between">
                    <div>
                      <div className="text-sm sm:text-base font-bold text-text">
                        <MoneyText paise={pricePaise} />
                      </div>
                      {mrpPaise > pricePaise && (
                        <span className="text-[11px] text-muted line-through">
                          <MoneyText paise={mrpPaise} />
                        </span>
                      )}
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openVariantModal(product)}
                      className="h-8 px-2.5 text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      <span>Add</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Variant Selection Modal */}
        <Modal
          isOpen={!!activeProduct}
          onClose={() => setActiveProduct(null)}
          title={activeProduct?.name || "Select Pack Size"}
          confirmLabel={`Add to Cart (${variantQuantity} units)`}
          onConfirm={handleAddToCart}
          isConfirmLoading={isAdding}
          size="md"
        >
          {activeProduct && (
            <div className="space-y-4">
              <p className="text-xs text-muted">
                Choose the variant size and desired quantity for your apartment household:
              </p>

              {/* Variant Radio List */}
              <div className="space-y-2">
                {activeProduct.variants?.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`p-3 rounded-card border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "border-primary bg-background shadow-xs"
                          : "border-border hover:bg-background/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? "border-primary bg-primary" : "border-muted"
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text">{v.label}</p>
                          <p className="text-xs text-muted">
                            {v.pack_size} {v.pack_unit} pack
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-text">
                          <MoneyText paise={v.selling_price_paise} />
                        </div>
                        {v.mrp_paise > v.selling_price_paise && (
                          <span className="text-[11px] text-muted line-through">
                            <MoneyText paise={v.mrp_paise} />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quantity Stepper */}
              <div className="pt-2 flex items-center justify-between p-3 bg-background rounded-card border border-border">
                <span className="text-xs font-semibold text-text">Quantity for Monthly Order:</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setVariantQuantity(Math.max(1, variantQuantity - 1))}
                    disabled={variantQuantity <= 1}
                    className="w-8 h-8 rounded-full border border-border bg-surface text-text hover:bg-background flex items-center justify-center disabled:opacity-40 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-bold w-6 text-center text-text tabular-nums">
                    {variantQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setVariantQuantity(variantQuantity + 1)}
                    className="w-8 h-8 rounded-full border border-border bg-surface text-text hover:bg-background flex items-center justify-center cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AppShell>
  );
}
