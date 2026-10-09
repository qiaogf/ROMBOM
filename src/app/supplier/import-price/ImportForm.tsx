"use client";

/**
 * 供应商导入表单 — 支持 .xlsx / .xls / .csv
 * 系列由 CSV 每行 Series 列指定（必须为系统中已存在的系列），
 * 调用 /api/supplier/import-price 处理上传。上传成功后刷新批次列表。
 */
import { Upload, Loader2, CheckCircle2, XCircle, FileText } from "lucide-react";
import { useImportForm } from "@/components/import/useImportForm";
import {
  ACCEPTED_IMPORT_TYPES,
  type ImportResultPlain,
} from "@/lib/import-form";

export function ImportForm() {
  const { file, loading, result, error, onFileChange, onSubmit } =
    useImportForm<ImportResultPlain>({
      endpoint: "/api/supplier/import-price",
      refreshAfterSuccess: true,
    });

  return (
    <div>
      <div className="mb-1 text-[10px] text-slate-500 leading-tight">
        .xlsx / .xls / .csv · 8 columns · See template
      </div>

      <form onSubmit={onSubmit} className="flex items-center gap-1.5 flex-nowrap">
        {/* 左侧：文件选择，占一半宽度 */}
        <div className="flex items-center gap-1.5 w-1/2 min-w-0">
          <label className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-green-800 bg-green-100 rounded hover:bg-green-200 cursor-pointer transition-colors shrink-0">
            <FileText className="w-3 h-3" />
            选择文件
            <input
              type="file"
              accept={ACCEPTED_IMPORT_TYPES}
              onChange={onFileChange}
              className="sr-only"
            />
          </label>
          {file && (
            <span className="text-[11px] text-slate-600 whitespace-nowrap truncate" title={file.name}>
              {file.name}
            </span>
          )}
        </div>
        {/* 右侧：Import 按钮在行中间，结果紧跟其后 */}
        <div className="w-1/2 flex items-center gap-1.5">
          <button
            type="submit"
            disabled={loading || !file}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium text-white bg-green-700 rounded hover:bg-green-800 disabled:opacity-60 shrink-0"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Upload className="w-3 h-3" />
            )}
            {loading ? "Importing..." : "Import"}
          </button>
          {result && (
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
          )}
        </div>
      </form>

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
