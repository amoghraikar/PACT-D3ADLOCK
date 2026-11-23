"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  durationMs: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", durationMs: number = 4000) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      setToasts((prev) => [...prev, { id, message, type, durationMs }]);

      setTimeout(() => {
        removeToast(id);
      }, durationMs);
    },
    [removeToast]
  );

  const success = useCallback((msg: string) => showToast(msg, "success"), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, "error"), [showToast]);
  const warning = useCallback((msg: string) => showToast(msg, "warning"), [showToast]);
  const info = useCallback((msg: string) => showToast(msg, "info"), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      {/* Toast Notification Container */}
      <div
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const icon =
            t.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-success-700 shrink-0" />
            ) : t.type === "error" ? (
              <AlertCircle className="w-5 h-5 text-danger-700 shrink-0" />
            ) : t.type === "warning" ? (
              <AlertTriangle className="w-5 h-5 text-warning-700 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-primary shrink-0" />
            );

          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-center justify-between gap-3 p-3.5 bg-surface text-text rounded-ctl border border-border shadow-[var(--shadow-float)] transition-all animate-in fade-in slide-in-from-bottom-2 duration-150"
            >
              <div className="flex items-center gap-2.5">
                {icon}
                <span className="text-sm font-medium leading-snug">{t.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="p-1 text-muted hover:text-text rounded-md focus-ring cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
