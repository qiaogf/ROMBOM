"use client";

/**
 * Supplier import form — supports .xlsx / .xls / .csv.
 * Series must already exist in the system (Series column per row).
 * Posts to /api/supplier/import-price and refreshes the batch list on success.
 *
 * Same interaction as the admin panel: no visible file control — clicking
 * Import opens the system file picker and uploads immediately on selection.
 */
import { useRef, type ChangeEvent, type ReactNode } from "react";
import { Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useImportForm } from "@/components/import/useImportForm";
import {
  ACCEPTED_IMPORT_TYPES,
  type ImportResultPlain,
} from "@/lib/import-form";

interface ImportFormProps {
  /** Header title shown on the left (e.g. Upload Price File). */
  title: string;
  /** Right-side header actions (e.g. Template download). */
  headerActions?: ReactNode;
}

export function ImportForm({ title, headerActions }: ImportFormProps) {
  const { loading, result, error, onFileChange, upload } =
    useImportForm<ImportResultPlain>({
      endpoint: "/api/supplier/import-price",
      refreshAfterSuccess: true,
    });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Click Import → open the system file picker
  const onPickFile = () => fileInputRef.current?.click();

  const onFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = onFileChange(e);
    // Reset value so picking the same file again still fires change
    e.target.value = "";
    if (picked) void upload(picked);
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMPORT_TYPES}
        onChange={onFileSelected}
        className="sr-only"
      />

      {/* 标题行：左侧标题 / 中间 Import 按钮 / 右侧操作区（三段网格，按钮始终居中） */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <h2 className="text-[11px] font-semibold text-slate-700">{title}</h2>
        <div className="justify-self-center">
          <button
            type="button"
            onClick={onPickFile}
            disabled={loading}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium text-white bg-green-700 rounded hover:bg-green-800 disabled:opacity-60 shrink-0"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Upload className="w-3 h-3" />
            )}
            {loading ? "Importing..." : "Import"}
          </button>
        </div>
        <div className="justify-self-end flex items-center gap-1.5">{headerActions}</div>
      </div>

      {result && (
        <div className="mt-1">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap">
            {result.failureCount > 0 ? (
              <XCircle className="w-3 h-3 text-amber-600" />
            ) : (
              <CheckCircle2 className="w-3 h-3 text-green-700" />
            )}
            <span className={result.failureCount > 0 ? "text-amber-700" : "text-green-700"}>
              Success: {result.successCount} · Failed: {result.failureCount}
            </span>
          </span>
        </div>
      )}

      {error && <p className="mt-0.5 text-[10px] text-rose-600 leading-tight">{error}</p>}

      {result && result.errors.length > 0 && (
        <div className="mt-1.5 p-1.5 rounded border border-slate-200 bg-slate-50">
          <details className="text-[10px] text-slate-600">
            <summary className="cursor-pointer text-slate-500">
              View {result.errors.length} error(s)
            </summary>
            <ul className="mt-1 space-y-0.5 max-h-40 overflow-y-auto">
              {result.errors.map((err, i) => (
                <li key={i} className="text-rose-700 leading-tight">
                  • {err}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}
