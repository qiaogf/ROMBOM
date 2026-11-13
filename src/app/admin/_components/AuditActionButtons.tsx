"use client";

/**
 * 订单审核开关
 * sales:    Approved / Rejected 两选项切换（Rejected 不允许支付）+ Delete
 * purchase: Approve（发给供应商）/ Withdraw（撤回，回 pending 供应商不可见）+ Delete
 *           draft 采购单额外显示 Submit（提交审批 draft → ordered）
 */
import { useTransition } from "react";
import { Check, X, Trash2, Loader2, Send, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { canAdminApproveOrReject, canAdminCancel } from "@/app/actions/order/status-machine";
import {
  approveSalesOrder,
  rejectSalesOrder,
  cancelSalesOrder,
  approvePurchaseOrder,
  withdrawPurchaseOrder,
  submitPurchaseOrder,
  deleteSalesOrder,
  deletePurchaseOrder,
} from "@/app/actions/adminActions";

interface AuditActionButtonsProps {
  auditId: string;
  auditStatus: string;
  kind: "sales" | "purchase";
  label: string;
  poStatus?: string; // purchase 专用：draft 时显示 Submit（提交审批）按钮
  submittedAt?: string | null; // sales 专用：未提交的 Draft 不允许 Approve / Reject
  cancelRequestedAt?: string | null; // sales 专用：客户已提交取消申请的时间
}

export function AuditActionButtons({
  auditId,
  auditStatus,
  kind,
  label,
  poStatus,
  submittedAt,
  cancelRequestedAt,
}: AuditActionButtonsProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const idField = kind === "sales" ? "orderId" : "poId";
  const entityName = kind === "sales" ? "sales order" : "purchase order";

  const run = (fn: (fd: FormData) => Promise<{ success: boolean; message: string }>) => {
    if (pending) return;
    const fd = new FormData();
    fd.set(idField, auditId);
    startTransition(async () => {
      const res = await fn(fd);
      if (res.success) router.refresh();
    });
  };

  const submitDraft = () => {
    if (pending) return;
    const fd = new FormData();
    fd.set("poId", auditId);
    startTransition(async () => {
      const res = await submitPurchaseOrder(fd);
      if (res.success) router.refresh();
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

  const deleteButton = (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      title={`Delete ${label}`}
      className="inline-flex items-center justify-center w-6 h-[22px] text-slate-400 border border-slate-200 rounded hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50"
    >
      <Trash2 className="w-3 h-3" />
    </button>
  );

  // purchase：Approve（发给供应商）/ Withdraw（撤回）/ Delete
  if (kind === "purchase") {
    const isApproved = auditStatus === "approved";
    return (
      <div className="flex items-center gap-1">
        {/* 草稿采购单：Submit（提交审批）draft → ordered */}
        {poStatus === "draft" && (
          <button
            type="button"
            onClick={submitDraft}
            disabled={pending}
            title={`Submit ${label} for approval`}
            className={`${base} text-white bg-blue-600 hover:bg-blue-700`}
          >
            {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Submit
          </button>
        )}
        <button
          type="button"
          onClick={() => !isApproved && run(approvePurchaseOrder)}
          disabled={pending || isApproved}
          title={`Approve ${label} and send to supplier`}
          className={
            isApproved
              ? `${base} text-white bg-emerald-600`
              : `${base} text-emerald-700 border border-emerald-200 hover:bg-emerald-50`
          }
        >
          {pending && !isApproved ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Check className="w-3 h-3" />
          )}
          Approve
        </button>
        <button
          type="button"
          onClick={() => isApproved && run(withdrawPurchaseOrder)}
          disabled={pending || !isApproved}
          title={`Withdraw ${label} from supplier`}
          className={
            !isApproved
              ? `${base} text-slate-500 border border-slate-200`
              : `${base} text-amber-700 border border-amber-200 hover:bg-amber-50`
          }
        >
          {pending && isApproved ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Undo2 className="w-3 h-3" />
          )}
          Withdraw
        </button>
        {deleteButton}
      </div>
    );
  }

  // sales：Approve / Reject（仅 Pending 可用）/ Cancel（Approved 且有取消申请）/ Delete（始终可用）
  const current = auditStatus === "rejected" ? "rejected" : auditStatus === "pending" ? "pending" : "approved";
  const canApproveOrReject = canAdminApproveOrReject({ submittedAt: submittedAt ?? null, auditStatus });
  const canCancel = canAdminCancel(auditStatus, cancelRequestedAt);

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => canApproveOrReject && run(approveSalesOrder)}
        disabled={pending || !canApproveOrReject}
        title={canApproveOrReject ? `Approve ${label}` : "Only pending orders can be approved"}
        className={
          current === "approved"
            ? `${base} text-white bg-emerald-600`
            : `${base} text-emerald-700 border border-emerald-200 hover:bg-emerald-50`
        }
      >
        {pending && canApproveOrReject ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Check className="w-3 h-3" />
        )}
        Approve
      </button>
      <button
        type="button"
        onClick={() => canApproveOrReject && run(rejectSalesOrder)}
        disabled={pending || !canApproveOrReject}
        title={canApproveOrReject ? `Reject ${label}` : "Only pending orders can be rejected"}
        className={
          current === "rejected"
            ? `${base} text-white bg-rose-600`
            : `${base} text-rose-600 border border-rose-200 hover:bg-rose-50`
        }
      >
        {pending && canApproveOrReject ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <X className="w-3 h-3" />
        )}
        Reject
      </button>
      <button
        type="button"
        onClick={() => canCancel && run(cancelSalesOrder)}
        disabled={pending || !canCancel}
        title={
          canCancel
            ? `Approve the customer's cancellation request for ${label}`
            : "Cancel is available only for approved orders with a customer cancellation request"
        }
        className={
          canCancel
            ? `${base} text-white bg-slate-600 hover:bg-slate-700`
            : `${base} text-slate-500 border border-slate-200`
        }
      >
        {pending && canCancel ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Undo2 className="w-3 h-3" />
        )}
        Cancel
      </button>
      {deleteButton}
    </div>
  );
}
