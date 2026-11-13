"use client";

// 订单商务条款下拉（Payment Terms / Payment Method / Delivery Terms）
// - customer：未锁定时可选，管理员锁定后显示绿色且只读
// - admin：可自由修改，修改即锁定并同步给客户

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrderTerm } from "@/app/actions/orderActions";
import { updateSalesOrderTerms } from "@/app/actions/adminActions";
import { DEFAULT_ORDER_TERMS, type OrderTermField } from "@/lib/order-terms";

export function OrderTermsSelect({
  orderId,
  field,
  options,
  value,
  locked,
  mode,
  compact = false,
  className = "",
}: {
  orderId: string;
  field: OrderTermField;
  options: readonly string[];
  value: string | null;
  locked: boolean;
  mode: "customer" | "admin";
  /** 紧凑模式：字号更小，用于客户结算页 */
  compact?: boolean;
  className?: string;
}) {
  const savedValue = value && options.includes(value) ? value : "";
  const defaultValue = DEFAULT_ORDER_TERMS[field];
  const [draft, setDraft] = useState(savedValue || defaultValue);
  const [hasSelection, setHasSelection] = useState(Boolean(savedValue));
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const disabled = pending || (mode === "customer" && locked);

  const handleChange = (next: string) => {
    setDraft(next);
    setHasSelection(Boolean(next));
    startTransition(async () => {
      const payload = next || null;
      const result =
        mode === "admin"
          ? await updateSalesOrderTerms(orderId, field, payload)
          : await updateOrderTerm(orderId, field, payload);
      if (result.success) {
        router.refresh();
      } else {
        window.alert(result.message);
        setDraft(savedValue || defaultValue);
        setHasSelection(Boolean(savedValue));
      }
    });
  };

  const colorClass = locked
    ? "text-[#336633] font-semibold"
    : hasSelection
      ? "text-black"
      : "text-slate-400";

  return (
    <select
      value={draft}
      onChange={(event) => handleChange(event.target.value)}
      disabled={disabled}
      className={`h-[22px] px-1 leading-none ${compact ? "text-[12px]" : "text-[11px]"} bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#336633] disabled:bg-slate-50 disabled:cursor-not-allowed ${colorClass} ${
        className || "w-full"
      }`}
    >
      {options.map((option) => (
        <option
          key={option}
          value={option}
          onClick={() => {
            // 首次直接选择当前默认值时不会触发 change，需单独保存该选择。
            if (!hasSelection && option === draft) handleChange(option);
          }}
        >
          {option}
        </option>
      ))}
    </select>
  );
}
