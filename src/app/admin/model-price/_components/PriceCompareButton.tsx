"use client";

// Admin 价格模块 — Run Compare 全局切换开关（持久状态）
// ON（运行）：价格表 Confirm 后参与比价展示；OFF（停止）：前台全部回退产品表 Unit Price
// 自动触发已挂在：价格批次 Confirm 上线 / approved 批次改 Markup / cron（OFF 时短路）
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GitCompareArrows, Square } from "lucide-react";
import { togglePriceCompareAction } from "@/app/actions/adminActions";

export function PriceCompareButton({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
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
        title={
          enabled
            ? "Comparing is ON — click to stop; storefront will show product sheet Unit Price only."
            : "Comparing is OFF — click to run; confirmed price sheets will join live price comparison."
        }
        onClick={() => {
          if (enabled) {
            // ON → OFF：直接停止
            startTransition(async () => {
              const res = await togglePriceCompareAction();
              if (res.success) setEnabled(res.enabled);
              setMsg(res.message);
              router.refresh();
            });
            return;
          }
          // OFF → ON：确认后运行比价
          if (!window.confirm("Run price comparison now? Confirmed price sheet prices will go live immediately.")) return;
          startTransition(async () => {
            const res = await togglePriceCompareAction();
            if (res.success) setEnabled(res.enabled);
            setMsg(res.message);
            router.refresh();
          });
        }}
        className={
          enabled
            ? "inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-white bg-emerald-600 border border-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
            : "inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
        }
      >
        {enabled ? (
          <>
            <Square className="w-3 h-3" />
            {pending ? "Stopping..." : "Stop Compare"}
          </>
        ) : (
          <>
            <GitCompareArrows className="w-3 h-3" />
            {pending ? "Comparing..." : "Run Compare"}
          </>
        )}
      </button>
    </div>
  );
}
