"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  isConfirmLoading?: boolean;
  isDestructive?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  isConfirmLoading = false,
  isDestructive = false,
  size = "md",
}: ModalProps) {
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

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Card */}
      <div
        className={`relative z-10 w-full ${sizeClasses[size]} bg-surface rounded-card border border-border shadow-[var(--shadow-float)] p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-150`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 id="modal-title" className="font-display text-xl text-text leading-snug">
              {title}
            </h3>
            {description && <p className="text-sm text-muted">{description}</p>}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-ctl text-muted hover:text-text hover:bg-background transition-colors focus-ring cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {children && <div className="py-2 text-sm text-text">{children}</div>}

        {(onConfirm || confirmLabel) && (
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button variant="quiet" size="sm" onClick={onClose} disabled={isConfirmLoading}>
              {cancelLabel}
            </Button>
            <Button
              variant={isDestructive ? "danger" : "primary"}
              size="sm"
              onClick={onConfirm}
              isLoading={isConfirmLoading}
            >
              {confirmLabel || "Confirm"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
