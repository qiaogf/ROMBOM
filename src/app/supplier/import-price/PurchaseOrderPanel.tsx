"use client";

/**
 * 供应商 Purchase Order 面板 — 右侧区域（标题固定，表格独立滚动）
 *
 * 列：Model / Condition / Leadtime / Price / Qty / Amount / Order Status
 * Price / Qty 只读；底部 Total（sticky）
 */
import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { formatLeadtime } from "@/lib/cart-display";
import { formatUSD } from "@/lib/price";

export interface PurchaseItem {
  cartItemId: string;
  model: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  condition: string | null;
  leadTime: string | null;
}

interface PurchaseOrderPanelProps {
  items: PurchaseItem[];
}

type SupplierOrderStatus = "ordered" | "paid" | "shipped" | "delivered";

const ORDER_STATUS_FLOW: SupplierOrderStatus[] = ["ordered", "paid", "shipped", "delivered"];

const ORDER_STATUS_LABEL: Record<SupplierOrderStatus, string> = {
  ordered: "Ordered",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
};

const ORDER_STATUS_STYLE: Record<SupplierOrderStatus, string> = {
  ordered: "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100",
  paid: "bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100",
  shipped: "bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100",
  delivered: "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100",
};

export function PurchaseOrderPanel({ items }: PurchaseOrderPanelProps) {
  // 每行的 Order Status（本地维护，不入库；后续如需持久化需加 schema 字段）
  const [statusMap, setStatusMap] = useState<Record<string, SupplierOrderStatus>>(() => {
    const init: Record<string, SupplierOrderStatus> = {};
    for (const it of items) {
      init[it.cartItemId] = "ordered";
    }
    return init;
  });

  const total = items.reduce(
    (sum, it) => sum + it.quantity * parseFloat(it.unitPrice),
    0
  );

  const cycleStatus = (cartItemId: string) => {
    setStatusMap((prev) => {
      const current = prev[cartItemId] ?? "ordered";
      const idx = ORDER_STATUS_FLOW.indexOf(current);
      const next = ORDER_STATUS_FLOW[(idx + 1) % ORDER_STATUS_FLOW.length];
      return { ...prev, [cartItemId]: next };
    });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col p-2.5">
      {/* 固定标题 */}
      <div className="shrink-0">
        <h1 className="text-[13px] font-semibold text-slate-800 leading-tight flex items-center gap-1.5">
          <ShoppingCart className="w-3.5 h-3.5 text-green-700" /> Purchase Order
        </h1>
        <p className="text-[10px] text-slate-500 mb-1.5 leading-tight">
          Customer intent.
        </p>
      </div>

      {/* 独立滚动区域：订单行随数量伸缩，右侧滑条 */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white border border-slate-200 rounded-md">
        {items.length === 0 ? (
          <div className="py-8 text-center text-[11px] text-slate-400">No purchase orders yet.</div>
        ) : (
          <table className="min-w-full text-xs">
            <colgroup>
              <col className="w-[20ch]" />
              <col className="w-[13%]" />
              <col className="w-[11%]" />
              <col className="w-[13%]" />
              <col className="w-[8%]" />
              <col className="w-[15%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide sticky top-0 z-10">
              <tr>
                <th className="px-1.5 py-1 text-left">Model</th>
                <th className="px-1.5 py-1 text-left">Cond.</th>
                <th className="px-1.5 py-1 text-left">Leadtime</th>
                <th className="px-1.5 py-1 text-right">Price</th>
                <th className="px-1.5 py-1 text-right">Qty</th>
                <th className="px-1.5 py-1 text-right">Amount</th>
                <th className="px-1.5 py-1 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it) => {
                const unitPrice = parseFloat(it.unitPrice);
                const amount = it.quantity * unitPrice;
                const status = statusMap[it.cartItemId] ?? "ordered";
                return (
                  <tr key={it.cartItemId} className="hover:bg-slate-50">
                    <td className="px-1.5 py-1 font-medium text-slate-800" title={`${it.productName} · ${it.model}`}>
                      <span className="block truncate">{it.model}</span>
                    </td>
                    <td className="px-1.5 py-1 text-slate-600">
                      {it.condition ? <span className="block truncate" title={it.condition}>{it.condition}</span> : <span className="text-slate-400 italic">-</span>}
                    </td>
                    <td className="px-1.5 py-1 whitespace-nowrap">
                      {/* Leadtime 统一文本：缺货红 / 现货绿 / 交期琥珀 */}
                      <span className={`whitespace-nowrap ${
                        (it.leadTime ?? "").toLowerCase().includes("out of stock") ? "text-rose-600"
                        : (it.leadTime ?? "").toLowerCase().includes("in stock") ? "text-green-700"
                        : "text-amber-700"
                      }`}>
                        {formatLeadtime(it.leadTime)}
                      </span>
                    </td>
                    <td className="px-1.5 py-1 text-right text-slate-700 tabular-nums whitespace-nowrap">
                      {formatUSD(unitPrice)}
                    </td>
                    <td className="px-1.5 py-1 text-right text-slate-700 tabular-nums">
                      {it.quantity}
                    </td>
                    <td className="px-1.5 py-1 text-right text-slate-800 font-medium tabular-nums whitespace-nowrap">{formatUSD(amount)}</td>
                    <td className="px-1.5 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => cycleStatus(it.cartItemId)}
                        title="Click to cycle to next status"
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold leading-tight transition-colors ${ORDER_STATUS_STYLE[status]}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                        {ORDER_STATUS_LABEL[status]}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 sticky bottom-0 z-10">
              <tr>
                <td colSpan={5} className="px-1.5 py-1 text-right text-[11px] font-semibold text-slate-700">
                  Total
                </td>
                <td className="px-1.5 py-1 text-right text-[13px] font-bold text-green-700 tabular-nums whitespace-nowrap">
                  {formatUSD(total)}
                </td>
                <td className="px-1.5 py-1"></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
