import Link from "next/link";
import { FileText, Calendar, Hash } from "lucide-react";
import { BatchActionButtons } from "./BatchActionButtons";

export interface PriceBatchListItem {
  importBatchId: string;
  fileName: string;
  sourceType: string;
  importedAt: Date;
  recordCount: number;
  errorCount: number;
  seriesId: string | null;
  approvalStatus: string;
  approvedAt: Date | null;
  /** 文件内包含的全部系列（按 CSV 行去重，可能多个）；空数组显示 — */
  seriesRows: Array<{ seriesName: string; brand: { brandName: string } | null }>;
  uploaderEmail: string | null;
}

interface PriceBatchListProps {
  batches: PriceBatchListItem[];
  detailPathPrefix: string;
  emptyHint?: string;
}

// DD/MM/YY 格式，如 26/09/28
function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

export function PriceBatchList({ batches, detailPathPrefix, emptyHint }: PriceBatchListProps) {
  if (batches.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-400">
        {emptyHint ?? "No price files yet."}
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
            <tr>
              <th className="px-1.5 py-1 text-left">File</th>
              <th className="px-1.5 py-1 text-left">By</th>
              <th className="px-1.5 py-1 text-left">Series</th>
              <th className="px-1.5 py-1 text-left">Status</th>
              <th className="px-1.5 py-1 text-left">Imported</th>
              <th className="px-1.5 py-1 text-right">Rec</th>
              <th className="px-1.5 py-1 text-left">Act</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {batches.map((b) => {
              const status = b.approvalStatus as "pending" | "approved";
              const isPending = status === "pending";
              return (
                <tr key={b.importBatchId} className="hover:bg-slate-50">
                  <td className="px-1.5 py-1">
                    <Link
                      href={`${detailPathPrefix}${b.importBatchId}`}
                      className="inline-flex items-center gap-1 text-slate-800 font-medium hover:text-blue-700"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span className="max-w-[200px] truncate">{b.fileName}</span>
                    </Link>
                  </td>
                  <td className="px-1.5 py-1">
                    <div className="flex flex-col">
                      <span className="text-slate-700 text-[11px] truncate max-w-[120px]">{b.uploaderEmail ?? "—"}</span>
                      <span
                        className={`inline-flex items-center px-1 py-0.5 text-[9px] rounded w-fit mt-0.5 capitalize ${
                          b.sourceType === "admin"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {b.sourceType}
                      </span>
                    </div>
                  </td>
                  <td className="px-1.5 py-1 text-slate-600">
                    {b.seriesRows.length === 0 ? (
                      <span className="text-slate-400 italic">—</span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {b.seriesRows.map((s) => (
                          <span
                            key={s.seriesName}
                            className="inline-flex items-center gap-1 whitespace-nowrap text-[11px]"
                          >
                            {s.brand?.brandName ? (
                              <span className="text-slate-400">{s.brand.brandName} /</span>
                            ) : null}
                            <span className="font-medium text-slate-700">{s.seriesName}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-1.5 py-1">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] rounded capitalize ${
                        isPending
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {isPending ? "Pending" : "Approved"}
                    </span>
                  </td>
                  <td className="px-1.5 py-1 text-slate-600 whitespace-nowrap text-[11px]">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatDate(b.importedAt)}
                    </span>
                  </td>
                  <td className="px-1.5 py-1 text-right text-slate-700">
                    <span className="inline-flex items-center gap-1">
                      <Hash className="w-3 h-3 text-slate-400" />
                      {b.recordCount}
                    </span>
                  </td>
                  <td className="px-1.5 py-1">
                    <BatchActionButtons
                      importBatchId={b.importBatchId}
                      fileName={b.fileName}
                      approvalStatus={status}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
