import React from "react";
import { Package } from "lucide-react";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
  className = "",
}: EmptyStateProps) {
  const displayIcon = icon || <Package className="w-8 h-8 text-muted" />;
  const resolvedLabel = action?.label || actionLabel;
  const resolvedAction = action?.onClick || onAction;

  return (
    <div
      className={`w-full flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-ice-300 rounded-card bg-white relative overflow-hidden ${className}`}
    >
      {/* Decorative architectural stripe band behind art */}
      <div className="absolute inset-x-0 top-0 h-24 bg-stripes opacity-40 pointer-events-none" />

      {/* Ink Glyph in circular badge */}
      <div className="relative z-10 w-16 h-16 rounded-full bg-ice-100 border border-ice-300 flex items-center justify-center text-ink-800 mb-4 shadow-xs">
        {displayIcon}
      </div>

      {/* Serif Title */}
      <h3 className="relative z-10 font-display text-2xl text-ink-800 mb-2 max-w-md">{title}</h3>

      {/* One explanatory sentence */}
      <p className="relative z-10 text-sm text-ink-600 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {/* Action Button */}
      {resolvedLabel && resolvedAction && (
        <div className="relative z-10">
          <Button variant="primary" onClick={resolvedAction}>
            {resolvedLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
