import { getCycleWindowIST } from "@pact/shared";
import { env } from "../config/env.js";

let clockOverride: Date | null = null;

export function setClockOverride(dt: Date | null): void {
  clockOverride = dt;
}

export function nowUtc(): Date {
  return clockOverride ? new Date(clockOverride.getTime()) : new Date();
}

export function currentCycleWindow(cutoff?: {
  day?: number;
  hour?: number;
  minute?: number;
}): { cycleMonth: string; cutoffAt: Date } {
  return getCycleWindowIST(
    nowUtc(),
    cutoff?.day ?? env.CYCLE_CUTOFF_DAY,
    cutoff?.hour ?? env.CYCLE_CUTOFF_HOUR,
    cutoff?.minute ?? env.CYCLE_CUTOFF_MINUTE
  );
}
