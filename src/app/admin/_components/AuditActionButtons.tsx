"use client";

/**
 * 订单审核开关 — Approved / Rejected 两个选项始终显示，可自由切换
 * 默认 Approved；Rejected 状态的订单不允许支付
 * 采购单：Approved 即"通过并提交"（草稿一并 draft → ordered，后端合并处理）
 * 右侧附 Delete 按钮，二次确认后删除订单
 */
import { useTransition } from "react";
import { Check, X, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  approveSalesOrder,
  rejectSalesOrder,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  deleteSalesOrder,
  deletePurchaseOrder,
} from "@/app/actions/adminActions";

type AuditValue = "approved" | "rejected";

interface AuditActionButtonsProps {
  auditId: string;
  auditStatus: string;
  kind: "sales" | "purchase";
  label: string;
}

export function AuditActionButtons({ auditId, auditStatus, kind, label }: AuditActionButtonsProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const current: AuditValue = auditStatus === "rejected" ? "rejected" : "approved";

  const idField = kind === "sales" ? "orderId" : "poId";
  const entityName = kind === "sales" ? "sales order" : "purchase order";

  const switchTo = (next: AuditValue) => {
    if (next === current || pending) return;
    const fd = new FormData();
    fd.set(idField, auditId);
    startTransition(async () => {
      const fn =
        kind === "sales"
          ? next === "approved"
            ? approveSalesOrder
            : rejectSalesOrder
          : next === "approved"
            ? approvePurchaseOrder
            : rejectPurchaseOrder;
      const res = await fn(fd);
      if (res.success) {
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    if (pending) return;
    if (!window.confirm(`Delete ${entityName} "${label}"? This action cannot be undone.`)) return;
    const fd = new FormData();
    fd.set(idField, auditId);
    startTransition(async () => {
      const fn = kind === "sales" ? deleteSalesOrder : deletePurchaseOrder;
      const res = await fn(fd);
      if (res.success) {
        router.refresh();
      } else {
        window.alert(res.message);
      }
    });
  };

  const base =
    "inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium rounded transition-colors disabled:opacity-50";

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => switchTo("approved")}
        disabled={pending}
        title={`Approve ${label}`}
        className={
          current === "approved"
            ? `${base} text-white bg-emerald-600 hover:bg-emerald-700`
            : `${base} text-emerald-700 border border-emerald-200 hover:bg-emerald-50`
        }
      >
        {pending && current === "rejected" ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Check className="w-3 h-3" />
        )}
        Approved
      </button>
      <button
        type="button"
        onClick={() => switchTo("rejected")}
        disabled={pending}
        title={`Reject ${label}`}
        className={
          current === "rejected"
            ? `${base} text-white bg-rose-600 hover:bg-rose-700`
            : `${base} text-rose-600 border border-rose-200 hover:bg-rose-50`
        }
      >
        {pending && current === "approved" ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <X className="w-3 h-3" />
        )}
        Rejected
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        title={`Delete ${label}`}
        className="inline-flex items-center justify-center w-6 h-[22px] text-slate-400 border border-slate-200 rounded hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}
