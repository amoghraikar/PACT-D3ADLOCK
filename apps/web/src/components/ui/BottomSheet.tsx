"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showHandle?: boolean;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  showHandle = true,
}: BottomSheetProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Slide-Up Sheet */}
      <div className="relative z-10 w-full max-w-lg bg-surface border-t border-x border-border rounded-t-card shadow-[var(--shadow-float)] max-h-[85vh] flex flex-col pb-safe animate-in slide-in-from-bottom duration-200">
        {showHandle && (
          <div className="pt-3 pb-1 flex justify-center">
            <div className="w-12 h-1.5 bg-border rounded-pill" />
          </div>
        )}

        {title && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-border">
            <h3 className="font-display text-lg text-text">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close bottom sheet"
              className="p-1 rounded-ctl text-muted hover:text-text hover:bg-background transition-colors focus-ring cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
