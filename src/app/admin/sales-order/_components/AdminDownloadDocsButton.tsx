"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";

/** 管理员下载订单单据：PDF 为四页合并文件，XLSX 包含四个工作表。 */
export function AdminDownloadDocsButton({
  orderId,
  orderNumber,
  format,
}: {
  orderId: string;
  orderNumber: string;
  format: "pdf" | "xlsx";
}) {
  const [loading, setLoading] = useState(false);
  const label = format === "xlsx" ? "Documents EXCEL" : "Documents PDF";

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/order-documents?orderId=${encodeURIComponent(orderId)}&format=${format}`
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        window.alert(data?.message || "Failed to download the documents.");
        return;
      }
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const matched = /filename="([^"]+)"/.exec(disposition);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = matched?.[1] || `${orderNumber}-Documents.${format === "xlsx" ? "xlsx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.alert("Failed to download the documents. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title={format === "xlsx" ? "Download PI, contract, CI and packing list as Excel" : "Download PI, contract, CI and packing list as PDF"}
      className="inline-flex w-[132px] max-w-none shrink-0 items-center justify-start gap-1 whitespace-nowrap px-1.5 py-0.5 text-left bg-sky-100 border border-sky-300 text-sky-800 text-[10px] font-semibold rounded hover:bg-sky-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <FileDown className="w-3 h-3 shrink-0" />
      {loading ? "..." : label}
    </button>
  );
}
