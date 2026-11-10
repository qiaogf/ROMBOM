"use client";

// All Charges 补录输入框 — 失焦提交订单 shippingCost，客户订单页 All Charges 同步显示
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSalesOrderShippingCost } from "@/app/actions/adminActions";

export function AllChargesInput({
  orderId,
  value,
}: {
  orderId: string;
  value: number;
}) {
  const [draft, setDraft] = useState(String(value));
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      max={1000000}
      step={0.01}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const v = Number(draft);
        if (!Number.isFinite(v) || v < 0 || v > 1000000) {
          setDraft(String(value));
          return;
        }
        if (v === value) return;
        startTransition(async () => {
          const fd = new FormData();
          fd.set("orderId", orderId);
          fd.set("shippingCost", String(v));
          const res = await updateSalesOrderShippingCost(fd);
          if (res.success) {
            router.refresh();
          } else {
            window.alert(res.message);
            setDraft(String(value));
          }
        });
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      disabled={pending}
      className="w-full max-w-[84px] px-0.5 py-0.5 text-right text-[11px] tabular-nums text-black border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
      aria-label="All Charges"
    />
  );
}
