import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "quiet" | "danger" | "outline";
  size?: "default" | "sm";
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "default",
      isLoading = false,
      fullWidth = false,
      disabled = false,
      icon,
      className = "",
      ...props
    },
    ref
  ) => {
    // Height & padding rules per U4 / U5
    const sizeClasses = size === "default" ? "h-[52px] px-6 text-base" : "h-[44px] px-4 text-sm";

    // Variant color mappings from U2 tokens
    const variantClasses = {
      primary:
        "bg-ink-800 text-white hover:bg-ink-900 active:bg-ink-900 disabled:bg-ice-100 disabled:text-ink-400",
      secondary:
        "bg-white text-ink-800 border border-ink-800 hover:bg-ice-100 active:bg-ice-200 disabled:bg-ice-100 disabled:border-ice-300 disabled:text-ink-400",
      outline:
        "bg-white text-ink-800 border border-border hover:bg-background active:bg-ice-100 disabled:bg-ice-100 disabled:border-border disabled:text-ink-400",
      quiet:
        "bg-transparent text-teal-700 hover:bg-ice-100 active:bg-ice-200 disabled:text-ink-400 disabled:hover:bg-transparent",
      danger:
        "bg-danger-700 text-white hover:opacity-90 active:opacity-100 disabled:bg-ice-100 disabled:text-ink-400",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center gap-2 rounded-ctl font-medium transition-all duration-150 select-none cursor-pointer disabled:cursor-not-allowed focus-ring ${sizeClasses} ${variantClasses[variant]} ${
          fullWidth ? "w-full" : ""
        } ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
        {!isLoading && icon && <span className="inline-flex shrink-0">{icon}</span>}
        <span>{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";
