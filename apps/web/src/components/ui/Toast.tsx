"use client";

import React, { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

export interface ToastProps {
  message: string;
  isOpen: boolean;
  onClose: () => void;
  undoLabel?: string;
  onUndo?: () => void;
  durationMs?: number;
}

export function Toast({
  message,
  isOpen,
  onClose,
  undoLabel = "Undo",
  onUndo,
  durationMs = 5000,
}: ToastProps) {
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      onClose();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [isOpen, durationMs, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-ink-800 text-white rounded-ctl shadow-[var(--shadow-float)] border border-ink-600 animate-in fade-in slide-in-from-bottom-2 duration-150 select-none max-w-[90vw]"
      role="status"
      aria-live="polite"
    >
      <CheckCircle2 className="w-5 h-5 text-teal-700 shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      {onUndo && (
        <button
          type="button"
          onClick={() => {
            onUndo();
            onClose();
          }}
          className="ml-2 px-2 py-0.5 text-xs font-bold text-ice-200 hover:text-white uppercase tracking-wider rounded-sm focus-ring cursor-pointer"
        >
          {undoLabel}
        </button>
      )}
    </div>
  );
}
