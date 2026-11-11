"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";

/** 下载客户上传的银行水单，样式同客户账户的 Documents 按钮 */
export function AdminDownloadDocsButton({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/order-files?orderId=${encodeURIComponent(orderId)}&kind=slip`);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        window.alert(data?.message || "Failed to download the slip.");
        return;
      }
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const matched = /filename="([^"]+)"/.exec(disposition);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = matched?.[1] || `${orderNumber}-slip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.alert("Failed to download the slip. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title="Download customer bank slip"
      className="w-full inline-flex items-center justify-center gap-1 px-1 py-0.5 bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-semibold rounded hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <FileDown className="w-3 h-3" />
      {loading ? "..." : "Documents"}
    </button>
  );
}
