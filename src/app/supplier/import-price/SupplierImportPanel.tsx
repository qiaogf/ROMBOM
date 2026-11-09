"use client";

/**
 * 供应商 Import Price 面板 — 左侧区域（标题/上传区固定，文件列表独立滚动）
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Hash,
  AlertTriangle,
  Trash2,
  Loader2,
  Download,
  ExternalLink,
} from "lucide-react";
import { ImportForm } from "./ImportForm";
import { deleteSupplierImportBatch } from "@/app/actions/supplierActions";

// 与 Admin Price 模板一致的 6 列格式；Stock Status 由 Leadtime 文本推导，MOQ 默认 1
const TEMPLATE_CSV = `Brand,Series,Model,Price,Condition,Leadtime
Siemens,S7-1200,6ES7214-1AG40-0XB0,128.00,New Original,In stock
Siemens,S7-1500,6ES7511-1AK02-0AB0,455.00,New Original,2-3 weeks`;

export interface SupplierBatchItem {
  importBatchId: string;
  fileName: string;
  importedAt: Date;
  recordCount: number;
  errorCount: number;
  approvalStatus: string;
  approvedAt: Date | null;
  series: {
    seriesName: string;
    brand: { brandName: string } | null;
    category: { categoryName: string } | null;
  } | null;
}

interface SupplierImportPanelProps {
  batches: SupplierBatchItem[];
  emptyHint?: string;
}

export function SupplierImportPanel({ batches, emptyHint }: SupplierImportPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const handleDelete = (id: string) => {
    setDeleteError("");
    const fd = new FormData();
    fd.set("importBatchId", id);
    startTransition(async () => {
      const res = await deleteSupplierImportBatch(fd);
      if (res.success) {
        setConfirmingId(null);
        router.refresh();
      } else {
        setDeleteError(res.message);
      }
    });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col p-2.5">
      {/* 固定头部：上传卡片 */}
      <div className="shrink-0">
        <div className="bg-white border border-slate-200 rounded-md p-2 mb-2">
          <ImportForm
            title="Upload Price File"
            headerActions={
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE_CSV)}`}
                download="price-import-template.csv"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-green-700 border border-green-300 rounded hover:bg-green-50"
              >
                <Download className="w-3 h-3" /> Template
              </a>
            }
          />
        </div>
      </div>

      {/* 独立滚动区域：上传后的文件直接列在下方，随数量伸缩，右侧滑条 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {batches.length === 0 ? (
          <div className="py-8 text-center text-[11px] text-slate-400">{emptyHint ?? "No files yet."}</div>
        ) : (
          <table className="min-w-full text-xs">
            <colgroup>
              <col className="w-[27%]" />
              <col className="w-[16%]" />
              <col className="w-[11%]" />
              <col className="w-[12%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[20%]" />
            </colgroup>
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide sticky top-0 z-10">
              <tr>
                <th className="px-1.5 py-1 text-left">File</th>
                <th className="px-1.5 py-1 text-left">Series</th>
                <th className="px-1.5 py-1 text-left">Live</th>
                <th className="px-1.5 py-1 text-left">Status</th>
                <th className="px-1.5 py-1 text-right">Rec</th>
                <th className="px-1.5 py-1 text-right">Err</th>
                <th className="px-1.5 py-1 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches.map((b) => {
                const isPending = b.approvalStatus === "pending";
                const isConfirming = confirmingId === b.importBatchId;
                return (
                  <tr key={b.importBatchId} className="hover:bg-slate-50">
                    <td className="px-1.5 py-1">
                      <Link
                        href={`/supplier/import-price?batch=${b.importBatchId}`}
                        className="inline-flex items-center gap-1 text-slate-800 font-medium text-left hover:text-green-700 hover:underline"
                        title={`View ${b.fileName} content`}
                      >
                        <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="whitespace-nowrap max-w-[140px] truncate">{b.fileName}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      </Link>
                    </td>
                    <td className="px-1.5 py-1 text-slate-600">
                      {b.series ? (
                        <span className="block truncate" title={`${b.series.brand?.brandName ? b.series.brand.brandName + " / " : ""}${b.series.seriesName}`}>
                          {b.series.seriesName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-1.5 py-1 text-slate-600 whitespace-nowrap tabular-nums">
                      {b.approvedAt
                        ? `${String(b.approvedAt.getFullYear()).slice(2)}${String(b.approvedAt.getMonth() + 1).padStart(2, "0")}${String(b.approvedAt.getDate()).padStart(2, "0")}/${String(b.approvedAt.getHours()).padStart(2, "0")}:${String(b.approvedAt.getMinutes()).padStart(2, "0")}`
                        : <span className="text-slate-400 italic">—</span>}
                    </td>
                    <td className="px-1.5 py-1">
                      <span
                        className={`inline-flex items-center px-1 py-0.5 text-[9px] rounded capitalize ${
                          isPending ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {isPending ? "Pending" : "Live"}
                      </span>
                    </td>
                    <td className="px-1.5 py-1 text-right text-slate-700 tabular-nums">
                      <span className="inline-flex items-center gap-0.5">
                        <Hash className="w-2.5 h-2.5 text-slate-400" />
                        {b.recordCount}
                      </span>
                    </td>
                    <td className="px-1.5 py-1 text-right tabular-nums">
                      {b.errorCount > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-rose-600">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {b.errorCount}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-1.5 py-1">
                      {isConfirming ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDelete(b.importBatchId)}
                            disabled={pending}
                            className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[10px] font-medium text-white bg-rose-600 hover:bg-rose-700 rounded disabled:opacity-50"
                          >
                            {pending ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Trash2 className="w-2.5 h-2.5" />}
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => { setConfirmingId(null); setDeleteError(""); }}
                            disabled={pending}
                            className="px-1 py-0.5 text-[10px] text-slate-600 hover:text-slate-800"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingId(b.importBatchId)}
                          disabled={pending}
                          className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[10px] font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                        >
                          <Trash2 className="w-2.5 h-2.5" /> Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {deleteError && (
          <div className="px-2 py-1 text-[10px] text-rose-600 border-t border-rose-100 bg-rose-50 sticky bottom-0">{deleteError}</div>
        )}
      </div>
    </div>
  );
}
