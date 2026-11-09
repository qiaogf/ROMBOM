"use client";

/**
 * Self 切换按钮 — 淡绿 = 客户可自助下单结算；灰色 = 需人工确认后下单。
 * scope="batch"：文件级主开关（ImportBatch.selfOrderAll），对本文件全部型号生效
 * scope="row"：行级开关，只对本型号生效；文件级为绿色时置灰禁用（已被主开关覆盖）
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleBatchSelfOrder, toggleRowSelfOrder } from "@/app/actions/adminActions";

interface Props {
  scope: "batch" | "row";
  importBatchId: string;
  /** pending 批次的暂存行 ID */
  itemId?: string;
  /** approved 批次的线上 ModelPrice ID */
  modelPriceId?: string;
  /** 生效状态（行级传入 selfOrderAll || selfOrder） */
  active: boolean;
  /** 文件级为绿色 / 无权操作时禁用 */
  disabled?: boolean;
}

export function SelfOrderToggle({
  scope,
  importBatchId,
  itemId,
  modelPriceId,
  active,
  disabled = false,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  const onClick = () => {
    setError("");
    const fd = new FormData();
    if (scope === "batch") {
      fd.set("importBatchId", importBatchId);
      fd.set("selfOrderAll", active ? "false" : "true");
    } else if (itemId) {
      fd.set("itemId", itemId);
      fd.set("selfOrder", active ? "false" : "true");
    } else if (modelPriceId) {
      fd.set("modelPriceId", modelPriceId);
      fd.set("selfOrder", active ? "false" : "true");
    } else {
      return;
    }
    startTransition(async () => {
      const res = scope === "batch" ? await toggleBatchSelfOrder(fd) : await toggleRowSelfOrder(fd);
      if (res.success) router.refresh();
      else setError(res.message);
    });
  };

  const hint = error
    || (scope === "batch"
      ? "File-level Self — applies to every model in this file"
      : disabled
        ? "Locked by the file-level Self switch"
        : "Model-level Self — applies to this model only");

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || disabled}
      title={hint}
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap transition-colors disabled:opacity-60 ${
        active
          ? "bg-green-100 border-green-300 text-green-700 hover:bg-green-200"
          : "bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200"
      }`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${active ? "bg-green-500" : "bg-slate-400"}`} />
      <span>Self</span>
    </button>
  );
}
