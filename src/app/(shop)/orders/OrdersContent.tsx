"use client";

/**
 * My Orders 页 — 左右分栏
 * 左侧：历史订单列表（订单号 / 金额 / 日期 / Pay / 订单状态 / 删除）
 * 右侧：选中订单的明细（Model / Stock Status / Lead Time / Unit Price / Qty / Subtotal）
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteOrder } from "@/app/actions/orderActions";
import type { OrderWithItems } from "@/app/actions/orderActions";
import { OrderListTable } from "./_components/OrderListTable";
import { OrderDetailTable } from "./_components/OrderDetailTable";

interface OrdersContentProps {
  orders: (OrderWithItems | null)[];
}

export function OrdersContent({ orders }: OrdersContentProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();

  const validOrders = orders.filter(
    (order): order is NonNullable<typeof order> => order !== null
  );

  // 默认选中第一笔订单
  useEffect(() => {
    if (!selectedId && validOrders.length > 0) {
      setSelectedId(validOrders[0].orderId);
    }
    if (selectedId && !validOrders.find((o) => o.orderId === selectedId)) {
      setSelectedId(validOrders[0]?.orderId ?? null);
    }
  }, [validOrders, selectedId]);

  const selectedOrder = validOrders.find((o) => o.orderId === selectedId) ?? null;

  const handleDelete = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;
    setDeletingId(orderId);
    setError("");
    try {
      const res = await deleteOrder(orderId);
      if (!res.success) {
        setError(res.message);
      } else {
        if (selectedId === orderId) setSelectedId(null);
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
          {/* ===== 左侧：历史订单列表 ===== */}
          <div className="md:col-span-1 min-w-0">
            <OrderListTable
              orders={validOrders}
              selectedId={selectedId}
              deletingId={deletingId}
              onSelect={setSelectedId}
              onPay={(orderId) => router.push(`/checkout?orderId=${orderId}`)}
              onDelete={(orderId) => void handleDelete(orderId)}
            />
          </div>

          {/* ===== 右侧：订单明细 ===== */}
          <div className="md:col-span-1 min-w-0">
            <OrderDetailTable order={selectedOrder} />
          </div>
        </div>
      </div>
    </div>
  );
}
