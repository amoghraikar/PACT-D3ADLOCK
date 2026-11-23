import React from "react";
import { Check } from "lucide-react";

export type TimelineStep = 1 | 2 | 3 | 4 | 5;

export interface MonthTimelineProps {
  currentStep: TimelineStep;
  explanation?: string;
  className?: string;
}

const STEPS = [
  { id: 1, label: "Add items" },
  { id: 2, label: "Sent to store" },
  { id: 3, label: "Packed" },
  { id: 4, label: "Pay" },
  { id: 5, label: "Delivered" },
];

export function MonthTimeline({ currentStep, explanation, className = "" }: MonthTimelineProps) {
  const defaultExplanations: Record<TimelineStep, string> = {
    1: "Adding groceries closes on 24 Nov midnight. PACT will consolidate everyone's list.",
    2: "The consolidated order has been sent to the store for confirmation and packing.",
    3: "The store is packing your items. Final bill will be ready shortly.",
    4: "Your bill is ready with wholesale savings. Pay to confirm your delivery.",
    5: "All payments complete. Your building coordinator is distributing packages.",
  };

  const activeExplanation = explanation || defaultExplanations[currentStep];

  return (
    <div className={`w-full flex flex-col gap-4 ${className}`}>
      {/* 5-step progress track */}
      <div className="grid grid-cols-5 relative items-center">
        {STEPS.map((step, idx) => {
          const isDone = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <div key={step.id} className="flex flex-col items-center relative text-center">
              {/* Connecting line between steps */}
              {idx > 0 && (
                <div
                  className={`absolute top-3.5 right-1/2 w-full h-0.5 -z-0 transition-colors ${
                    isDone || isCurrent ? "bg-success-700" : "bg-ice-300"
                  }`}
                />
              )}

              {/* Step circle */}
              <div
                className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs select-none transition-all ${
                  isDone
                    ? "bg-success-700 text-white"
                    : isCurrent
                    ? "bg-teal-700 text-white ring-4 ring-ice-200"
                    : "bg-white border-2 border-ice-300 text-ink-400"
                }`}
              >
                {isDone ? (
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>

              {/* Label */}
              <span
                className={`mt-2 text-xs transition-colors whitespace-nowrap ${
                  isCurrent
                    ? "font-bold text-ink-800"
                    : isDone
                    ? "font-medium text-ink-600"
                    : "font-normal text-ink-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Explanatory sentence beneath per U5 */}
      {activeExplanation && (
        <p className="text-xs sm:text-sm text-ink-600 text-center leading-relaxed">
          {activeExplanation}
        </p>
      )}
    </div>
  );
}
