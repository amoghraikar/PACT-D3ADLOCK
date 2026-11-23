"use client";

import React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  helperText?: string;
  error?: string;
  placeholder?: string;
  fullWidth?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      helperText,
      error,
      placeholder,
      fullWidth = true,
      disabled = false,
      id,
      className = "",
      value,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

    return (
      <div className={`flex flex-col gap-1.5 ${fullWidth ? "w-full" : "w-auto"}`}>
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-text select-none block">
            {label}
          </label>
        )}

        <div className="relative w-full">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            value={value}
            defaultValue={defaultValue}
            className={`w-full appearance-none h-[48px] pl-3.5 pr-10 bg-surface border rounded-ctl text-base text-text transition-colors duration-150 focus:outline-none ${
              error
                ? "border-danger-700"
                : disabled
                ? "border-border bg-background text-muted cursor-not-allowed"
                : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
            } ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>

          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
        </div>

        {error ? (
          <p className="text-xs text-danger-700 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = "Select";
