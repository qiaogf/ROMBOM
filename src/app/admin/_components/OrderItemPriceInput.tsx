"use client";

// Admin order-item price input — 失焦提交，越界回滚，成功后 router.refresh()
// kind="sales"   → updateSalesOrderItemPrice（ListPrice 列，实际销售价 finalSellPrice）
// kind="purchase" → updatePurchaseOrderItemPurPrice（PurPrice 列，实际采购价 purPrice）
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateSalesOrderItemPrice,
  updatePurchaseOrderItemPurPrice,
} from "@/app/actions/adminActions";

interface OrderItemPriceInputProps {
  kind: "sales" | "purchase";
  itemId: string;
  value: number;
  /** 覆盖输入框最大宽度（默认 64px） */
  widthClass?: string;
}

export function OrderItemPriceInput({ kind, itemId, value, widthClass = "max-w-[64px]" }: OrderItemPriceInputProps) {
  // value 0 = 无报价草稿行：输入框显示为空，由采购手动维护
  const [draft, setDraft] = useState(value > 0 ? String(value) : "");
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
        if (!Number.isFinite(v) || v <= 0 || v > 1000000 || v === value) {
          setDraft(value > 0 ? String(value) : "");
          return;
        }
        startTransition(async () => {
          const fd = new FormData();
          fd.set("itemId", itemId);
          if (kind === "sales") {
            fd.set("price", String(v));
            await updateSalesOrderItemPrice(fd);
          } else {
            fd.set("purPrice", String(v));
            await updatePurchaseOrderItemPurPrice(fd);
          }
          router.refresh();
        });
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      disabled={pending}
      className={`w-full ${widthClass} px-0.5 py-0.5 text-right text-[11px] tabular-nums text-black border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50`}
      aria-label={kind === "sales" ? "ListPrice" : "PurPrice"}
    />
  );
}
