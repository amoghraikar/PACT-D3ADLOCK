import { BUSINESS_TIMEZONE, IST_OFFSET_MS } from "./constants.js";

/**
 * Formats integer paise to INR string using Indian numbering system.
 * Drops `.00` for whole rupee amounts unless `keepDecimals` is set.
 */
export function formatPaise(
  paise: number | null | undefined,
  options?: { approx?: boolean; keepDecimals?: boolean }
): string {
  const safePaise = typeof paise === "number" && Number.isFinite(paise) ? Math.trunc(paise) : 0;
  const isNegative = safePaise < 0;
  const absPaise = Math.abs(safePaise);
  const wholeRupees = Math.floor(absPaise / 100);
  const remPaise = absPaise % 100;

  const formattedRupees = wholeRupees.toLocaleString("en-IN");
  const decimals =
    remPaise > 0 || options?.keepDecimals ? `.${String(remPaise).padStart(2, "0")}` : "";

  const prefix = `${options?.approx ? "~" : ""}${isNegative ? "-" : ""}₹`;
  return `${prefix}${formattedRupees}${decimals}`;
}

export function formatDateIST(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: BUSINESS_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTimeIST(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: BUSINESS_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Computes active cycle month YYYY-MM and cutoff UTC Date for Asia/Kolkata.
 * If `now` is past this month's cutoff instant, advances to next month's cycle.
 */
export function getCycleWindowIST(
  now: Date,
  cutoffDay = 22,
  cutoffHour = 17,
  cutoffMinute = 27
): { cycleMonth: string; cutoffAt: Date } {
  const istMs = now.getTime() + IST_OFFSET_MS;
  const istDate = new Date(istMs);
  let year = istDate.getUTCFullYear();
  let monthIndex = istDate.getUTCMonth(); // 0..11

  let cutoffUtcMs =
    Date.UTC(year, monthIndex, cutoffDay, cutoffHour, cutoffMinute, 0, 0) - IST_OFFSET_MS;

  if (now.getTime() > cutoffUtcMs) {
    monthIndex += 1;
    if (monthIndex > 11) {
      monthIndex = 0;
      year += 1;
    }
    cutoffUtcMs =
      Date.UTC(year, monthIndex, cutoffDay, cutoffHour, cutoffMinute, 0, 0) - IST_OFFSET_MS;
  }

  const cycleMonth = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  return {
    cycleMonth,
    cutoffAt: new Date(cutoffUtcMs),
  };
}
