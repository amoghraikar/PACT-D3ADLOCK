"use client";

import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

export interface SearchBarProps {
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  debounceMs?: number;
  className?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  placeholder = "Search groceries (e.g. rice, atta, sugar)...",
  value: controlledValue,
  defaultValue = "",
  onChange,
  onSearch,
  debounceMs = 300,
  className = "",
  autoFocus = false,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const query = isControlled ? controlledValue : internalValue;

  useEffect(() => {
    if (!onSearch) return;

    const timer = setTimeout(() => {
      onSearch(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs, onSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    if (!isControlled) {
      setInternalValue(nextVal);
    }
    onChange?.(nextVal);
  };

  const handleClear = () => {
    if (!isControlled) {
      setInternalValue("");
    }
    onChange?.("");
    onSearch?.("");
  };

  return (
    <div
      className={`relative flex items-center h-[48px] px-3.5 bg-surface border border-border rounded-ctl focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-150 ${className}`}
    >
      <Search className="w-5 h-5 text-muted shrink-0 mr-2.5" />

      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full h-full bg-transparent text-text text-base placeholder:text-muted focus:outline-none"
      />

      {query && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="p-1 text-muted hover:text-text rounded-md focus-ring cursor-pointer ml-1"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
