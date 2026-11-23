"use client";

import React from "react";
import { Mic, AlertCircle } from "lucide-react";

export type MicState = "idle" | "listening" | "error";

export interface MicButtonProps {
  state?: MicState;
  onClick: () => void;
  errorLabel?: string;
  className?: string;
}

export function MicButton({
  state = "idle",
  onClick,
  errorLabel = "Could not hear, tap to try again",
  className = "",
}: MicButtonProps) {
  return (
    <div className={`flex flex-col items-center gap-3 select-none ${className}`}>
      <button
        type="button"
        onClick={onClick}
        aria-label={
          state === "listening"
            ? "Stop listening"
            : state === "error"
            ? "Retry voice ordering"
            : "Start voice ordering"
        }
        className={`w-[88px] h-[88px] rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer focus-ring relative ${
          state === "idle"
            ? "bg-ink-800 text-white hover:bg-ink-900 shadow-md active:scale-95"
            : state === "listening"
            ? "bg-teal-700 text-white ring-8 ring-ice-200 animate-pulse scale-105"
            : "bg-white text-danger-700 border-2 border-danger-700 hover:bg-danger-100"
        }`}
      >
        {state === "idle" && <Mic className="w-8 h-8 stroke-[2]" />}
        {state === "listening" && <Mic className="w-8 h-8 animate-bounce stroke-[2]" />}
        {state === "error" && <AlertCircle className="w-8 h-8 stroke-[2]" />}
      </button>

      {/* Label beneath button */}
      <span
        className={`text-sm font-medium transition-colors ${
          state === "listening"
            ? "text-teal-700 font-semibold"
            : state === "error"
            ? "text-danger-700"
            : "text-ink-600"
        }`}
      >
        {state === "listening"
          ? "Listening… tap to stop"
          : state === "error"
          ? errorLabel
          : "Tap to speak"}
      </span>
    </div>
  );
}
