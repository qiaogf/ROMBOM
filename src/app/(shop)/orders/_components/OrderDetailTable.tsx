"use client";

// Right panel: selected order's item detail table + summary footer.
// Extracted from OrdersContent.tsx (Phase 19) — pure move, zero behavior change.

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { OrderWithItems } from "@/app/actions/orderActions";
import { formatStockStatus } from "./order-helpers";

interface OrderDetailTableProps {
  order: OrderWithItems | null;
}

export function OrderDetailTable({ order }: OrderDetailTableProps) {
  return (
    <div className="border border-slate-200 rounded bg-white overflow-hidden">
      <div className="px-2 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center">
        <h3 className="text-[12px] font-bold text-slate-900">
          {order ? `Order ${order.orderNumber}` : "Order Detail"}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-xs">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[16%]" />
            <col className="w-[18%]" />
            <col className="w-[12%]" />
            <col className="w-[8%]" />
            <col className="w-[24%]" />
          </colgroup>
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
            <tr>
              <th className="px-1.5 py-1 text-left">Model</th>
              <th className="px-1.5 py-1 text-left">Stock Status</th>
              <th className="px-1.5 py-1 text-left">Lead Time</th>
              <th className="px-1.5 py-1 text-right">Unit Price</th>
              <th className="px-1.5 py-1 text-center">Qty</th>
              <th className="px-1.5 py-1 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order ? (
              order.items.map((item) => (
                <tr key={item.itemId} className="hover:bg-slate-50">
                  <td className="px-1.5 py-1 text-slate-700 truncate font-medium" title={item.model ?? ""}>
                    {item.model || "—"}
                  </td>
                  <td className="px-1.5 py-1 text-slate-600">
                    {formatStockStatus(item.stockStatus)}
                  </td>
                  <td className="px-1.5 py-1 text-slate-600">
                    {item.leadTime || "—"}
                  </td>
                  <td className="px-1.5 py-1 text-right text-slate-700 tabular-nums">
                    ${Number(item.unitPrice).toFixed(2)}
                  </td>
                  <td className="px-1.5 py-1 text-center text-slate-700">
                    {item.quantity}
                  </td>
                  <td className="px-1.5 py-1 text-right font-semibold text-slate-900 tabular-nums">
                    ${Number(item.subtotal).toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-1.5 py-10 text-center text-sm text-slate-400">
                  Select an order to view details
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 底部汇总行 */}
      <div className="flex items-center justify-between gap-2 px-2 py-2 border-t border-slate-200 bg-slate-50">
        <div className="text-[12px] text-slate-600">
          Items ({order?.items.length ?? 0}):{" "}
          <span className="text-[13px] font-bold text-slate-900 ml-0.5">
            ${Number(order?.subtotal ?? 0).toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 hover:text-rose-600 transition-colors"
          >
            Clear
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#336633] hover:underline"
          >
            Continue
            <ArrowRight className="w-2.5 h-2.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
