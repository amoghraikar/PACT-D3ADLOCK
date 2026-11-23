"use client";

import React from "react";
import { Mic, AlertCircle } from "lucide-react";

export type MicState = "idle" | "listening" | "error";

export interface MicButtonProps {
  state?: MicState;
  isRecording?: boolean;
  onClick: () => void;
  errorLabel?: string;
  className?: string;
}

export function MicButton({
  state = "idle",
  isRecording,
  onClick,
  errorLabel = "Could not hear, tap to try again",
  className = "",
}: MicButtonProps) {
  const activeState = isRecording ? "listening" : state;

  return (
    <div className={`flex flex-col items-center gap-3 select-none ${className}`}>
      <button
        type="button"
        onClick={onClick}
        aria-label={
          activeState === "listening"
            ? "Stop listening"
            : activeState === "error"
              ? "Retry voice ordering"
              : "Start voice ordering"
        }
        className={`w-[88px] h-[88px] rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer focus-ring relative ${
          activeState === "idle"
            ? "bg-ink-800 text-white hover:bg-ink-900 shadow-md active:scale-95"
            : activeState === "listening"
              ? "bg-teal-700 text-white ring-8 ring-ice-200 animate-pulse scale-105"
              : "bg-white text-danger-700 border-2 border-danger-700 hover:bg-danger-100"
        }`}
      >
        {activeState === "idle" && <Mic className="w-8 h-8 stroke-[2]" />}
        {activeState === "listening" && <Mic className="w-8 h-8 animate-bounce stroke-[2]" />}
        {activeState === "error" && <AlertCircle className="w-8 h-8 stroke-[2]" />}
      </button>

      {/* Label beneath button */}
      <span
        className={`text-sm font-medium transition-colors ${
          activeState === "listening"
            ? "text-teal-700 font-semibold"
            : activeState === "error"
              ? "text-danger-700"
              : "text-ink-600"
        }`}
      >
        {activeState === "listening"
          ? "Listening… tap to stop"
          : activeState === "error"
            ? errorLabel
            : "Tap to speak"}
      </span>
    </div>
  );
}
