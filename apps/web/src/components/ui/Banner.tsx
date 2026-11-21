import React from "react";
import { Info, AlertTriangle, AlertCircle } from "lucide-react";

export type BannerKind = "info" | "warning" | "danger";

export interface BannerProps {
  kind?: BannerKind;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function Banner({
  kind = "info",
  message,
  actionLabel,
  onAction,
  className = "",
}: BannerKind extends never ? never : BannerProps) {
  const styles = {
    info: {
      bg: "bg-ice-200 text-ink-800 border-ice-300",
      icon: <Info className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />,
      actionText: "text-teal-700 hover:underline",
    },
    warning: {
      bg: "bg-warning-100 text-warning-700 border-warning-100",
      icon: <AlertTriangle className="w-5 h-5 text-warning-700 shrink-0 mt-0.5" />,
      actionText: "text-warning-700 underline font-semibold",
    },
    danger: {
      bg: "bg-danger-100 text-danger-700 border-danger-100",
      icon: <AlertCircle className="w-5 h-5 text-danger-700 shrink-0 mt-0.5" />,
      actionText: "text-danger-700 underline font-semibold",
    },
  };

  const current = styles[kind];

  return (
    <div
      className={`w-full flex items-start gap-3 p-3.5 sm:p-4 rounded-ctl border text-sm leading-snug ${current.bg} ${className}`}
      role="alert"
    >
      {current.icon}
      <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="font-medium">{message}</span>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className={`text-xs font-semibold shrink-0 cursor-pointer focus-ring rounded-sm ${current.actionText}`}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
