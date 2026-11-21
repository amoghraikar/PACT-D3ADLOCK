"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface Product {
  id: string;
  name: string;
  hindiName?: string;
  brand: string;
  category: string;
  variant: string;
  price: number;
  mrp: number;
  imageIcon: string;
  bgLight: string;
  tagColor: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface User {
  id: string;
  name: string;
  role: "customer" | "retailer" | "admin";
  phone: string;
  apartment?: string;
  flat?: string;
  storeName?: string;
}

export interface BillResident {
  id: string;
  name: string;
  flat: string;
  itemsTotal: number;
  discount: number;
  netPayable: number;
  status: "paid" | "to_pay";
  paidAt?: string;
  deliveryStatus: "ready" | "out_for_delivery" | "delivered";
  deliveredAt?: string;
}

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "rice-sona-5kg",
    name: "Sona Masoori Rice",
    hindiName: "सोना मसूरी चावल",
    brand: "Royal Harvest",
    category: "Rice & Grains",
    variant: "5 kg",
    price: 300,
    mrp: 340,
    imageIcon: "🌾",
    bgLight: "bg-[#E4EEF5]",
    tagColor: "text-[#2A5C79]",
  },
  {
    id: "sugar-1kg",
    name: "Pure Crystal Sugar",
    hindiName: "सफेद चीनी",
    brand: "Madhur",
    category: "Groceries & Staples",
    variant: "1 kg",
    price: 75,
    mrp: 85,
    imageIcon: "🍚",
    bgLight: "bg-[#FFF7DB]",
    tagColor: "text-[#8A3A00]",
  },
  {
    id: "sunflower-oil-1l",
    name: "Refined Sunflower Cooking Oil",
    hindiName: "सूरजमुखी तेल",
    brand: "Sunlite",
    category: "Oils & Ghee",
    variant: "1 L",
    price: 250,
    mrp: 280,
    imageIcon: "🌻",
    bgLight: "bg-[#E3F4EA]",
    tagColor: "text-[#1B6B45]",
  },
  {
    id: "toor-dal-500g",
    name: "Organic Toor Dal (Arhar)",
    hindiName: "तूर दाल (अरहर)",
    brand: "Green Fields",
    category: "Dal & Pulses",
    variant: "500 g",
    price: 100,
    mrp: 120,
    imageIcon: "🥣",
    bgLight: "bg-[#FCE8E6]",
    tagColor: "text-[#A3241C]",
  },
  {
    id: "poha-500g",
    name: "Thick Poha (Flattened Rice)",
    hindiName: "मोटा पोहा",
    brand: "Desi Choice",
    category: "Rice & Grains",
    variant: "500 g",
    price: 45,
    mrp: 55,
    imageIcon: "🌾",
    bgLight: "bg-[#E4EEF5]",
    tagColor: "text-[#2A5C79]",
  },
  {
    id: "atta-chakki-5kg",
    name: "Sharbati Whole Wheat Atta",
    hindiName: "ताजा चक्की आटा",
    brand: "Annapurna",
    category: "Flours & Atta",
    variant: "5 kg",
    price: 260,
    mrp: 310,
    imageIcon: "🥖",
    bgLight: "bg-[#FFF7DB]",
    tagColor: "text-[#8A3A00]",
  },
  {
    id: "tea-premium-500g",
    name: "Assam Gold CTC Leaf Tea",
    hindiName: "कड़क चाय पत्ती",
    brand: "Taj Mahal",
    category: "Beverages",
    variant: "500 g",
    price: 240,
    mrp: 275,
    imageIcon: "☕",
    bgLight: "bg-[#FCE8E6]",
    tagColor: "text-[#A3241C]",
  },
  {
    id: "salt-iodized-1kg",
    name: "Vacuum Evaporated Iodized Salt",
    hindiName: "आयोडीन युक्त नमक",
    brand: "Tata Salt",
    category: "Groceries & Staples",
    variant: "1 kg",
    price: 28,
    mrp: 30,
    imageIcon: "🧂",
    bgLight: "bg-[#E4EEF5]",
    tagColor: "text-[#2A5C79]",
  },
];

export const PRESET_USERS: Record<string, User> = {
  asha: {
    id: "user-asha",
    name: "Asha Rao",
    role: "customer",
    phone: "9999900001",
    apartment: "Green Meadows Apartments",
    flat: "A-101",
  },
  ravi: {
    id: "user-ravi",
    name: "Ravi Kumar",
    role: "retailer",
    phone: "9999900002",
    storeName: "Sri Lakshmi Stores",
  },
  meera: {
    id: "user-meera",
    name: "Meera Nair",
    role: "admin",
    phone: "9999900003",
    apartment: "Green Meadows Apartments",
    flat: "Coordinator",
  },
};

