import Link from "next/link";
import { getOrders } from "@/app/actions/orderActions";
import { getCurrentUserId } from "@/lib/auth";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { OrdersContent } from "./OrdersContent";
import { Package } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Order 订单页 — 中间区域显示当前用户全部订单
 * 支付成功后各订单实时显示发货状态；View Details 查看型号/价格/金额详情
 */
export default async function OrdersPage() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return (
      <div className="flex-1 min-h-0 overflow-y-scroll main-scrollbar">
        <div className="h-0.5 bg-amber-400 shrink-0"></div>
        <div className="px-4 py-16 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Package className="w-10 h-10 text-slate-300" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-1.5">My Orders</h1>
          <p className="text-sm text-slate-500 mb-8">
            Please log in to view your order history.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/auth/customer-login"
              className="inline-flex items-center px-5 py-2.5 rounded bg-[#336633] text-white text-sm font-bold hover:bg-[#2d5a2d] transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/auth/customer-register"
              className="inline-flex items-center px-5 py-2.5 rounded border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors"
            >
              Create login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  let orders;
  try {
    orders = await getOrders();
  } catch (error) {
    // 数据库暂时不可用：显示重试入口，而不是让用户误以为订单全没了
    console.error("Load orders page error:", error);
    return (
      <ServiceUnavailable
        retryHref="/orders"
        message="We couldn't load your orders just now. Your orders are safe — please try again in a moment."
      />
    );
  }

  return <OrdersContent orders={orders} />;
}
