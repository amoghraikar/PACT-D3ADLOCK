import React from "react";

export interface TextFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label: string;
  helperText?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, helperText, error, prefix, suffix, id, className = "", ...props }, ref) => {
    const inputId = id || `field-${label.toLowerCase().replace(/\s+/g, "-")}`;

    return (
      <div className="w-full flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-ink-800 select-none block"
        >
          {label}
        </label>

        <div
          className={`flex items-center gap-2 h-[52px] px-3.5 bg-white border rounded-ctl transition-colors duration-150 ${error
            ? "border-danger-700 text-danger-700"
            : "border-ink-400 focus-within:border-teal-700 focus-within:ring-2 focus-within:ring-teal-700 focus-within:ring-offset-1"
            } ${className}`}
        >
          {prefix && <div className="shrink-0 text-ink-600">{prefix}</div>}
          <input
            id={inputId}
            ref={ref}
            className="w-full h-full bg-transparent text-ink-800 text-base placeholder:text-ink-400 focus:outline-none"
            {...props}
          />
          {suffix && <div className="shrink-0 text-ink-600">{suffix}</div>}
        </div>

        {error ? (
          <p className="text-xs text-danger-700 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-ink-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

TextField.displayName = "TextField";
