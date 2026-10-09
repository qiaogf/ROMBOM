// Shared helpers for the import-batch domain — pure functions, no "use server".
// Used by ./markup for markup calculations and percent validation.

/** Round to 4 decimal places. */
export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Parse and validate markup percent from form data. Returns null when invalid. */
export function parseMarkupPercent(formData: FormData): number | null {
  const percentRaw = (formData.get("markupPercent") as string)?.trim();
  const markupPercent = percentRaw ? Number(percentRaw) : NaN;
  if (!Number.isFinite(markupPercent) || markupPercent < 0 || markupPercent > 1000) {
    return null;
  }
  return markupPercent;
}
