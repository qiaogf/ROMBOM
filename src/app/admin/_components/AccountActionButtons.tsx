"use client";

/**
 * 账号操作按钮组 — 与 Price 页 BatchActionButtons 风格一致
 * - Confirm：启用账号（isActive = true），已启用时禁用
 * - Reject：停用账号（isActive = false），已停用时禁用
 * - Delete：删除账号（二次内联确认）
 */
import { useState, useTransition } from "react";
import { Check, X, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  confirmCustomer,
  rejectCustomer,
  deleteCustomer,
  confirmSupplier,
  rejectSupplier,
  deleteSupplier,
  confirmAdmin,
  rejectAdmin,
  deleteAdmin,
} from "@/app/actions/adminActions";

type Entity = "customer" | "supplier" | "admin";
type Action = "confirm" | "reject" | "delete";

interface AccountActionButtonsProps {
  entity: Entity;
  id: string;
  label: string;
  isActive: boolean;
  /** 是否显示 Reject（停用）按钮，默认显示；Customer 列表只保留 Confirm / Delete */
  showReject?: boolean;
}

const ID_FIELD: Record<Entity, string> = {
  customer: "customerId",
  supplier: "supplierId",
  admin: "adminId",
};

export function AccountActionButtons({ entity, id, label, isActive, showReject = true }: AccountActionButtonsProps) {
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<Action | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  const run = (action: Action) => {
    setError("");
    const fd = new FormData();
    fd.set(ID_FIELD[entity], id);
    startTransition(async () => {
      const actions = {
        customer: { confirm: confirmCustomer, reject: rejectCustomer, delete: deleteCustomer },
        supplier: { confirm: confirmSupplier, reject: rejectSupplier, delete: deleteSupplier },
        admin: { confirm: confirmAdmin, reject: rejectAdmin, delete: deleteAdmin },
      } as const;
      const res = await actions[entity][action](fd);
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
      active === "confirm" ? "Activate" :
      active === "reject" ? "Deactivate" : "Delete";
    const tone =
      active === "confirm" ? "bg-emerald-600 hover:bg-emerald-700" :
      active === "reject" ? "bg-slate-600 hover:bg-slate-700" :
      "bg-rose-600 hover:bg-rose-700";
    const note =
      active === "confirm" ? "The account will be able to log in." :
      active === "reject" ? "The account will be blocked from logging in." :
      "This account and related data will be permanently removed.";
    const Icon = active === "confirm" ? Check : active === "reject" ? X : Trash2;

    return (
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[11px] text-slate-700">{verb} <span className="font-medium">{label}</span>?</span>
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

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setActive("confirm")}
        disabled={pending || isActive}
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
        title="Confirm — activate this account"
      >
        <Check className="w-3 h-3" />
        <span>Confirm</span>
      </button>
      {showReject && (
        <button
          type="button"
          onClick={() => setActive("reject")}
          disabled={pending || !isActive}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          title="Reject — deactivate this account"
        >
          <X className="w-3 h-3" />
          <span>Reject</span>
        </button>
      )}
      <button
        type="button"
        onClick={() => setActive("delete")}
        disabled={pending}
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors disabled:opacity-50"
        title={`Delete ${label}`}
      >
        <Trash2 className="w-3 h-3" />
      </button>
      {error && <span className="text-[11px] text-rose-600">{error}</span>}
    </div>
  );
}
