import React from "react";
import { formatPaise } from "@/lib/format";

export interface MoneyTextProps {
  paise: number | bigint;
  approx?: boolean;
  size?: "sm" | "base" | "lg" | "xl" | "display";
  strikeThrough?: boolean;
  className?: string;
}

export function MoneyText({
  paise,
  approx = false,
  size = "base",
  strikeThrough = false,
  className = "",
}: MoneyTextProps) {
  const formatted = formatPaise(paise, { approx });

  const sizeClasses = {
    sm: "text-sm",
    base: "text-base font-semibold",
    lg: "text-xl font-bold",
    xl: "text-2xl sm:text-3xl font-bold",
    display: "text-3xl sm:text-4xl font-bold tracking-tight",
  };

  return (
    <span
      className={`tabular-nums ${sizeClasses[size]} ${
        strikeThrough ? "line-through text-ink-400 font-normal" : "text-ink-800"
      } ${className}`}
    >
      {formatted}
    </span>
  );
}