interface PactContextType {
  currentUser: User;
  switchUser: (userId: "asha" | "ravi" | "meera") => void;
  cart: { [productId: string]: number };
  addToCart: (productId: string, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalCartCount: number;
  totalEstimatedAmount: number;
  allProducts: Product[];
  toast: string | null;
  showToast: (msg: string) => void;
  residents: BillResident[];
  updateResidentDelivery: (residentId: string, status: "ready" | "out_for_delivery" | "delivered") => void;
  sendReminder: (residentId: string) => void;
  isPaid: boolean;
  payAshaBill: () => void;
  orderDiscount: number;
  setOrderDiscount: (amt: number) => void;
}

const PactContext = createContext<PactContextType | null>(null);

export function PactProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(PRESET_USERS.asha);

  // Asha initial cart: 1 rice (5kg), 2 sugar (1kg), 1 oil (1L), 1 dal (500g)
  const [cart, setCart] = useState<{ [id: string]: number }>({
    "rice-sona-5kg": 1,
    "sugar-1kg": 2,
    "sunflower-oil-1l": 1,
    "toor-dal-500g": 1,
  });

  const [toast, setToast] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [orderDiscount, setOrderDiscount] = useState<number>(250);

  // 4 building residents from Golden Scenario
  const [residents, setResidents] = useState<BillResident[]>([
    {
      id: "res-asha",
      name: "Asha",
      flat: "A-101",
      itemsTotal: 800,
      discount: 80,
      netPayable: 720,
      status: "to_pay",
      deliveryStatus: "ready",
    },
    {
      id: "res-bharat",
      name: "Bharat",
      flat: "B-204",
      itemsTotal: 600,
      discount: 60,
      netPayable: 540,
      status: "paid",
      paidAt: "26 Nov, 6:15 pm",
      deliveryStatus: "out_for_delivery",
    },
    {
      id: "res-chitra",
      name: "Chitra",
      flat: "C-305",
      itemsTotal: 400,
      discount: 40,
      netPayable: 360,
      status: "to_pay",
      deliveryStatus: "ready",
    },
    {
      id: "res-dev",
      name: "Dev",
      flat: "D-402",
      itemsTotal: 700,
      discount: 70,
      netPayable: 630,
      status: "paid",
      paidAt: "27 Nov, 9:03 am",
      deliveryStatus: "delivered",
      deliveredAt: "28 Nov, 2:10 pm",
    },
  ]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const switchUser = (userId: "asha" | "ravi" | "meera") => {
    const user = PRESET_USERS[userId];
    if (user) {
      setCurrentUser(user);
      showToast(`Switched workspace to ${user.name} (${user.role.toUpperCase()})`);
    }
  };

  const addToCart = (productId: string, quantity = 1) => {
    setCart((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + quantity,
    }));
    const p = INITIAL_PRODUCTS.find((x) => x.id === productId);
    if (p) showToast(`Added ${p.name} to your list`);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) => ({
      ...prev,
      [productId]: quantity,
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
    const p = INITIAL_PRODUCTS.find((x) => x.id === productId);
    if (p) showToast(`Removed ${p.name} from list`);
  };

  const clearCart = () => setCart({});

  const totalCartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const totalEstimatedAmount = Object.entries(cart).reduce((sum, [id, qty]) => {
    const prod = INITIAL_PRODUCTS.find((p) => p.id === id);
    return sum + (prod ? prod.price * qty : 0);
  }, 0);

  const payAshaBill = () => {
    setIsPaid(true);
    setResidents((prev) =>
      prev.map((r) =>
        r.id === "res-asha"
          ? {
              ...r,
              status: "paid",
              paidAt: "Just now",
              deliveryStatus: "ready",
            }
          : r
      )
    );
    showToast("Payment verified! Receipt GM-2611-001 issued.");
  };

  const updateResidentDelivery = (
    residentId: string,
    status: "ready" | "out_for_delivery" | "delivered"
  ) => {
    setResidents((prev) =>
      prev.map((r) =>
        r.id === residentId
          ? {
              ...r,
              deliveryStatus: status,
              deliveredAt: status === "delivered" ? "Just now by Meera" : r.deliveredAt,
            }
          : r
      )
    );
    showToast(`Updated delivery status to ${status.replace(/_/g, " ")}`);
  };

  const sendReminder = (residentId: string) => {
    const r = residents.find((x) => x.id === residentId);
    if (r) {
      showToast(`Payment reminder dispatched to ${r.name} (${r.flat})`);
    }
  };

  return (
    <PactContext.Provider
      value={{
        currentUser,
        switchUser,
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalCartCount,
        totalEstimatedAmount,
        allProducts: INITIAL_PRODUCTS,
        toast,
        showToast,
        residents,
        updateResidentDelivery,
        sendReminder,
        isPaid,
        payAshaBill,
        orderDiscount,
        setOrderDiscount,
      }}
    >
      {children}
      {/* Global Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className="toast">
            <span className="text-sm">{toast}</span>
          </div>
        </div>
      )}
    </PactContext.Provider>
  );
}

export function usePact() {
  const context = useContext(PactContext);
  if (!context) {
    throw new Error("usePact must be used within a PactProvider");
  }
  return context;
}
