"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

/** 管理员上传 PI / 单证并存档（样式同客户账户的 Slip 按钮） */
export function AdminSlipUploadButton({ orderId }: { orderId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file || loading) return;

    setLoading(true);
    try {
      const body = new FormData();
      body.append("orderId", orderId);
      body.append("file", file);
      const res = await fetch("/api/admin/order-attachment", { method: "POST", body });
      const data = (await res.json().catch(() => null)) as { success?: boolean; message?: string } | null;
      if (!res.ok || !data?.success) {
        window.alert(data?.message || "Upload failed.");
        return;
      }
      router.refresh();
    } catch {
      window.alert("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        title="Upload PI / documents"
        className="w-full inline-flex items-center justify-center gap-1 px-1 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold rounded hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Upload className="w-3 h-3" />
        {loading ? "..." : "Slip"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.xls,.xlsx,.doc,.docx"
        className="hidden"
        onChange={handleFile}
      />
    </>
  );
}
