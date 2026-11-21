"use client";

import React from "react";
import { Minus, Plus, Trash2 } from "lucide-react";

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  disabled = false,
  className = "",
}: StepperProps) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  const isAtOne = value === 1;

  return (
    <div
      className={`inline-flex items-center h-12 bg-white border border-ink-400 rounded-ctl select-none overflow-hidden ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      } ${className}`}
    >
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={handleDecrement}
        aria-label={isAtOne ? "Remove item" : "Decrease quantity"}
        className="w-12 h-12 flex items-center justify-center text-ink-800 hover:bg-ice-100 active:bg-ice-200 transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed focus-ring"
      >
        {isAtOne ? (
          <Trash2 className="w-4 h-4 text-danger-700" />
        ) : (
          <Minus className="w-4 h-4" />
        )}
      </button>

      <span className="min-w-8 text-center font-bold text-base tabular-nums px-1 text-ink-800">
        {value}
      </span>

      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={handleIncrement}
        aria-label="Increase quantity"
        className="w-12 h-12 flex items-center justify-center text-ink-800 hover:bg-ice-100 active:bg-ice-200 transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed focus-ring"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
