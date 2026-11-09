"use client";

/**
 * 导入批次操作按钮组 — 根据审批状态显示不同动作
 * - pending: Confirm (上线) + Reject (驳回) + Delete
 * - approved: Delete（回滚线上数据后删除批次）
 */
import { useState, useTransition } from "react";
import { Check, X, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  confirmImportBatch,
  rejectImportBatch,
  deleteImportBatch,
} from "@/app/actions/adminActions";
import { SelfOrderToggle } from "./SelfOrderToggle";

type Action = "confirm" | "reject" | "delete";

interface BatchActionButtonsProps {
  importBatchId: string;
  fileName: string;
  approvalStatus: "pending" | "approved";
  /** 文件级 Self 主开关状态（true = 本文件全部型号可自助下单）；仅详情页传入，列表页不显示该按钮 */
  selfOrderAll?: boolean;
  /** 紧凑模式：缩小间距/字号/内边距，保证三个按钮单行放下（Product 导航列表使用） */
  compact?: boolean;
}

export function BatchActionButtons({ importBatchId, fileName, approvalStatus, selfOrderAll, compact }: BatchActionButtonsProps) {
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<Action | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  const run = (action: Action) => {
    setError("");
    const fd = new FormData();
    fd.set("importBatchId", importBatchId);
    startTransition(async () => {
      let res: { success: boolean; message: string };
      if (action === "confirm") res = await confirmImportBatch(fd);
      else if (action === "reject") res = await rejectImportBatch(fd);
      else res = await deleteImportBatch(fd);
      if (res.success) {
        setActive(null);
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  };

  // 操作确认中状态
  if (active) {
    const verb =
      active === "confirm" ? "Publish" :
      active === "reject" ? "Reject" : "Delete";
    const tone =
      active === "confirm" ? "bg-emerald-600 hover:bg-emerald-700" :
      active === "reject" ? "bg-slate-600 hover:bg-slate-700" :
      "bg-rose-600 hover:bg-rose-700";
    const note =
      active === "confirm" ? "All staged prices will go live." :
      active === "reject" ? "The staged file and its rows will be permanently removed." :
      "All published prices, products and quotes of this file will be removed.";
    const Icon = active === "confirm" ? Check : active === "reject" ? X : Trash2;

    return (
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[11px] text-slate-700">{verb} <span className="font-medium">{fileName}</span>?</span>
        <span className="text-[11px] text-amber-600">{note}</span>
        <button
          type="button"
          onClick={() => run(active)}
          disabled={pending}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium text-white rounded disabled:opacity-50 ${tone}`}
        >
          {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
          {pending ? "Working..." : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => { setActive(null); setError(""); }}
          disabled={pending}
          className="px-1.5 py-0.5 text-[11px] text-slate-600 hover:text-slate-800"
        >
          Cancel
        </button>
        {error && <span className="text-[11px] text-rose-600">{error}</span>}
      </div>
    );
  }

  const btnBase = compact
    ? "inline-flex items-center gap-0.5 px-0.5 py-0.5 text-[10px] font-medium rounded transition-colors whitespace-nowrap"
    : "inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium rounded transition-colors";

  return (
    <div className={`flex items-center ${compact ? "gap-0.5 whitespace-nowrap" : "gap-1"}`}>
      {approvalStatus === "pending" && (
        <>
          <button
            type="button"
            onClick={() => setActive("confirm")}
            disabled={pending}
            className={`${btnBase} text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50`}
            title="Confirm — publish this batch live"
          >
            <Check className="w-3 h-3" />
            <span>Confirm</span>
          </button>
          <button
            type="button"
            onClick={() => setActive("reject")}
            disabled={pending}
            className={`${btnBase} text-slate-600 hover:text-slate-800 hover:bg-slate-100`}
            title="Reject — remove this pending batch"
          >
            <X className="w-3 h-3" />
            <span>Reject</span>
          </button>
        </>
      )}
      {selfOrderAll !== undefined && (
        <SelfOrderToggle
          scope="batch"
          importBatchId={importBatchId}
          active={selfOrderAll}
          disabled={pending}
        />
      )}
      <button
        type="button"
        onClick={() => setActive("delete")}
        disabled={pending}
        className={`${btnBase} text-rose-600 hover:text-rose-700 hover:bg-rose-50`}
        title={`Delete ${fileName}`}
      >
        <Trash2 className="w-3 h-3" />
        <span>Delete</span>
      </button>
      {error && <span className="text-[11px] text-rose-600">{error}</span>}
    </div>
  );
}
