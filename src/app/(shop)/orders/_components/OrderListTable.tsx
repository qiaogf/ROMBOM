"use client";

// Left panel: historical order list table.
// 2026-11-01: Order No. 点击进入该订单 Order & Payment 页；
// Pay 列改为纯颜色状态（仍有未点 Pay → 绿色；全部已点 → 灰色），不再跳转。

import type { OrderWithItems } from "@/app/actions/orderActions";
import { SO_STATUS_LABEL, soStatusBadgeClass, formatDate } from "./order-helpers";

interface OrderListTableProps {
  orders: OrderWithItems[];
  onOpenOrder: (orderId: string) => void;
  emptyText: string;
}

export function OrderListTable({
  orders,
  onOpenOrder,
  emptyText,
}: OrderListTableProps) {
  return (
    <div className="border border-slate-200 rounded bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-xs">
          <colgroup>
            <col className="w-[21%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
            <col className="w-[11%]" />
            <col className="w-[24%]" />
            <col className="w-[13%]" />
          </colgroup>
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
            <tr>
              <th className="px-1.5 py-1.5 text-left">Order No.</th>
              <th className="px-1.5 py-1.5 text-left">TOTAL</th>
              <th className="px-1.5 py-1.5 text-left">Date</th>
              <th className="px-1.5 py-1.5 text-center">Mode</th>
              <th className="px-1.5 py-1.5 text-center">Pay</th>
              <th className="px-1.5 py-1.5 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length > 0 ? (
              orders.map((order) => {
                const status = order.soStatus ?? "ordered";
                return (
                  <tr key={order.orderId} className="hover:bg-slate-50">
                    <td className="px-1.5 py-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenOrder(order.orderId)}
                        className="text-left font-medium hover:underline text-[#336633]"
                      >
                        {order.orderNumber}
                      </button>
                    </td>
                    <td className="px-1.5 py-1.5 text-left text-slate-700 tabular-nums">
                      ${Number(order.totalAmount).toFixed(2)}
                    </td>
                    <td className="px-1.5 py-1.5 text-slate-600 whitespace-nowrap">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-1.5 py-1.5 text-center">
                      {/* Mode：订单产品全部 Self → Self；否则 Manual */}
                      {order.requiresManualConfirm ? (
                        <span className="inline-flex items-center px-1 py-0.5 text-[9px] font-semibold rounded bg-amber-100 text-amber-700 whitespace-nowrap">
                          Manual
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1 py-0.5 text-[9px] font-semibold rounded bg-emerald-100 text-emerald-700 whitespace-nowrap">
                          Self
                        </span>
                      )}
                    </td>
                    <td className="px-1.5 py-1.5">
                      {/* Pay 指示灯：与 Order Summary 的 Pay 按钮同色（未付深黄 / 已付淡绿） */}
                      <div className="flex items-center justify-center gap-1">
                        <span
                          className={`inline-flex items-center px-1 py-0.5 text-[9px] font-semibold rounded text-white whitespace-nowrap ${
                            order.subtotalPaid ? "bg-emerald-300" : "bg-amber-600"
                          }`}
                        >
                          Goods
                        </span>
                        <span
                          className={`inline-flex items-center px-1 py-0.5 text-[9px] font-semibold rounded text-white whitespace-nowrap ${
                            order.shippingPaid ? "bg-emerald-300" : "bg-amber-600"
                          }`}
                        >
                          Charges
                        </span>
                      </div>
                    </td>
                    <td className="px-1.5 py-1.5">
                      <span
                        className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded ${soStatusBadgeClass(
                          status
                        )}`}
                      >
                        {SO_STATUS_LABEL[status] || status}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-1.5 py-10 text-center text-sm text-slate-400">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
