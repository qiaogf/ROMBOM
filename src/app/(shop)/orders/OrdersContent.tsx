"use client";

/**
 * My Orders 页 — 左右分栏（无明细表）
 * 左侧：Status = Ordered / Paid 的订单
 * 右侧：Status = Received 的订单
 * 点击 Order No. 进入该订单的 Order & Payment 页面
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteOrder } from "@/app/actions/orderActions";
import type { OrderWithItems } from "@/app/actions/orderActions";
import { OrderListTable } from "./_components/OrderListTable";

interface OrdersContentProps {
  orders: (OrderWithItems | null)[];
}

function statusOf(order: OrderWithItems): string {
  return order.soStatus ?? "ordered";
}

export function OrdersContent({ orders }: OrdersContentProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  const validOrders = orders.filter(
    (order): order is NonNullable<typeof order> => order !== null
  );

  // 左侧：Ordered / Paid；右侧：Received
  const activeOrders = validOrders.filter((o) => {
    const s = statusOf(o);
    return s === "ordered" || s === "paid";
  });
  const receivedOrders = validOrders.filter((o) => statusOf(o) === "received");

  const handleDelete = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;
    setDeletingId(orderId);
    setError("");
    try {
      const res = await deleteOrder(orderId);
      if (!res.success) {
        setError(res.message);
      } else {
        router.refresh();
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-scroll main-scrollbar">
      <div className="h-0.5 bg-amber-400 shrink-0"></div>
      <div className="px-3 sm:px-4 pt-3 pb-8">
        <div className="mb-4">
          <h1 className="text-lg font-bold text-slate-900">My Orders</h1>
        </div>

        {error && (
          <div
            className="mb-4 px-4 py-2.5 rounded border border-rose-200 bg-rose-50 text-sm text-rose-700"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* 左侧：Ordered / Paid */}
          <div className="md:col-span-1 min-w-0">
            <OrderListTable
              orders={activeOrders}
              deletingId={deletingId}
              onOpenOrder={(orderId) => router.push(`/checkout?orderId=${orderId}`)}
              onDelete={(orderId) => void handleDelete(orderId)}
              emptyText="No orders yet"
            />
          </div>

          {/* 右侧：Received */}
          <div className="md:col-span-1 min-w-0">
            <OrderListTable
              orders={receivedOrders}
              deletingId={deletingId}
              onOpenOrder={(orderId) => router.push(`/checkout?orderId=${orderId}`)}
              onDelete={(orderId) => void handleDelete(orderId)}
              emptyText="No received orders"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
