"use client";

// HS Code 输入框 — 失焦提交
// - mode="item"：单行型号 HS Code，保存后绿色
// - mode="order"：订单统一 HS Code，对本订单全部型号生效
// 未保存时显示系统智能推导值（灰色 placeholder）

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSalesOrderHsCode, updateSalesOrderItemHsCode } from "@/app/actions/adminActions";

export function HsCodeInput({
  mode,
  id,
  value,
  suggested,
  disabled = false,
}: {
  mode: "item" | "order";
  id: string;
  value: string | null;
  /** 系统推导值，作为灰色占位提示 */
  suggested: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const commit = () => {
    const next = draft.trim();
    if (next === (value ?? "")) return;
    startTransition(async () => {
      const result =
        mode === "order"
          ? await updateSalesOrderHsCode(id, next || null)
          : await updateSalesOrderItemHsCode(id, next || null);
      if (result.success) {
        router.refresh();
      } else {
        window.alert(result.message);
        setDraft(value ?? "");
      }
    });
  };

  const colorClass = value ? "text-[#336633] font-semibold" : "text-slate-500";

  return (
    <input
      type="text"
      inputMode="numeric"
      value={draft}
      maxLength={10}
      placeholder={suggested || "HS Code"}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.target as HTMLInputElement).blur();
      }}
      disabled={pending || disabled}
      className={`w-full max-w-[10ch] h-[22px] px-1 text-[11px] leading-none tabular-nums border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-60 ${colorClass}`}
      aria-label="HS Code"
    />
  );
}
