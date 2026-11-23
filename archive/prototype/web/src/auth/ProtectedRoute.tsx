"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/Skeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("customer" | "retailer" | "community_admin" | "platform_admin")[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    // Role redirection if not in onboarding
    if (!user.role) {
      router.push("/onboarding");
      return;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      // Redirect to own home workspace per P05
      if (user.role === "customer") {
        router.push("/customer");
      } else if (user.role === "retailer") {
        router.push("/retailer");
      } else if (user.role === "community_admin") {
        router.push("/admin");
      } else if (user.role === "platform_admin") {
        router.push("/platform");
      }
    }
  }, [user, isLoading, allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ice-50 p-6 flex flex-col items-center justify-center space-y-4">
        <Skeleton width={120} height={40} />
        <Skeleton width={260} height={20} />
        <div className="w-full max-w-md space-y-3 pt-4">
          <Skeleton height={52} className="w-full" />
          <Skeleton height={52} className="w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles && user.role && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
