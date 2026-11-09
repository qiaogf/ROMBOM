"use client";

// 销售订单状态选择：ordered（默认）→ paid（已付全款）→ received（已收货）
// 保存后刷新列表，客户 My Orders 的 Status 同步显示

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSalesOrderStatus } from "@/app/actions/adminActions";

const STATUS_OPTIONS = ["ordered", "paid", "received"] as const;

export function SalesOrderStatusSelect({
  orderId,
  value,
}: {
  orderId: string;
  value: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [current, setCurrent] = useState<string>(value ?? "ordered");

  const handleChange = (next: string) => {
    setCurrent(next);
    const fd = new FormData();
    fd.set("orderId", orderId);
    fd.set("status", next);
    startTransition(async () => {
      const res = await updateSalesOrderStatus(fd);
      if (res.success) router.refresh();
      else window.alert(res.message);
    });
  };

  return (
    <select
      value={(STATUS_OPTIONS as readonly string[]).includes(current) ? current : "ordered"}
      onChange={(e) => handleChange(e.target.value)}
      disabled={pending}
      className="w-full border border-slate-300 rounded px-0.5 py-0.5 text-[11px] text-slate-900 bg-white capitalize focus:outline-none focus:border-[#336633] focus:ring-1 focus:ring-[#336633] disabled:opacity-60"
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
