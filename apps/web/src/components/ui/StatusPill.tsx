import React from "react";
import { Check, Clock, AlertTriangle, AlertCircle, Info } from "lucide-react";

export type StatusPillKind = "neutral" | "info" | "success" | "warning" | "danger";

export interface StatusPillProps {
  kind?: StatusPillKind;
  label?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  size?: "sm" | "default";
  className?: string;
}

export function StatusPill({
  kind = "neutral",
  label,
  children,
  icon,
  size = "default",
  className = "",
}: StatusPillProps) {
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
  const sizeClass = size === "sm" ? "h-6 px-2.5 text-[11px]" : "h-7 px-3 text-xs";
  const content = children || label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill font-semibold select-none whitespace-nowrap ${sizeClass} ${kindClasses[kind]} ${className}`}
    >
      {displayIcon && <span className="shrink-0">{displayIcon}</span>}
      <span>{content}</span>
    </span>
  );
}
