"use client";

/**
 * 供应商 Purchase Order 面板 — 右侧区域
 *
 * 单个表格：表头只在顶部显示一次，多个 PO 的明细按顺序排列
 * Accept：绿色 YES / 灰色 NO 切换按钮（对应管理员端 Accept 状态）
 * 每个 PO 后带 "Items(N): 合计" 小计行，label 与 Leadtime 列对齐
 */
import { Fragment, useState, useTransition } from "react";
import { ShoppingCart, Check, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatLeadtime } from "@/lib/cart-display";
import { formatUSD } from "@/lib/price";
import { togglePurchaseOrderItemAccept, setPurchaseOrderAllItemsAccept } from "@/app/actions/supplier/purchase";
import type { SupplierPurchaseOrder } from "./_data/supplier-import-data";

interface PurchaseOrderPanelProps {
  purchaseOrders: SupplierPurchaseOrder[];
}

export function PurchaseOrderPanel({ purchaseOrders }: PurchaseOrderPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // pending PO id（整单接受/拒绝时显示loading）
  const [pendingPoId, setPendingPoId] = useState<string | null>(null);
  const [acceptMap, setAcceptMap] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const po of purchaseOrders) {
      for (const it of po.items) {
        init[it.itemId] = it.accept;
      }
    }
    return init;
  });

  // 单行切换
  const toggleAccept = (itemId: string, currentAccept: boolean) => {
    if (pending) return;
    const nextAccept = !currentAccept;
    setAcceptMap((prev) => ({ ...prev, [itemId]: nextAccept }));
    startTransition(async () => {
      const res = await togglePurchaseOrderItemAccept(itemId, nextAccept);
      if (!res.success) {
        setAcceptMap((prev) => ({ ...prev, [itemId]: currentAccept }));
      } else {
        router.refresh();
      }
    });
  };

  // 整单一键切换
  const togglePoAllAccept = (poId: string, itemIds: string[], allCurrentlyAccepted: boolean) => {
    if (pending) return;
    const nextAccept = !allCurrentlyAccepted;
    setPendingPoId(poId);
    // 乐观更新：所有 item 一起改
    setAcceptMap((prev) => {
      const next = { ...prev };
      for (const id of itemIds) next[id] = nextAccept;
      return next;
    });
    startTransition(async () => {
      const res = await setPurchaseOrderAllItemsAccept(poId, nextAccept);
      if (!res.success) {
        // 失败回滚
        setAcceptMap((prev) => {
          const next = { ...prev };
          for (const id of itemIds) next[id] = allCurrentlyAccepted;
          return next;
        });
      } else {
        router.refresh();
      }
      setPendingPoId(null);
    });
  };

  if (purchaseOrders.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex flex-col p-2.5">
        <div className="shrink-0 mb-1">
          <h1 className="text-[13px] font-semibold text-slate-800 leading-tight flex items-center gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5 text-green-700" /> Purchase Order
          </h1>
        </div>
        <div className="flex-1 flex items-center justify-center bg-white border border-slate-200 rounded-md">
          <div className="py-8 text-center text-[11px] text-slate-400">No purchase orders yet.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col p-2.5 gap-2 overflow-auto">
      {/* 顶部标题（仅图标+文字，无说明） */}
      <div className="shrink-0">
        <h1 className="text-[13px] font-semibold text-slate-800 leading-tight flex items-center gap-1.5">
          <ShoppingCart className="w-3.5 h-3.5 text-green-700" /> Purchase Order
        </h1>
      </div>

      {/* 统一大表格：所有 PO 的明细 + 小计行 */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <table className="w-full min-w-[720px] text-[11px]">
          <colgroup>
            <col className="w-[14%]" />
            <col className="w-[22%]" />
            <col className="w-[11%]" />
            <col className="w-[7%]" />
            <col className="w-[13%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[9%]" />
          </colgroup>

          {/* 表头：只出现一次 */}
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide sticky top-0 z-10">
            <tr>
              <th className="px-1.5 py-1 text-left">PurOrder</th>
              <th className="px-1.5 py-1 text-left">Model</th>
              <th className="px-1.5 py-1 text-right">PurPrice</th>
              <th className="px-1.5 py-1 text-right">Qty</th>
              <th className="px-1.5 py-1 text-left">Condition</th>
              <th className="px-1.5 py-1 text-left">Leadtime</th>
              <th className="px-1.5 py-1 text-right">Amount</th>
              <th className="px-1.5 py-1 text-center">Accept</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {purchaseOrders.map((po) => {
              const totalAmount = po.items.reduce(
                (sum, it) => sum + Number(it.purPrice) * it.quantity,
                0
              );
              // 整单所有 item 是否全部 accept（乐观本地状态为准）
              const itemIds = po.items.map((it) => it.itemId);
              const allAccepted = itemIds.every((id) => acceptMap[id] ?? false);
              const isPendingThisPo = pendingPoId === po.poId;
              return (
                <Fragment key={po.poId}>
                  {/* PO 的所有明细行 */}
                  {po.items.map((it) => {
                    const purPrice = parseFloat(it.purPrice);
                    const amount = purPrice * it.quantity;
                    const accept = acceptMap[it.itemId] ?? it.accept;
                    return (
                      <tr key={it.itemId} className="hover:bg-slate-50">
                        {/* PurOrder */}
                        <td className="px-1.5 py-1 text-blue-700 truncate">
                          {po.poNumber}
                        </td>
                        {/* Model */}
                        <td className="px-1.5 py-1 text-slate-700 break-all leading-tight" title={`${it.productName} · ${it.model}`}>
                          {it.model}
                        </td>
                        {/* PurPrice */}
                        <td className="px-1.5 py-1 text-right text-slate-700 tabular-nums whitespace-nowrap">
                          {formatUSD(purPrice)}
                        </td>
                        {/* Qty */}
                        <td className="px-1.5 py-1 text-right text-slate-700 tabular-nums">
                          {it.quantity}
                        </td>
                        {/* Condition */}
                        <td className="px-1.5 py-1 text-slate-600">
                          {it.condition ? (
                            <span className="block truncate" title={it.condition}>{it.condition}</span>
                          ) : (
                            <span className="text-slate-400 italic">-</span>
                          )}
                        </td>
                        {/* Leadtime：缺货红 / 现货绿 / 交期琥珀 */}
                        <td className="px-1.5 py-1 whitespace-nowrap">
                          <span className={
                            (it.leadTime ?? "").toLowerCase().includes("out of stock") ? "text-rose-600"
                            : (it.leadTime ?? "").toLowerCase().includes("in stock") ? "text-green-700"
                            : "text-amber-700"
                          }>
                            {formatLeadtime(it.leadTime)}
                          </span>
                        </td>
                        {/* Amount */}
                        <td className="px-1.5 py-1 text-right text-slate-800 font-medium tabular-nums whitespace-nowrap">
                          {formatUSD(amount)}
                        </td>
                        {/* Accept：单行绿色 YES / 灰色 NO 切换按钮 */}
                        <td className="px-1.5 py-1 text-center">
                          <button
                            type="button"
                            onClick={() => toggleAccept(it.itemId, accept)}
                            disabled={pending}
                            title={accept ? "Click to reject this item" : "Click to accept this item"}
                            className={`inline-flex items-center justify-center gap-0.5 w-[52px] h-5 px-1 py-0 rounded-full border text-[10px] font-semibold leading-none transition-colors disabled:opacity-50 ${
                              accept
                                ? "bg-emerald-500 border-emerald-600 text-white hover:bg-emerald-600"
                                : "bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200"
                            }`}
                          >
                            {pending ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : accept ? (
                              <Check className="w-2.5 h-2.5" />
                            ) : (
                              <X className="w-2.5 h-2.5" />
                            )}
                            {accept ? "YES" : "NO"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {/* 小计行：Items(N) label 与 Leadtime 列对齐，Accept 列放整单一键按钮 */}
                  <tr className="bg-slate-50/70">
                    {/* PurOrder / Model / PurPrice / Qty / Condition 五列合并 */}
                    <td colSpan={5} className="px-1.5 py-1"></td>
                    {/* Leadtime 列 → "Items (N):" label */}
                    <td className="px-1.5 py-1 text-left text-[11px] font-semibold text-slate-700">
                      Items ({po.items.length}):
                    </td>
                    {/* Amount 列 → 合计金额 */}
                    <td className="px-1.5 py-1 text-right text-[12px] font-bold text-green-700 tabular-nums whitespace-nowrap">
                      {formatUSD(totalAmount)}
                    </td>
                    {/* Accept 列 → 整单一键 YES/NO 按钮（全部 item 一起切换） */}
                    <td className="px-1.5 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => togglePoAllAccept(po.poId, itemIds, allAccepted)}
                        disabled={pending}
                        title={allAccepted ? "Click to reject all items in this PO" : "Click to accept all items in this PO"}
                        className={`inline-flex items-center justify-center gap-0.5 w-[52px] h-5 px-1 py-0 rounded-full border text-[10px] font-semibold leading-none transition-colors disabled:opacity-50 ${
                          allAccepted
                            ? "bg-emerald-500 border-emerald-600 text-white hover:bg-emerald-600"
                            : "bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {isPendingThisPo ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : allAccepted ? (
                          <Check className="w-2.5 h-2.5" />
                        ) : (
                          <X className="w-2.5 h-2.5" />
                        )}
                        {allAccepted ? "YES" : "NO"}
                      </button>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
