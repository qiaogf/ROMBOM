"use client";

/**
 * Admin shared import form (used by /admin/import-price and /admin/model-price).
 *
 * Posts to /api/admin/import-price with the configured `batchType`. Result is
 * the structured shape (per-row errors + optional header mapping). Sizes use
 * the admin "md" preset (text-xs / w-3.5 / gap-2) — supplier portal keeps its
 * own form with smaller sizing and plain-string errors.
 */
import { Upload, Loader2, CheckCircle2, XCircle, FileText } from "lucide-react";
import { useImportForm } from "./useImportForm";
import {
  ACCEPTED_IMPORT_TYPES,
  type ImportResultStructured,
} from "@/lib/import-form";

export interface SeriesOption {
  seriesId: string;
  seriesName: string;
  brandName: string;
}

interface ImportFormBaseProps {
  batchType: "product_info" | "price";
  subtitle: string;
  /** Reserved for API compatibility; not used by the form itself. */
  seriesOptions?: SeriesOption[];
}

export function ImportFormBase({
  batchType,
  subtitle,
  seriesOptions: _seriesOptions,
}: ImportFormBaseProps) {
  const { file, loading, result, error, onFileChange, onSubmit } =
    useImportForm<ImportResultStructured>({
      endpoint: "/api/admin/import-price",
      batchType,
      // 上传成功后刷新 RSC 列表（Imported Files），否则新文件不显示
      refreshAfterSuccess: true,
    });

  return (
    <div>
      <div className="mb-2 text-[11px] text-slate-500">{subtitle}</div>

      <form onSubmit={onSubmit} className="flex items-center gap-2 flex-nowrap">
        {/* 左侧：文件选择，占一半宽度 */}
        <div className="flex items-center gap-2 w-1/2 min-w-0">
          <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-md hover:bg-green-200 cursor-pointer transition-colors shrink-0">
            <FileText className="w-3.5 h-3.5" />
            选择文件
            <input
              type="file"
              accept={ACCEPTED_IMPORT_TYPES}
              onChange={onFileChange}
              className="sr-only"
            />
          </label>
          {file && (
            <span className="text-xs text-slate-600 whitespace-nowrap" title={file.name}>
              {file.name}
            </span>
          )}
        </div>
        {/* 右侧：Import 按钮在行中间，结果紧跟其后 */}
        <div className="w-1/2 flex items-center gap-2">
          <button
            type="submit"
            disabled={loading || !file}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-green-700 rounded-md hover:bg-green-800 disabled:opacity-60 shrink-0"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {loading ? "Importing..." : "Import"}
          </button>
          {result && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
              {result.failureCount > 0 ? (
                <XCircle className="w-3.5 h-3.5 text-amber-600" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-700" />
              )}
              <span className={result.failureCount > 0 ? "text-amber-700" : "text-green-700"}>
                Success: {result.successCount} · Failed: {result.failureCount}
              </span>
            </span>
          )}
        </div>
      </form>

      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}

      {result && result.errors.length > 0 && (
        <div className="mt-3 p-3 rounded-md border border-slate-200 bg-slate-50">
          {result.headerMapping && Object.keys(result.headerMapping).length > 0 && (
            <details className="text-xs text-slate-600 mb-2">
              <summary className="cursor-pointer text-slate-500">
                Recognized header columns ({Object.keys(result.headerMapping).length})
              </summary>
              <ul className="mt-2 space-y-0.5">
                {Object.entries(result.headerMapping).map(([canon, orig]) => (
                  <li key={canon} className="text-slate-600">
                    • &quot;{orig}&quot; → {canon}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <details className="text-xs text-slate-600">
            <summary className="cursor-pointer text-slate-500">
              View {result.errors.length} error(s)
            </summary>
            <ul className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {result.errors.map((err, i) => (
                <li key={i} className="text-rose-700">
                  • Row {err.row}: {err.message}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}
