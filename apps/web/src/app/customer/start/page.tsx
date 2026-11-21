"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { copy } from "@/lib/copy/en";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Keyboard, Mic } from "lucide-react";

export default function CustomerStartPage() {
  const router = useRouter();
  const { setOrderMode } = useAuth();

  const handleSelectMode = (mode: "type" | "speak") => {
    setOrderMode(mode);
    router.push("/customer");
  };

  return (
    <ProtectedRoute allowedRoles={["customer"]}>
      <div className="min-h-screen bg-ice-50 flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="w-full max-w-[480px] space-y-6">
          <div className="text-center space-y-2">
            <Logo size="md" />
            <h1 className="font-display text-2xl sm:text-3xl text-ink-800 pt-2">
              {copy.customerStart.title}
            </h1>
            <p className="text-xs text-ink-600">
              {copy.customerStart.subtitle}
            </p>
          </div>

          <div className="space-y-4">
            {/* Card 1: Type & tap */}
            <button
              type="button"
              onClick={() => handleSelectMode("type")}
              className="w-full p-6 rounded-card border-2 border-ice-300 hover:border-teal-700 bg-white hover:bg-ice-50 transition-all text-left flex items-start gap-4 focus-ring cursor-pointer group shadow-xs"
            >
              <div className="w-14 h-14 rounded-full bg-ice-100 flex items-center justify-center text-teal-700 group-hover:bg-ice-200 transition-colors shrink-0">
                <Keyboard className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="font-display text-xl text-ink-800">
                  {copy.customerStart.typeTitle}
                </h3>
                <p className="text-xs sm:text-sm text-ink-600 leading-relaxed">
                  {copy.customerStart.typeDesc}
                </p>
              </div>
            </button>

            {/* Card 2: Speak */}
            <button
              type="button"
              onClick={() => handleSelectMode("speak")}
              className="w-full p-6 rounded-card border-2 border-ice-300 hover:border-teal-700 bg-white hover:bg-ice-50 transition-all text-left flex items-start gap-4 focus-ring cursor-pointer group shadow-xs"
            >
              <div className="w-14 h-14 rounded-full bg-ice-100 flex items-center justify-center text-teal-700 group-hover:bg-ice-200 transition-colors shrink-0">
                <Mic className="w-7 h-7 stroke-[2]" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="font-display text-xl text-ink-800">
                  {copy.customerStart.speakTitle}
                </h3>
                <p className="text-xs sm:text-sm text-ink-600 leading-relaxed">
                  {copy.customerStart.speakDesc}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
