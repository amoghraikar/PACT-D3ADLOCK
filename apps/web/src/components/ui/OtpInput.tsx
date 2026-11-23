"use client";

import React, { useRef, useEffect } from "react";

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  error?: string;
  autoFocus?: boolean;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  error,
  autoFocus = true,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const digits = value.split("").slice(0, length);
  while (digits.length < length) {
    digits.push("");
  }

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const char = e.target.value.slice(-1);
    if (!/^\d*$/.test(char)) return;

    const newDigits = [...digits];
    newDigits[index] = char;
    const newValue = newDigits.join("");
    onChange(newValue);

    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text/plain").replace(/\D/g, "").slice(0, length);
    if (pasted) {
      onChange(pasted);
      const focusIndex = Math.min(pasted.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
        {digits.map((digit, index) => {
          const isFocused = !disabled && digit === "" && (index === 0 || digits[index - 1] !== "");
          return (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              autoComplete={index === 0 ? "one-time-code" : "off"}
              value={digit}
              disabled={disabled}
              onChange={(e) => handleChange(index, e)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              aria-label={`Digit ${index + 1} of ${length}`}
              className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-bold text-2xl tabular-nums rounded-ctl border bg-white text-ink-800 transition-colors duration-150 focus:outline-none ${
                error
                  ? "border-danger-700 text-danger-700"
                  : isFocused
                    ? "border-teal-700 ring-2 ring-teal-700 ring-offset-1"
                    : "border-ink-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700 focus:ring-offset-1"
              }`}
            />
          );
        })}
      </div>
      {error && <p className="text-xs text-danger-700 font-medium">{error}</p>}
    </div>
  );
}

export const OTPInput = OtpInput;
export type OTPInputProps = OtpInputProps;

