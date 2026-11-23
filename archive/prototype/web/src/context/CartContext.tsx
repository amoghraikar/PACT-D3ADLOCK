"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

export interface CartItem {
  variant_id: string;
  name: string;
  brand: string;
  variant_label: string;
  quantity: number;
  est_unit_price_paise: number;
  mrp_paise: number;
  est_line_paise: number;
}

export interface CommunityTotalItem {
  name: string;
  variant_label: string;
  total_quantity: number;
  total_base: string;
}

export interface CommunityCartBlock {
  participants: number;
  items: CommunityTotalItem[];
}

const DEFAULT_MY_ITEMS: CartItem[] = [
  {
    variant_id: "var-rice-sona-5kg",
    name: "Sona Masoori Rice",
    brand: "Royal Harvest",
    variant_label: "5 kg",
    quantity: 2,
    est_unit_price_paise: 25000,
    mrp_paise: 28000,
    est_line_paise: 50000,
  },
  {
    variant_id: "var-sunflower-oil-1l",
    name: "Refined Sunflower Oil",
    brand: "Sunpure",
    variant_label: "1 L",
    quantity: 1,
    est_unit_price_paise: 16000,
    mrp_paise: 18000,
    est_line_paise: 16000,
  },
  {
    variant_id: "var-toor-dal-1kg",
    name: "Premium Toor Dal (Arhar)",
    brand: "Tata Sampann",
    variant_label: "1 kg",
    quantity: 1,
    est_unit_price_paise: 14000,
    mrp_paise: 16000,
    est_line_paise: 14000,
  },
];

const DEFAULT_COMMUNITY: CommunityCartBlock = {
  participants: 4,
  items: [
    {
      name: "Sona Masoori Rice",
      variant_label: "5 kg",
      total_quantity: 6,
      total_base: "30 kg",
    },
    {
      name: "Refined Sunflower Oil",
      variant_label: "1 L",
      total_quantity: 4,
      total_base: "4 L",
    },
    {
      name: "Premium Toor Dal (Arhar)",
      variant_label: "1 kg",
      total_quantity: 3,
      total_base: "3 kg",
    },
    {
      name: "Whole Wheat Chakki Atta",
      variant_label: "5 kg",
      total_quantity: 2,
      total_base: "10 kg",
    },
  ],
};

