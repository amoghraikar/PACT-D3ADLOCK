/**
 * PACT formatting utilities for money, dates, and times.
 * Strictly adheres to C6 and U7 conventions:
 * - Money: from paise BIGINT, formatted with Indian number grouping (lakhs, crores), dropping .00
 * - Time: Asia/Kolkata timezone
 */

/**
 * Formats an amount in paise to Indian currency format.
 * Examples:
 *   72000 -> "₹720"
 *   71667 -> "₹716.67"
 *   12345650 -> "₹1,23,456.50"
 *   0 -> "₹0"
 *   approx: true -> "About ₹300"
 */
export function formatPaise(
  paise: number | bigint,
  options?: { approx?: boolean }
): string {
  const numPaise = typeof paise === "bigint" ? Number(paise) : paise;
  const isNegative = numPaise < 0;
  const absPaise = Math.abs(numPaise);

  const rupees = Math.floor(absPaise / 100);
  const remainderPaise = Math.round(absPaise % 100);

  // Format integer part with Indian grouping system (3, 2, 2, ...)
  const rupeeStr = rupees.toString();
  let formattedRupees = "";

  if (rupeeStr.length <= 3) {
    formattedRupees = rupeeStr;
  } else {
    const last3 = rupeeStr.slice(-3);
    const remaining = rupeeStr.slice(0, -3);
    const parts: string[] = [];
    for (let i = remaining.length; i > 0; i -= 2) {
      parts.unshift(remaining.slice(Math.max(0, i - 2), i));
    }
    formattedRupees = `${parts.join(",")},${last3}`;
  }

  // Fraction part (paise)
  let formatted = `₹${formattedRupees}`;
  if (remainderPaise > 0) {
    const paiseStr = remainderPaise < 10 ? `0${remainderPaise}` : `${remainderPaise}`;
    formatted += `.${paiseStr}`;
  }

  if (isNegative) {
    formatted = `-${formatted}`;
  }

  if (options?.approx) {
    return `About ${formatted}`;
  }

  return formatted;
}

/**
 * Formats a Date or ISO string to Asia/Kolkata date string: "24 Nov".
 */
export function formatDate(dateInput: string | Date | number): string {
  const date = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
  }).format(date);
}

/**
 * Formats a Date or ISO string to Asia/Kolkata time string: "11:59 pm".
 */
export function formatTime(dateInput: string | Date | number): string {
  const date = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .toLowerCase();
}

/**
 * Formats a Date or ISO string to "24 Nov, 11:59 pm".
 */
export function formatDateTime(dateInput: string | Date | number): string {
  return `${formatDate(dateInput)}, ${formatTime(dateInput)}`;
}

/**
 * Formats relative days until cutoff: "closes in 6 days", "closes today", "closed".
 */
export function formatRelativeDays(targetDateInput: string | Date | number): string {
  const target = typeof targetDateInput === "object" ? targetDateInput : new Date(targetDateInput);
  const now = new Date();

  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return "closed";
  }
  if (diffDays === 0) {
    return "closes today";
  }
  if (diffDays === 1) {
    return "closes in 1 day";
  }
  return `closes in ${diffDays} days`;
}
