"use client";

// Left panel: historical order list table.
// Extracted from OrdersContent.tsx (Phase 19) — pure move, zero behavior change.

import { Trash2 } from "lucide-react";
import type { OrderWithItems } from "@/app/actions/orderActions";
import { SO_STATUS_LABEL, soStatusBadgeClass, formatDate } from "./order-helpers";

interface OrderListTableProps {
  orders: OrderWithItems[];
  selectedId: string | null;
  deletingId: string | null;
  onSelect: (orderId: string) => void;
  onPay: (orderId: string) => void;
  onDelete: (orderId: string) => void;
}

export function OrderListTable({
  orders,
  selectedId,
  deletingId,
  onSelect,
  onPay,
  onDelete,
}: OrderListTableProps) {
  return (
    <div className="border border-slate-200 rounded bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-xs">
          <colgroup>
            <col className="w-[26%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[16%]" />
            <col className="w-[14%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
            <tr>
              <th className="px-1.5 py-1.5 text-left">Order No.</th>
              <th className="px-1.5 py-1.5 text-left">Amount</th>
              <th className="px-1.5 py-1.5 text-left">Date</th>
              <th className="px-1.5 py-1.5 text-center">Pay</th>
              <th className="px-1.5 py-1.5 text-left">Status</th>
              <th className="px-1.5 py-1.5 text-center">Del</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length > 0 ? (
              orders.map((order) => {
                const status = order.soStatus ?? "ordered";
                const isSelected = order.orderId === selectedId;
                return (
                  <tr
                    key={order.orderId}
                    className={`hover:bg-slate-50 ${isSelected ? "bg-slate-50" : ""}`}
                  >
                    <td className="px-1.5 py-1.5">
                      <button
                        type="button"
                        onClick={() => onSelect(order.orderId)}
                        className={`text-left font-medium hover:underline ${
                          isSelected ? "text-[#336633]" : "text-slate-800"
                        }`}
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
                      {status === "ordered" && order.auditStatus === "approved" ? (
                        <button
                          type="button"
                          onClick={() => onPay(order.orderId)}
                          className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-semibold text-white bg-[#336633] rounded hover:bg-[#2d5a2d] transition-colors"
                        >
                          Pay
                        </button>
                      ) : status === "ordered" ? (
                        <span className="text-[10px] text-amber-600">{order.auditStatus === "rejected" ? "Rejected" : "Pending"}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
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
                    <td className="px-1.5 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => onDelete(order.orderId)}
                        disabled={deletingId === order.orderId}
                        className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-40"
                        aria-label="Delete order"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-1.5 py-10 text-center text-sm text-slate-400">
                  No orders yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
