"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface User {
  id: string;
  phone: string;
  name: string;
  role: "customer" | "retailer" | "community_admin" | "platform_admin" | null;
  language: "en" | "hi";
}

export interface Community {
  id: string;
  name: string;
  code: string;
  join_code: string;
  address: string;
}

export interface Membership {
  community: Community;
  unit_label: string;
  role: "member" | "admin";
}

export interface Retailer {
  id: string;
  store_name: string;
  status: "pending" | "active" | "suspended";
}

interface AuthContextType {
  user: User | null;
  membership: Membership | null;
  retailer: Retailer | null;
  isLoading: boolean;
  orderMode: "type" | "speak";
  setOrderMode: (mode: "type" | "speak") => void;
  requestOtp: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (phone: string, code: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  onboardResident: (joinCode: string, name: string, unitLabel: string) => Promise<{ success: boolean; error?: string }>;
  onboardRetailer: (storeName: string, address: string, gstin?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orderMode, setOrderModeState] = useState<"type" | "speak">(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("pact_order_mode");
      if (saved === "type" || saved === "speak") return saved;
    }
    return "type";
  });
  const router = useRouter();

  const setOrderMode = useCallback((mode: "type" | "speak") => {
    setOrderModeState(mode);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pact_order_mode", mode);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/auth/me", {
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setMembership(data.membership || null);
        setRetailer(data.retailer || null);
      } else {
        setUser(null);
        setMembership(null);
        setRetailer(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const fetchAuth = async () => {
      try {
        const res = await fetch("/api/v1/auth/me", {
          headers: { "Content-Type": "application/json" },
        });
        if (active) {
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            setMembership(data.membership || null);
            setRetailer(data.retailer || null);
          } else {
            setUser(null);
            setMembership(null);
            setRetailer(null);
          }
          setIsLoading(false);
        }
      } catch {
        if (active) {
          setUser(null);
          setIsLoading(false);
        }
      }
    };
    fetchAuth();
    return () => {
      active = false;
    };
  }, []);

  const requestOtp = async (phone: string) => {
    try {
      const res = await fetch("/api/v1/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err?.error?.message || "Could not send verification code" };
      }
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const verifyOtp = async (phone: string, code: string) => {
    try {
      const res = await fetch("/api/v1/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err?.error?.message || "Invalid or expired code" };
      }
      const data = await res.json();
      setUser(data.user);
      setMembership(data.membership || null);
      setRetailer(data.retailer || null);
      return { success: true, user: data.user };
    } catch {
      return { success: false, error: "Network error. Please check connection." };
    }
  };

  const onboardResident = async (joinCode: string, name: string, unitLabel: string) => {
    try {
      const res = await fetch("/api/v1/onboarding/resident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ join_code: joinCode, name, unit_label: unitLabel }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err?.error?.message || "Could not join building" };
      }
      const data = await res.json();
      setUser(data.user);
      setMembership(data.membership);
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const onboardRetailer = async (storeName: string, address: string, gstin?: string) => {
    try {
      const res = await fetch("/api/v1/onboarding/retailer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_name: storeName, address, gstin }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err?.error?.message || "Could not register store" };
      }
      const data = await res.json();
      setUser(data.user);
      setRetailer(data.retailer);
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setMembership(null);
      setRetailer(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        membership,
        retailer,
        isLoading,
        orderMode,
        setOrderMode,
        requestOtp,
        verifyOtp,
        onboardResident,
        onboardRetailer,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
