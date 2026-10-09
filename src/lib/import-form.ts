/**
 * Shared types and helpers for CSV/Excel import forms (admin + supplier portals).
 *
 * Server-safe: no React or next/navigation imports — only data shapes and
 * pure validation. The accompanying client hook lives in
 * `@/components/import/useImportForm`.
 */

/** Accepted file extensions + MIME types for the import input. */
export const ACCEPTED_IMPORT_TYPES =
  ".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";

/** Allowed extensions (lowercase, no leading dot). */
const ALLOWED_EXTENSIONS = ["xlsx", "xls", "csv"];

/**
 * Validate that a File has an allowed extension.
 * Returns the File when valid, null otherwise.
 */
export function validateImportFile(file: File | undefined | null): File | null {
  if (!file) return null;
  const name = file.name.toLowerCase();
  const ok = ALLOWED_EXTENSIONS.some((ext) => name.endsWith("." + ext));
  return ok ? file : null;
}

/** Admin-style import result: per-row structured errors + header mapping. */
export type ImportResultStructured = {
  success: boolean;
  successCount: number;
  failureCount: number;
  errors: { row: number; message: string }[];
  message?: string;
  headerMapping?: Record<string, string>;
};

/** Supplier-style import result: plain string errors (no row numbers). */
export type ImportResultPlain = {
  success: boolean;
  successCount: number;
  failureCount: number;
  errors: string[];
  message?: string;
};
