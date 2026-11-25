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
            ? "Comparing is ON — click to stop; storefront will show product sheet price only."
            : "Comparing is OFF — click to run; price sheet comparison prices will go live."
        }
        onClick={run}
        className={
          enabled
            ? "inline-flex w-[80px] items-center justify-center whitespace-nowrap px-2 py-1 text-[11px] font-medium text-green-700 bg-green-50 border border-orange-400 rounded-md hover:bg-green-100 disabled:opacity-50"
            : "inline-flex w-[80px] items-center justify-center whitespace-nowrap px-2 py-1 text-[11px] font-medium text-slate-500 border border-orange-400 rounded-md hover:bg-orange-50 disabled:opacity-50"
        }
      >
        Compare
      </button>
      {msg && (
        <span className="text-[10px] text-slate-500 max-w-[320px] truncate" title={msg}>
          {msg}
        </span>
      )}
    </div>
  );
}
