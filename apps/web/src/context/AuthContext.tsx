import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ROLES, type RoleName, type UserSummaryDTO } from "@pact/shared";
import { getStoredToken, setStoredToken } from "@/lib/api";
import { authService } from "@/lib/services";

interface AuthContextValue {
  user: UserSummaryDTO | null;
  isLoading: boolean;
  setAuthenticatedSession: (token: string, user: UserSummaryDTO) => void;
  refreshUser: () => Promise<UserSummaryDTO | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function homeForRole(role: RoleName): string {
  switch (role) {
    case ROLES.RETAILER:
      return "/retailer";
    case ROLES.COMMUNITY_ADMIN:
      return "/admin";
    case ROLES.PLATFORM_ADMIN:
      return "/platform";
    case ROLES.CUSTOMER:
    default:
      return "/customer";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSummaryDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async (): Promise<UserSummaryDTO | null> => {
    try {
      const profile = await authService.me();
      setUser(profile);
      return profile;
    } catch {
      setUser(null);
      setStoredToken(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      const token = getStoredToken();
      if (!token) {
        if (active) setIsLoading(false);
        return;
      }
      try {
        const profile = await authService.me();
        if (active) setUser(profile);
      } catch {
        setStoredToken(null);
        if (active) setUser(null);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, []);

  const setAuthenticatedSession = useCallback((token: string, nextUser: UserSummaryDTO) => {
    setStoredToken(token);
    setUser(nextUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors during logout
    } finally {
      setStoredToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, setAuthenticatedSession, refreshUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
