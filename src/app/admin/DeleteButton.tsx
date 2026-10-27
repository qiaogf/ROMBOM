"use client";

/**
 * 通用删除按钮 — 带确认对话框
 * 由 admin 列表页使用，调用传入的 Server Action
 */
import { useState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface DeleteButtonProps {
  id: string;
  action: (formData: FormData) => Promise<{ success: boolean; message: string }>;
  /** 确认提示中显示的实体名称（如邮箱/供应商名） */
  label: string;
  /** 删除实体类型，用于确认提示 */
  entity: "customer" | "supplier" | "admin" | "brand" | "series" | "category" | "importBatch";
}

export function DeleteButton({ id, action, label, entity }: DeleteButtonProps) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const FIELD_KEY: Record<typeof entity, string> = {
    customer: "customerId",
    supplier: "supplierId",
    admin: "adminId",
    brand: "brandId",
    series: "seriesId",
    category: "categoryId",
    importBatch: "importBatchId",
  };

  const handleDelete = () => {
    setError("");
    const fd = new FormData();
    fd.set(FIELD_KEY[entity], id);
    startTransition(async () => {
      const res = await action(fd);
      if (res.success) {
        router.refresh();
      } else {
        // 失败时保留确认区，让错误原因可见（此前收起后错误提示会消失，表现为“点了没反应”）
        setError(res.message);
      }
    });
  };

  const CASCADE_NOTE: Partial<Record<typeof entity, string>> = {
    brand: "All its series and model prices will also be deleted.",
    series: "All model prices in this series will also be deleted.",
    importBatch: "All model prices imported in this file will also be deleted.",
  };

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-slate-600">Delete {label}?</span>
        {CASCADE_NOTE[entity] && (
          <span className="text-[11px] text-amber-600">{CASCADE_NOTE[entity]}</span>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-white bg-rose-600 hover:bg-rose-700 rounded disabled:opacity-50"
        >
          {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          {pending ? "Deleting..." : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => { setConfirming(false); setError(""); }}
          disabled={pending}
          className="px-1.5 py-0.5 text-[11px] text-slate-600 hover:text-slate-800"
        >
          Cancel
        </button>
        {error && <span className="text-[11px] text-rose-600">{error}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      disabled={pending}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
      title={`Delete ${label}`}
    >
      <Trash2 className="w-3 h-3" />
      <span>Delete</span>
    </button>
  );
}
