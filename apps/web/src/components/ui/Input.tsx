"use client";

import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leadingIcon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leadingIcon,
      leftIcon,
      trailingIcon,
      fullWidth = true,
      disabled = false,
      id,
      className = "",
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
    const resolvedLeadingIcon = leadingIcon || leftIcon;

    return (
      <div className={`flex flex-col gap-1.5 ${fullWidth ? "w-full" : "w-auto"}`}>
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text select-none block">
            {label}
          </label>
        )}

        <div
          className={`relative flex items-center h-[48px] px-3.5 bg-surface border rounded-ctl transition-colors duration-150 ${
            error
              ? "border-danger-700 text-danger-700"
              : disabled
              ? "border-border bg-background text-muted cursor-not-allowed"
              : "border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
          } ${className}`}
        >
          {resolvedLeadingIcon && (
            <span className="shrink-0 text-muted mr-2 flex items-center">{resolvedLeadingIcon}</span>
          )}

          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className="w-full h-full bg-transparent text-text text-base placeholder:text-muted focus:outline-none disabled:cursor-not-allowed"
            {...props}
          />

          {trailingIcon && (
            <span className="shrink-0 text-muted ml-2 flex items-center">{trailingIcon}</span>
          )}
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

Input.displayName = "Input";
