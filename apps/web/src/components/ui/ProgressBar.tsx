import React from "react";

export interface ProgressBarProps {
  value: number; // Current value or percentage
  max?: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ value, max = 100, label, className = "" }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  return (
    <div className={`w-full flex flex-col gap-2 ${className}`}>
      {label && (
        <div className="flex justify-between items-center text-xs sm:text-sm font-medium text-ink-600">
          <span>{label}</span>
          <span className="tabular-nums font-semibold text-ink-800">{percentage}%</span>
        </div>
      )}
      <div className="w-full h-3 bg-ice-100 rounded-pill overflow-hidden" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="h-full bg-teal-700 rounded-pill transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
