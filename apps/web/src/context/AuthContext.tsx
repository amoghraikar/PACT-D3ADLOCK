"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { UserSummary, UserRole, OtpRequestResponse, AuthTokenResponse } from "@/types/auth";
import { authService } from "@/services/auth.service";
import { getAuthToken, setAuthToken } from "@/services/api-client";

interface AuthContextType {
  user: UserSummary | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  requestOtp: (phone: string) => Promise<OtpRequestResponse>;
  verifyOtp: (phone: string, otp: string) => Promise<AuthTokenResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    const currentToken = getAuthToken();
    if (!currentToken) {
      setUser(null);
      setTokenState(null);
      setIsLoading(false);
      return;
    }

    try {
      setTokenState(currentToken);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
      setTokenState(null);
      setAuthToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const currentToken = getAuthToken();
      if (!currentToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const currentUser = await authService.getCurrentUser();
        if (isMounted) {
          setTokenState(currentToken);
          setUser(currentUser);
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setTokenState(null);
          setAuthToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void initAuth();

    // Listen for unauthorized 401 events from api-client
    const handleUnauthorized = () => {
      setUser(null);
      setTokenState(null);
      setAuthToken(null);
    };

    window.addEventListener("pact:unauthorized", handleUnauthorized);
    return () => {
      isMounted = false;
      window.removeEventListener("pact:unauthorized", handleUnauthorized);
    };
  }, []);

  const requestOtp = async (phone: string): Promise<OtpRequestResponse> => {
    return authService.requestOtp(phone);
  };

  const verifyOtp = async (phone: string, otp: string): Promise<AuthTokenResponse> => {
    const result = await authService.verifyOtp(phone, otp);
    setTokenState(result.access_token);
    setUser(result.user);
    return result;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setTokenState(null);
      setAuthToken(null);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    role: user?.role || null,
    requestOtp,
    verifyOtp,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
