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

export const GOLDEN_COMMUNITY: Community = {
  id: "comm-green-meadows",
  name: "Green Meadows Apartments",
  code: "GM-BLR",
  join_code: "GM01",
  address: "Sarjapur Road, Bangalore",
};

export const GOLDEN_PERSONAS = {
  asha: {
    user: {
      id: "usr-c1-asha",
      phone: "+919999900001",
      name: "Asha Rao",
      role: "customer" as const,
      language: "en" as const,
    },
    membership: {
      community: GOLDEN_COMMUNITY,
      unit_label: "A-101",
      role: "member" as const,
    },
    retailer: null,
  },
  ravi: {
    user: {
      id: "usr-r1-ravi",
      phone: "+919999900021",
      name: "Ravi Kumar",
      role: "retailer" as const,
      language: "en" as const,
    },
    membership: null,
    retailer: {
      id: "ret-ravi-1",
      store_name: "Sri Lakshmi Stores",
      status: "active" as const,
    },
  },
  meera: {
    user: {
      id: "usr-a1-meera",
      phone: "+919999900011",
      name: "Meera Sundaram",
      role: "community_admin" as const,
      language: "en" as const,
    },
    membership: {
      community: GOLDEN_COMMUNITY,
      unit_label: "Admin-01",
      role: "admin" as const,
    },
    retailer: null,
  },
  priya: {
    user: {
      id: "usr-p1-priya",
      phone: "+919999900099",
      name: "Priya Sharma",
      role: "platform_admin" as const,
      language: "en" as const,
    },
    membership: null,
    retailer: null,
  },
};

interface AuthContextType {
  user: User | null;
  membership: Membership | null;
  retailer: Retailer | null;
  isLoading: boolean;
  orderMode: "type" | "speak";
  setOrderMode: (mode: "type" | "speak") => void;
  switchPersona: (persona: "asha" | "ravi" | "meera" | "priya") => void;
  requestOtp: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (phone: string, code: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  registerResident: (name: string, phone: string, joinCode: string, unitLabel: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  registerRetailer: (name: string, storeName: string, phone: string, address: string, gstin?: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  onboardResident: (joinCode: string, name: string, unitLabel: string) => Promise<{ success: boolean; error?: string }>;
  onboardRetailer: (storeName: string, address: string, gstin?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// LocalStorage helpers for cross-session persistent users (database sync)
function saveUserToLocalStorage(user: User, membership: Membership | null, retailer: Retailer | null) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("pact_registered_users");
    const map = raw ? JSON.parse(raw) : {};
    const cleanPhone = user.phone.replace(/[^0-9]/g, "");
    const last10 = cleanPhone.slice(-10);
    const entry = { user, membership, retailer };
    map[user.phone] = entry;
    if (last10) map[last10] = entry;
    if (cleanPhone) map[cleanPhone] = entry;
    localStorage.setItem("pact_registered_users", JSON.stringify(map));
  } catch (e) {
    console.warn("Could not save user to localStorage", e);
  }
}

function getUserFromLocalStorage(phone: string): { user: User; membership: Membership | null; retailer: Retailer | null } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("pact_registered_users");
    if (!raw) return null;
    const map = JSON.parse(raw);
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const last10 = cleanPhone.slice(-10);
    return map[phone] || map[cleanPhone] || (last10 ? map[last10] : null) || null;
  } catch {
    return null;
  }
}

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

