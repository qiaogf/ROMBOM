"use client";

/**
 * Admin shared import form (used by /admin/import-price and /admin/model-price).
 *
 * Posts to /api/admin/import-price with the configured `batchType`. Result is
 * the structured shape (per-row errors + optional header mapping). Sizes use
 * the admin "md" preset (text-xs / w-3.5 / gap-2) — supplier portal keeps its
 * own form with smaller sizing and plain-string errors.
 *
 * 交互（2026-11-01）：不显示"选择文件"控件，点击 Import 直接弹出文件选择框，
 * 选中后立即上传。
 */
import { useRef, type ChangeEvent, type ReactNode } from "react";
import { Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";
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
  /** Reserved for API compatibility; not used by the form itself. */
  seriesOptions?: SeriesOption[];
  /** 标题行文案（如 Upload Products File / Upload Price File） */
  title: string;
  /** 标题行右侧操作区（Template / 比价按钮等） */
  headerActions?: ReactNode;
}

export function ImportFormBase({
  batchType,
  seriesOptions: _seriesOptions,
  title,
  headerActions,
}: ImportFormBaseProps) {
  const { loading, result, error, onFileChange, upload } =
    useImportForm<ImportResultStructured>({
      endpoint: "/api/admin/import-price",
      batchType,
      // 上传成功后刷新 RSC 列表（文件列表），否则新文件不显示
      refreshAfterSuccess: true,
    });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 点击 Import → 弹出系统文件选择框；选中后立即上传
  const onPickFile = () => fileInputRef.current?.click();

  const onFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = onFileChange(e);
    // 清空 value，保证同一文件可以再次选择并触发 change
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
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-2">
        <h2 className="text-xs font-semibold text-slate-800">{title}</h2>
        <div className="justify-self-center">
          <button
            type="button"
            onClick={onPickFile}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-green-700 rounded-md hover:bg-green-800 disabled:opacity-60 shrink-0"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {loading ? "Importing..." : "Import"}
          </button>
        </div>
        <div className="justify-self-end flex items-center gap-2">
          {headerActions}
        </div>
      </div>

      {result && (
        <div className="mb-1">
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
        </div>
      )}

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
