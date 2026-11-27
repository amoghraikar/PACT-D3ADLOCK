import React, { useState } from "react";
import { Loader2, Package, X } from "lucide-react";
import { formatPaise } from "@pact/shared";

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  fullWidth = false,
  className = "",
  disabled,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  fullWidth?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center font-medium rounded-ctl transition-colors focus-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-hover",
    outline: "bg-surface border border-border text-text hover:bg-background",
    ghost: "bg-transparent text-text hover:bg-background",
    danger: "bg-danger-700 text-white hover:opacity-90",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-5 text-sm",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
}

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`bg-surface border border-border rounded-card ${className}`}>{children}</div>
  );
}

export function Input({
  label,
  error,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-medium text-text">{label}</label>}
      <input
        className={`w-full h-10 px-3 bg-surface border border-border rounded-ctl text-sm text-text placeholder:text-muted focus-ring ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-danger-700">{error}</p>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const upper = status.toUpperCase();
  let tone = "bg-background text-muted border-border";
  if (["OPEN", "PAID", "COMPLETED", "HANDED_OVER", "CONNECTED", "ACTIVE", "MATCHED"].includes(upper)) {
    tone = "bg-success-100 text-success-700 border-success-700/20";
  } else if (["PENDING", "LOCKED", "ACCEPTED", "PACKING", "IN_TRANSIT", "PARTIALLY_PAID", "NEEDS_CLARIFICATION", "AMBIGUOUS"].includes(upper)) {
    tone = "bg-warning-100 text-warning-700 border-warning-700/20";
  } else if (["BILLED", "DISPATCHED", "PROCESSING"].includes(upper)) {
    tone = "bg-info-100 text-info-700 border-info-700/20";
  } else if (["REJECTED", "UNPAID", "FAILED", "UNAVAILABLE", "UNMATCHED", "VOID"].includes(upper)) {
    tone = "bg-danger-100 text-danger-700 border-danger-700/20";
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-[11px] font-semibold border tracking-wide uppercase ${tone}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function Money({
  paise,
  approx = false,
  className = "",
}: {
  paise: number | null | undefined;
  approx?: boolean;
  className?: string;
}) {
  return <span className={`tabular-nums ${className}`}>{formatPaise(paise, { approx })}</span>;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
      <div>
        <h1 className="text-2xl font-serif text-text tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="p-10 text-center flex flex-col items-center justify-center space-y-3">
      <div className="w-11 h-11 rounded-full bg-background border border-border flex items-center justify-center text-muted">
        <Package className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-text">{title}</h3>
        <p className="text-sm text-muted max-w-md mx-auto mt-1">{description}</p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </Card>
  );
}

export function Skeleton({ className = "h-24 w-full" }: { className?: string }) {
  return <div className={`animate-pulse bg-border/60 rounded-card ${className}`} />;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text/40 p-4">
      <div className="bg-surface border border-border rounded-card w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-ctl text-muted hover:text-text cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ProductThumb({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="w-full h-36 bg-background border-b border-border flex items-center justify-center text-muted">
        <Package className="w-8 h-8 opacity-40" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="w-full h-36 object-cover bg-background border-b border-border"
    />
  );
}
