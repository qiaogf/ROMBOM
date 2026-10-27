"use client";

// Admin order-item qty input — 失焦提交，越界回滚，成功后 router.refresh()
// kind="sales"（默认）→ updateSalesOrderItemQty：重算 item.subtotal 与订单 subtotal/totalAmount
// kind="purchase" → updatePurchaseOrderItemQty：重算 PO totalAmount = Σ(purPrice ?? unitPrice) × qty
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSalesOrderItemQty, updatePurchaseOrderItemQty } from "@/app/actions/adminActions";

interface OrderItemQtyInputProps {
  itemId: string;
  value: number;
  kind?: "sales" | "purchase";
}

export function OrderItemQtyInput({ itemId, value, kind = "sales" }: OrderItemQtyInputProps) {
  // value 0 = 无报价草稿行：输入框显示为空，由采购手动维护
  const [draft, setDraft] = useState(value > 0 ? String(value) : "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <input
      type="number"
      inputMode="numeric"
      min={1}
      max={99999}
      step={1}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const v = Number(draft);
        if (!Number.isInteger(v) || v < 1 || v > 99999 || v === value) {
          setDraft(value > 0 ? String(value) : "");
          return;
        }
        startTransition(async () => {
          const fd = new FormData();
          fd.set("itemId", itemId);
          fd.set("quantity", String(v));
          if (kind === "purchase") await updatePurchaseOrderItemQty(fd);
          else await updateSalesOrderItemQty(fd);
          router.refresh();
        });
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      disabled={pending}
      className="w-full max-w-[48px] px-0.5 py-0.5 text-right text-[11px] tabular-nums border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
      aria-label="Qty"
    />
  );
}
