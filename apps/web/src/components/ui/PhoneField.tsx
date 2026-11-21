import React from "react";

export interface PhoneFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "prefix"> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  error?: string;
}

export const PhoneField = React.forwardRef<HTMLInputElement, PhoneFieldProps>(
  ({ label, value, onChange, helperText, error, id, className = "", ...props }, ref) => {
    const inputId = id || `phone-field-${label.toLowerCase().replace(/\s+/g, "-")}`;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Strip any non-digit
      const rawDigits = e.target.value.replace(/\D/g, "").slice(0, 10);
      onChange(rawDigits);
    };

    return (
      <div className="w-full flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-ink-800 select-none block">
          {label}
        </label>

        <div
          className={`flex items-center h-[52px] px-3.5 bg-white border rounded-ctl transition-colors duration-150 ${
            error
              ? "border-danger-700 text-danger-700"
              : "border-ink-400 focus-within:border-teal-700 focus-within:ring-2 focus-within:ring-teal-700 focus-within:ring-offset-1"
          } ${className}`}
        >
          {/* Fixed +91 prefix per U5 */}
          <div className="flex items-center gap-1 pr-3 mr-3 border-r border-ice-300 text-ink-600 font-medium select-none text-base">
            <span>🇮🇳</span>
            <span>+91</span>
          </div>

          <input
            id={inputId}
            ref={ref}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={10}
            value={value}
            onChange={handleInputChange}
            placeholder="99999 00001"
            className="w-full h-full bg-transparent text-ink-800 text-base placeholder:text-ink-400 focus:outline-none tabular-nums tracking-wide font-medium"
            {...props}
          />
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

PhoneField.displayName = "PhoneField";
