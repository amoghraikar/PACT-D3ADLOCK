import React from "react";
import { Check, Clock, AlertTriangle, AlertCircle, Info } from "lucide-react";

export type StatusPillKind = "neutral" | "info" | "success" | "warning" | "danger";

export interface StatusPillProps {
  kind?: StatusPillKind;
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatusPill({ kind = "neutral", label, icon, className = "" }: StatusPillProps) {
  const kindClasses = {
    neutral: "bg-ice-100 text-ink-800",
    info: "bg-ice-200 text-teal-700",
    success: "bg-success-100 text-success-700",
    warning: "bg-warning-100 text-warning-700",
    danger: "bg-danger-100 text-danger-700",
  };

  const defaultIcons = {
    neutral: <Info className="w-3.5 h-3.5" />,
    info: <Clock className="w-3.5 h-3.5" />,
    success: <Check className="w-3.5 h-3.5 stroke-[2.5]" />,
    warning: <AlertTriangle className="w-3.5 h-3.5" />,
    danger: <AlertCircle className="w-3.5 h-3.5" />,
  };

  const displayIcon = icon !== undefined ? icon : defaultIcons[kind];

  return (
    <span
      className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-pill text-xs font-semibold select-none whitespace-nowrap ${kindClasses[kind]} ${className}`}
    >
      {displayIcon && <span className="shrink-0">{displayIcon}</span>}
      <span>{label}</span>
    </span>
  );
}
