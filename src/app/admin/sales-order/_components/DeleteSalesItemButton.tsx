"use client";

// 销售单明细行删除按钮（减行）— 二次确认后删除该行并重算订单金额
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteSalesOrderItem } from "@/app/actions/adminActions";

export function DeleteSalesItemButton({
  itemId,
  model,
}: {
  itemId: string;
  model: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    if (pending) return;
    if (!window.confirm(`Delete item "${model ?? "—"}" from this sales order?`)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("itemId", itemId);
      const res = await deleteSalesOrderItem(fd);
      if (res.success) {
        router.refresh();
      } else {
        window.alert(res.message);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      aria-label={`Delete item ${model ?? ""}`}
      className="inline-flex items-center justify-center w-5 h-5 text-slate-300 rounded hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Trash2 className="w-3 h-3" />
      )}
    </button>
  );
}
