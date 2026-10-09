import Link from "next/link";
import { FileText, Calendar, Hash } from "lucide-react";
import { BatchActionButtons } from "./BatchActionButtons";

export interface BatchListItem {
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
  /** 上传者邮箱：admin 上传取 admin.email；supplier 上传取 supplier.email */
  uploaderEmail: string | null;
}

interface ImportBatchListProps {
  batches: BatchListItem[];
  /** 构造批次详情链接，如 (id) => `/admin/import-price?batch=${id}` */
  detailHref: (importBatchId: string) => string;
  emptyHint?: string;
}

// DD/MM/YY 格式，如 18/09/26
function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

export function ImportBatchList({ batches, detailHref, emptyHint }: ImportBatchListProps) {
  if (batches.length === 0) {
    return (
      <div className="py-6 text-left text-sm text-slate-400">
        {emptyHint ?? "No imported files yet."}
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full table-fixed text-xs">
          <colgroup>
            <col className="w-[220px]" />
            <col className="w-[160px]" />
            <col className="w-[200px]" />
            <col className="w-[72px]" />
            <col className="w-[92px]" />
            <col className="w-[60px]" />
            <col className="w-[176px]" />
          </colgroup>
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
            <tr>
              <th className="px-1.5 py-0.5 text-left">File</th>
              <th className="px-1.5 py-0.5 text-left">Uploaded By</th>
              <th className="px-1.5 py-0.5 text-left">Series</th>
              <th className="px-1.5 py-0.5 text-left">Status</th>
              <th className="px-1.5 py-0.5 text-left">Imported At</th>
              <th className="px-1.5 py-0.5 text-left">Records</th>
              <th className="px-1.5 py-0.5 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {batches.map((b) => {
              const status = b.approvalStatus as "pending" | "approved";
              const isPending = status === "pending";
              return (
                <tr key={b.importBatchId} className="hover:bg-slate-50">
                  <td className="px-1.5 py-0.5">
                    <Link
                      href={detailHref(b.importBatchId)}
                      className="flex items-center gap-1 text-slate-800 font-medium hover:text-blue-700 whitespace-nowrap"
                      title={b.fileName}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span>{b.fileName}</span>
                    </Link>
                  </td>
                  <td className="px-1.5 py-0.5">
                    <div className="flex flex-col">
                      <span className="block text-slate-700 text-[11px] whitespace-nowrap" title={b.uploaderEmail ?? ""}>{b.uploaderEmail ?? "—"}</span>
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
                  <td className="px-1.5 py-0.5 text-slate-600">
                    {b.seriesRows.length === 0 ? (
                      <span className="text-slate-400 italic">—</span>
                    ) : (
                      <div className="flex flex-col gap-0.5 min-w-0">
                        {b.seriesRows.map((s) => (
                          <span
                            key={s.seriesName}
                            className="flex items-center gap-1 text-[11px] whitespace-nowrap"
                            title={s.seriesName}
                          >
                            {s.brand?.brandName ? (
                              <span className="text-slate-400 shrink-0">{s.brand.brandName} /</span>
                            ) : null}
                            <span className="font-medium text-slate-700">{s.seriesName}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-1.5 py-0.5">
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
                  <td className="px-1.5 py-0.5 text-slate-600 whitespace-nowrap text-[11px]">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatDate(b.importedAt)}
                    </span>
                  </td>
                  <td className="px-1.5 py-0.5 text-left text-slate-700">
                    <span className="inline-flex items-center gap-1">
                      <Hash className="w-3 h-3 text-slate-400" />
                      {b.recordCount}
                    </span>
                  </td>
                  <td className="px-1.5 py-0.5">
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
