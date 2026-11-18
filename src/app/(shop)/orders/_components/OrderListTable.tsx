"use client";

// Left panel: historical order list table.
// 2026-11-01: Order No. 点击进入该订单 Order & Payment 页；
// Pay 列改为纯颜色状态（仍有未点 Pay → 绿色；全部已点 → 灰色），不再跳转。
// 2026-11-18: Status 列改为生命周期状态（Draft / Pending / Rejected / Approved / Cancelled），与 Order & Payment 页状态框一致。

import type { OrderWithItems } from "@/app/actions/orderActions";
import { resolveOrderLifecycle, STATUS_META } from "@/app/actions/order/status-machine";
import { formatDate } from "./order-helpers";

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
      {/* scrollbar-gutter:stable — 左右两栏始终预留同宽滚动条空间，避免一侧出竖向滚动条时列宽被压窄 */}
      <div className="overflow-auto max-h-[70dvh] [scrollbar-gutter:stable]">
        {/* min-w：窄屏（手机）下保持各列最小宽度，超出走横向滚动；
            否则 table-fixed 会把 TOTAL 列压到 30px 左右，金额溢出与 DATE 列重叠 */}
        <table className="w-full table-fixed text-xs min-w-[760px]">
          <colgroup>
            <col className="w-[10%]" />
            <col className="w-[27%]" />
            <col className="w-[14%]" />
            <col className="w-[10%]" />
            <col className="w-[14%]" />
            <col className="w-[10%]" />
            {/* 尾部留白列：保证 Date 后右侧留出空白区 */}
            <col className="w-[15%]" />
          </colgroup>
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
            <tr>
              <th className="px-1.5 py-1.5 text-left">Order No.</th>
              <th className="px-1.5 py-1.5 text-center">Pay</th>
              <th className="px-1.5 py-1.5 text-left">Status</th>
              <th className="px-1.5 py-1.5 text-center">Mode</th>
              <th className="px-1.5 py-1.5 text-left">TOTAL</th>
              <th className="px-1.5 py-1.5 text-left">Date</th>
              <th aria-hidden />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length > 0 ? (
              orders.map((order) => {
                const lifecycle = resolveOrderLifecycle(order);
                const meta = STATUS_META[lifecycle];
                return (
                  <tr key={order.orderId} className="hover:bg-slate-50">
                    <td className="px-1.5 py-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenOrder(order.orderId)}
                        title={order.orderNumber}
                        className="block max-w-full truncate text-left font-medium hover:underline text-[#336633]"
                      >
                        {order.orderNumber}
                      </button>
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
                      {/* 生命周期状态徽章：与 Order & Payment 页状态框同文案/同配色 */}
                      <span
                        className="inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded text-white"
                        style={{ backgroundColor: meta.color }}
                      >
                        {meta.label}
                      </span>
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
                    <td className="px-1.5 py-1.5 text-left text-slate-700 tabular-nums">
                      ${Number(order.totalAmount).toFixed(2)}
                    </td>
                    <td className="px-1.5 py-1.5 text-slate-600 whitespace-nowrap">
                      {formatDate(order.createdAt)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-1.5 py-10 text-center text-sm text-slate-400">
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
