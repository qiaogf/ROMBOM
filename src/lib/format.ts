import { formatUSD, type DecimalLike } from "@/lib/price";

/**
 * 统一订单日期格式：YYMMDD（如 2026-11-18 → "261118"）。
 * null / 无效日期 → "—"
 */
export function formatDateYYMMDD(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  const year = String(d.getFullYear()).slice(-2);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * Format a possibly-null amount as USD currency.
 * - null / undefined → fallback (default "—")
 * - invalid (NaN) strings or numbers → "$0.00" (delegates to formatUSD normalization)
 * - otherwise → "$1,234.56"-style currency string
 *
 * Use this when callers need to distinguish "no value" (null) from "zero" ($0.00).
 * Mirrors the original `money` helper in StandardPriceTable.
 */
export function formatUSDOrNull(
  amount: number | string | DecimalLike | null | undefined,
  fallback = "—"
): string {
  if (amount === null || amount === undefined) {
    return fallback;
  }
  return formatUSD(amount);
}

/**
 * Format an amount as USD currency with strict fallback for invalid input.
 * - null / undefined → fallback (default "-")
 * - non-numeric / NaN → fallback
 * - otherwise → "$1,234.56"-style currency string
 *
 * Use this when callers want a uniform placeholder for any invalid input.
 * Mirrors the original `formatDecimal` helper used across admin pages.
 */
export function formatUSDSafe(
  amount: number | string | DecimalLike | null | undefined,
  fallback = "-"
): string {
  if (amount === null || amount === undefined) {
    return fallback;
  }
  // Detect NaN BEFORE formatUSD normalizes NaN→0
  const num =
    typeof amount === "string"
      ? parseFloat(amount)
      : typeof amount === "number"
        ? amount
        : Number(amount.toString());
  if (Number.isNaN(num)) {
    return fallback;
  }
  return formatUSD(amount);
}
