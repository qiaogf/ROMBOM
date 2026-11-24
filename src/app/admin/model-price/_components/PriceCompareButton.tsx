"use client";

// Admin 价格模块 — Run Compare 全局切换开关（持久状态）
// ON（运行）：价格表 Confirm 后参与比价展示；OFF（停止）：前台全部回退产品表 Unit Price
// 自动触发已挂在：价格批次 Confirm 上线 / approved 批次改 Markup / cron（OFF 时短路）
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { togglePriceCompareAction } from "@/app/actions/adminActions";

export function PriceCompareButton({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = () => {
    startTransition(async () => {
      const res = await togglePriceCompareAction();
      if (res.success) setEnabled(res.enabled);
      // 仅在真正完成比价（有可比分组）时展示摘要；停止/无价格表时不显示提示
      setMsg(res.enabled && res.comparedGroups > 0 ? res.message : null);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
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
            run();
            return;
          }
          if (!window.confirm("Run price comparison now? Confirmed price sheet prices will go live immediately.")) return;
          run();
        }}
        className={
          enabled
            ? "inline-flex w-[112px] items-center justify-center whitespace-nowrap px-3 py-1 text-[11px] font-medium leading-4 text-white bg-emerald-600 border border-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
            : "inline-flex w-[112px] items-center justify-center whitespace-nowrap px-3 py-1 text-[11px] font-medium leading-4 text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
        }
      >
        {enabled ? (pending ? "Stopping..." : "Stop Compare") : pending ? "Comparing..." : "Run Compare"}
      </button>
      {msg && (
        <span className="text-[10px] text-slate-500 max-w-[320px] truncate" title={msg}>
          {msg}
        </span>
      )}
    </div>
  );
}
