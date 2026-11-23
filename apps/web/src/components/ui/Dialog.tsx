"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string; // The question, e.g. "Finalise this month's bill?"
  description?: string; // The consequence, e.g. "This locks amounts and notifies 4 neighbours."
  confirmLabel?: string; // Action verb, e.g. "Finalise bill"
  cancelLabel?: string; // Back verb, e.g. "Go back"
  onConfirm?: () => void;
  isConfirmLoading?: boolean;
  isDestructive?: boolean;
  children?: React.ReactNode;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Go back",
  onConfirm,
  isConfirmLoading = false,
  isDestructive = false,
  children,
}: DialogProps) {
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink-900/40 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      {/* Backdrop tap to close */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal / Bottom Sheet Box */}
      <div className="relative z-10 w-full sm:max-w-md bg-white rounded-t-card sm:rounded-card border border-ice-300 shadow-[var(--shadow-float)] p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-4">
          <h3
            id="dialog-title"
            className="font-display text-xl sm:text-2xl text-ink-800 leading-snug"
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-ctl text-ink-500 hover:text-ink-800 hover:bg-ice-100 transition-colors focus-ring"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {description && <p className="text-sm text-ink-600 leading-relaxed">{description}</p>}

        {children && <div className="py-2">{children}</div>}

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isConfirmLoading}>
            {cancelLabel}
          </Button>
          {onConfirm && (
            <Button
              variant={isDestructive ? "danger" : "primary"}
              onClick={onConfirm}
              isLoading={isConfirmLoading}
            >
              {confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
