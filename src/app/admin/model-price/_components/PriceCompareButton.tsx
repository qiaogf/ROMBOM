"use client";

// Admin 价格模块 — 比价任务手动触发按钮
// 自动触发已挂在：价格批次 Confirm 上线 / approved 批次改 Markup（见 price-compare.ts）
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GitCompareArrows } from "lucide-react";
import { runPriceCompareAction } from "@/app/actions/adminActions";

export function PriceCompareButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      {msg && (
        <span className="text-[10px] text-slate-500 max-w-[340px] truncate" title={msg}>
          {msg}
        </span>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await runPriceCompareAction();
            setMsg(res.message);
            router.refresh();
          })
        }
        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
      >
        <GitCompareArrows className="w-3 h-3" />
        {pending ? "Comparing..." : "Run Compare"}
      </button>
    </div>
  );
}