interface CartContextType {
  cycleMonth: string;
  status: "open" | "locked" | "submitted" | "closed_empty";
  isLocked: boolean;
  locksAt: string;
  myItems: CartItem[];
  myEstTotalPaise: number;
  community: CommunityCartBlock;
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  updateQuantity: (
    variant_id: string,
    quantity: number,
    meta?: { name?: string; brand?: string; variant_label?: string; est_unit_price_paise?: number; mrp_paise?: number }
  ) => Promise<{ success: boolean; error?: string }>;
  removeItem: (variant_id: string) => Promise<{ success: boolean; removedItem?: CartItem }>;
  restoreItem: (item: CartItem) => Promise<boolean>;
  getItemQuantity: (variant_id: string) => number;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cycleMonth, setCycleMonth] = useState("2026-11");
  const [status, setStatus] = useState<"open" | "locked" | "submitted" | "closed_empty">("open");
  const [isLocked, setIsLocked] = useState(false);
  const [locksAt, setLocksAt] = useState("2026-11-25T00:00:00+05:30");
  const [myItems, setMyItems] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("pact_cart_items");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return DEFAULT_MY_ITEMS;
  });
  const [community, setCommunity] = useState<CommunityCartBlock>(DEFAULT_COMMUNITY);
  const [isLoading, setIsLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const prevItemsRef = useRef<CartItem[]>([]);

  // Compute total paise
  const myEstTotalPaise = myItems.reduce((acc, curr) => acc + curr.est_line_paise, 0);
  const totalCount = myItems.reduce((acc, curr) => acc + curr.quantity, 0);

  const syncToStorage = (items: CartItem[]) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pact_cart_items", JSON.stringify(items));
    }
  };

  const refreshCart = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/cart", {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setCycleMonth(data.cycle_month || "2026-11");
        setStatus(data.status || "open");
        setLocksAt(data.locks_at || "2026-11-25T00:00:00+05:30");

        const locked =
          data.status !== "open" ||
          (data.locks_at ? new Date(data.locks_at).getTime() <= Date.now() : false);
        setIsLocked(locked);

        if (data.my_items && data.my_items.length > 0) {
          setMyItems(data.my_items);
          syncToStorage(data.my_items);
        }
        if (data.community) {
          setCommunity(data.community);
        }
      }
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadCart = async () => {
      try {
        const res = await fetch("/api/v1/cart", {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          setCycleMonth(data.cycle_month || "2026-11");
          setStatus(data.status || "open");
          setLocksAt(data.locks_at || "2026-11-25T00:00:00+05:30");

          const locked =
            data.status !== "open" ||
            (data.locks_at ? new Date(data.locks_at).getTime() <= Date.now() : false);
          setIsLocked(locked);

          if (data.my_items && data.my_items.length > 0) {
            setMyItems(data.my_items);
            syncToStorage(data.my_items);
          }
          if (data.community) {
            setCommunity(data.community);
          }
        }
      } catch {
        // use default state
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadCart();
    const interval = setInterval(loadCart, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const getItemQuantity = useCallback(
    (variant_id: string) => {
      const item = myItems.find((i) => i.variant_id === variant_id);
      return item ? item.quantity : 0;
    },
    [myItems]
  );

  const updateQuantity = async (
    variant_id: string,
    quantity: number,
    meta?: { name?: string; brand?: string; variant_label?: string; est_unit_price_paise?: number; mrp_paise?: number }
  ) => {
    if (isLocked) {
      return {
        success: false,
        error: "Ordering for this month has closed. You can add items again from 1 Dec.",
      };
    }

    setMyItems((prev) => {
      let updated: CartItem[];
      if (quantity <= 0) {
        updated = prev.filter((i) => i.variant_id !== variant_id);
      } else {
        const existing = prev.find((i) => i.variant_id === variant_id);
        if (existing) {
          updated = prev.map((i) =>
            i.variant_id === variant_id
              ? { ...i, quantity, est_line_paise: i.est_unit_price_paise * quantity }
              : i
          );
        } else {
          const unitPrice = meta?.est_unit_price_paise || 20000;
          const mrp = meta?.mrp_paise || 24000;
          updated = [
            ...prev,
            {
              variant_id,
              name: meta?.name || "Grocery Item",
              brand: meta?.brand || "PACT",
              variant_label: meta?.variant_label || "1 pack",
              quantity,
              est_unit_price_paise: unitPrice,
              mrp_paise: mrp,
              est_line_paise: unitPrice * quantity,
            },
          ];
        }
      }
      syncToStorage(updated);
      return updated;
    });

    try {
      const res = await fetch(`/api/v1/cart/items/${variant_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quantity }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err?.error?.code === "CART_LOCKED") {
          setIsLocked(true);
          return { success: false, error: err.error.message };
        }
      }
    } catch {
      // offline: client-side update already applied
    }

    return { success: true };
  };

  const removeItem = async (variant_id: string) => {
    const itemToRemove = myItems.find((i) => i.variant_id === variant_id);
    if (!itemToRemove) return { success: false };

    prevItemsRef.current = [...myItems];
    const res = await updateQuantity(variant_id, 0);
    if (res.success) {
      return { success: true, removedItem: itemToRemove };
    }
    return { success: false };
  };

  const restoreItem = async (item: CartItem) => {
    const res = await updateQuantity(item.variant_id, item.quantity, {
      name: item.name,
      brand: item.brand,
      variant_label: item.variant_label,
      est_unit_price_paise: item.est_unit_price_paise,
      mrp_paise: item.mrp_paise,
    });
    return res.success;
  };

  return (
    <CartContext.Provider
      value={{
        cycleMonth,
        status,
        isLocked,
        locksAt,
        myItems,
        myEstTotalPaise,
        community,
        isLoading,
        error,
        totalCount,
        updateQuantity,
        removeItem,
        restoreItem,
        getItemQuantity,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