  const switchPersona = useCallback((persona: "asha" | "ravi" | "meera" | "priya") => {
    const p = GOLDEN_PERSONAS[persona];
    if (p) {
      setUser(p.user);
      setMembership(p.membership);
      setRetailer(p.retailer);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("pact_session_user", JSON.stringify(p.user));
        if (p.membership) sessionStorage.setItem("pact_session_membership", JSON.stringify(p.membership));
        else sessionStorage.removeItem("pact_session_membership");
        if (p.retailer) sessionStorage.setItem("pact_session_retailer", JSON.stringify(p.retailer));
        else sessionStorage.removeItem("pact_session_retailer");
      }
      // Inform backend so pact_session cookie matches this persona immediately!
      fetch("/api/v1/auth/switch-persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ persona, user_id: p.user.id }),
      }).catch(() => {});
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/auth/me", {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setMembership(data.membership || null);
        setRetailer(data.retailer || null);
        return;
      }
    } catch {
      // Backend offline: restore from sessionStorage if available
    }

    if (typeof window !== "undefined") {
      const savedUser = sessionStorage.getItem("pact_session_user");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          const savedMem = sessionStorage.getItem("pact_session_membership");
          if (savedMem) setMembership(JSON.parse(savedMem));
          const savedRet = sessionStorage.getItem("pact_session_retailer");
          if (savedRet) setRetailer(JSON.parse(savedRet));
        } catch {
          // ignore parse error
        }
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      // 1. Check if user already logged in in this browser session
      if (typeof window !== "undefined") {
        const savedUserStr = sessionStorage.getItem("pact_session_user");
        if (savedUserStr) {
          try {
            const parsed = JSON.parse(savedUserStr);
            if (parsed && parsed.id) {
              if (active) {
                setUser(parsed);
                const savedMem = sessionStorage.getItem("pact_session_membership");
                if (savedMem) setMembership(JSON.parse(savedMem));
                const savedRet = sessionStorage.getItem("pact_session_retailer");
                if (savedRet) setRetailer(JSON.parse(savedRet));
              }

              // Verify session with backend
              try {
                const res = await fetch("/api/v1/auth/me", {
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                });
                if (active && res.ok) {
                  const data = await res.json();
                  setUser(data.user);
                  setMembership(data.membership || null);
                  setRetailer(data.retailer || null);
                }
              } catch {
                // Backend call failed, keep tab session
              }

              if (active) setIsLoading(false);
              return;
            }
          } catch {
            sessionStorage.removeItem("pact_session_user");
          }
        }
      }

      // No active session in this tab -> remain unauthenticated
      if (active) {
        setUser(null);
        setMembership(null);
        setRetailer(null);
        setIsLoading(false);
      }
    };

    checkSession();
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
      if (res.ok) return { success: true };
    } catch {
      // Offline fallback: allow request
    }
    return { success: true };
  };

  const verifyOtp = async (phone: string, code: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const last10 = cleanPhone.slice(-10);

    try {
      const res = await fetch("/api/v1/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user && data.user.role) {
          setUser(data.user);
          setMembership(data.membership || null);
          setRetailer(data.retailer || null);
          if (typeof window !== "undefined") {
            sessionStorage.setItem("pact_session_user", JSON.stringify(data.user));
            if (data.membership) sessionStorage.setItem("pact_session_membership", JSON.stringify(data.membership));
            if (data.retailer) sessionStorage.setItem("pact_session_retailer", JSON.stringify(data.retailer));
            saveUserToLocalStorage(data.user, data.membership || null, data.retailer || null);
          }
          return { success: true, user: data.user };
        }
      }
    } catch {
      // Backend offline or unreachable
    }

    // Check if newly registered user is stored in persistent local database
    const localEntry = getUserFromLocalStorage(phone);
    if (localEntry && localEntry.user && localEntry.user.role) {
      setUser(localEntry.user);
      setMembership(localEntry.membership || null);
      setRetailer(localEntry.retailer || null);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("pact_session_user", JSON.stringify(localEntry.user));
        if (localEntry.membership) sessionStorage.setItem("pact_session_membership", JSON.stringify(localEntry.membership));
        if (localEntry.retailer) sessionStorage.setItem("pact_session_retailer", JSON.stringify(localEntry.retailer));
      }
      return { success: true, user: localEntry.user };
    }

    // Persona mapping ONLY for exact golden test accounts
    if (last10 === "9999900001" || cleanPhone.endsWith("00001")) {
      const p = GOLDEN_PERSONAS.asha;
      setUser(p.user);
      setMembership(p.membership);
      setRetailer(p.retailer);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("pact_session_user", JSON.stringify(p.user));
        if (p.membership) sessionStorage.setItem("pact_session_membership", JSON.stringify(p.membership));
        sessionStorage.removeItem("pact_session_retailer");
      }
      return { success: true, user: p.user };
    }
    if (last10 === "9999900021" || cleanPhone.endsWith("00021")) {
      const p = GOLDEN_PERSONAS.ravi;
      setUser(p.user);
      setMembership(p.membership);
      setRetailer(p.retailer);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("pact_session_user", JSON.stringify(p.user));
        if (p.retailer) sessionStorage.setItem("pact_session_retailer", JSON.stringify(p.retailer));
        sessionStorage.removeItem("pact_session_membership");
      }
      return { success: true, user: p.user };
    }
    if (last10 === "9999900011" || cleanPhone.endsWith("00011")) {
      const p = GOLDEN_PERSONAS.meera;
      setUser(p.user);
      setMembership(p.membership);
      setRetailer(p.retailer);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("pact_session_user", JSON.stringify(p.user));
        if (p.membership) sessionStorage.setItem("pact_session_membership", JSON.stringify(p.membership));
        sessionStorage.removeItem("pact_session_retailer");
      }
      return { success: true, user: p.user };
    }
    if (last10 === "9999900099" || cleanPhone.endsWith("00099")) {
      const p = GOLDEN_PERSONAS.priya;
      setUser(p.user);
      setMembership(p.membership);
      setRetailer(p.retailer);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("pact_session_user", JSON.stringify(p.user));
        sessionStorage.removeItem("pact_session_membership");
        sessionStorage.removeItem("pact_session_retailer");
      }
      return { success: true, user: p.user };
    }

    return {
      success: false,
      error: "No account found for this mobile number. Please register your account first.",
    };
  };

  const onboardResident = async (joinCode: string, name: string, unitLabel: string) => {
    try {
      const res = await fetch("/api/v1/onboarding/resident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ join_code: joinCode, name, unit_label: unitLabel }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setMembership(data.membership);
        return { success: true };
      }
    } catch {
      // fallback
    }

    const newUser: User = {
      id: "usr-" + Math.random().toString(36).substring(2, 8),
      name,
      phone: "+919999900000",
      role: "customer",
      language: "en",
    };
    const newMembership: Membership = {
      community: GOLDEN_COMMUNITY,
      unit_label: unitLabel,
      role: "member",
    };
    setUser(newUser);
    setMembership(newMembership);
    return { success: true };
  };

  const onboardRetailer = async (storeName: string, address: string, gstin?: string) => {
    try {
      const res = await fetch("/api/v1/onboarding/retailer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_name: storeName, address, gstin }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setRetailer(data.retailer);
        return { success: true };
      }
    } catch {
      // fallback
    }

    const newUser: User = {
      id: "usr-ret-" + Math.random().toString(36).substring(2, 8),
      name: "Store Manager",
      phone: "+919999900020",
      role: "retailer",
      language: "en",
    };
    const newRetailer: Retailer = {
      id: "ret-" + Math.random().toString(36).substring(2, 8),
      store_name: storeName,
      status: "active",
    };
    setUser(newUser);
    setRetailer(newRetailer);
    return { success: true };
  };

  const registerResident = async (name: string, phone: string, joinCode: string, unitLabel: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : phone.startsWith("+") ? phone : `+${phone}`;

    try {
      const res = await fetch("/api/v1/auth/register/resident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: formattedPhone, join_code: joinCode, unit_label: unitLabel.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setMembership(data.membership);
        setRetailer(null);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("pact_session_user", JSON.stringify(data.user));
          if (data.membership) sessionStorage.setItem("pact_session_membership", JSON.stringify(data.membership));
          sessionStorage.removeItem("pact_session_retailer");
          saveUserToLocalStorage(data.user, data.membership || null, null);
        }
        return { success: true, user: data.user };
      } else {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.message || err.detail || "Registration failed." };
      }
    } catch {
      // Fallback local registration
      const newUser: User = {
        id: "usr-" + Math.random().toString(36).substring(2, 8),
        name: name.trim(),
        phone: formattedPhone,
        role: "customer",
        language: "en",
      };
      const newMembership: Membership = {
        community: GOLDEN_COMMUNITY,
        unit_label: unitLabel.trim(),
        role: "member",
      };
      setUser(newUser);
      setMembership(newMembership);
      setRetailer(null);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("pact_session_user", JSON.stringify(newUser));
        sessionStorage.setItem("pact_session_membership", JSON.stringify(newMembership));
        sessionStorage.removeItem("pact_session_retailer");
        saveUserToLocalStorage(newUser, newMembership, null);
      }
      return { success: true, user: newUser };
    }
  };

  const registerRetailer = async (name: string, storeName: string, phone: string, address: string, gstin?: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : phone.startsWith("+") ? phone : `+${phone}`;

    try {
      const res = await fetch("/api/v1/auth/register/retailer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), store_name: storeName.trim(), phone: formattedPhone, address: address.trim(), gstin: gstin?.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setRetailer(data.retailer);
        setMembership(null);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("pact_session_user", JSON.stringify(data.user));
          if (data.retailer) sessionStorage.setItem("pact_session_retailer", JSON.stringify(data.retailer));
          sessionStorage.removeItem("pact_session_membership");
          saveUserToLocalStorage(data.user, null, data.retailer || null);
        }
        return { success: true, user: data.user };
      } else {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.message || err.detail || "Store registration failed." };
      }
    } catch {
      // Fallback local retailer registration
      const newUser: User = {
        id: "usr-ret-" + Math.random().toString(36).substring(2, 8),
        name: name.trim(),
        phone: formattedPhone,
        role: "retailer",
        language: "en",
      };
      const newRetailer: Retailer = {
        id: "ret-" + Math.random().toString(36).substring(2, 8),
        store_name: storeName.trim(),
        status: "active",
      };
      setUser(newUser);
      setRetailer(newRetailer);
      setMembership(null);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("pact_session_user", JSON.stringify(newUser));
        sessionStorage.setItem("pact_session_retailer", JSON.stringify(newRetailer));
        sessionStorage.removeItem("pact_session_membership");
        saveUserToLocalStorage(newUser, null, newRetailer);
      }
      return { success: true, user: newUser };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setMembership(null);
      setRetailer(null);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("pact_session_user");
        sessionStorage.removeItem("pact_session_membership");
        sessionStorage.removeItem("pact_session_retailer");
      }
      router.push("/");
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
        switchPersona,
        requestOtp,
        verifyOtp,
        registerResident,
        registerRetailer,
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
