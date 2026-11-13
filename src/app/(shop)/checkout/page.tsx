import Link from "next/link";
import { lookupOrder } from "@/app/actions/orderActions";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { CheckoutContent } from "./CheckoutContent";
import { ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Order 结算页 — 由 Cart 页 Submit Order 创建订单后跳转进入（?orderId=xxx）
 * 填写收货信息（联系人/电话/地址）→ Pay Now 支付（更新订单 + 标记已支付）
 * 未登录 / 无有效订单：友好提示页
 */
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  const user = await getCurrentUser();
  const lookup = orderId && user ? await lookupOrder(orderId) : null;

  if (!user) {
    return (
      <div className="flex-1 min-h-0 overflow-y-scroll main-scrollbar">
        <div className="h-0.5 bg-amber-400 shrink-0"></div>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Order &amp; Payment</h1>
          <p className="text-slate-500 mb-8">Please log in to proceed with your order.</p>
          <Link
            href="/auth/customer-login"
            className="inline-flex items-center px-6 py-2.5 rounded bg-[#336633] text-white text-sm font-bold hover:bg-[#2d5a2d] transition-colors"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  // 数据库/中继暂时不可用：不伪装成"订单不存在"，给出来重试入口
  if (lookup?.status === "unavailable") {
    return (
      <ServiceUnavailable
        retryHref={orderId ? `/checkout?orderId=${encodeURIComponent(orderId)}` : "/cart"}
        message="We couldn't load this order just now. It has not been deleted — please try again in a moment."
      />
    );
  }

  const order = lookup?.status === "ok" ? lookup.order : null;

  if (!order || order.items.length === 0) {
    return (
      <div className="flex-1 min-h-0 overflow-y-scroll main-scrollbar">
        <div className="h-0.5 bg-amber-400 shrink-0"></div>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Order not found</h1>
          <p className="text-slate-500 mb-8">Please add items to your cart and submit a new order.</p>
          <Link
            href="/cart"
            className="inline-flex items-center px-6 py-2.5 rounded bg-[#336633] text-white text-sm font-bold hover:bg-[#2d5a2d] transition-colors"
          >
            Go to Cart
          </Link>
        </div>
      </div>
    );
  }

  const defaultName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  // 最近一次填写过的收货信息（下单支付时回写到 Customer），用于输入框灰色提示
  // 该查询失败不应阻断结算页：退回空值，客户按占位提示重新填写即可
  let savedShipping: {
    contactName: string | null;
    phone: string | null;
    country: string | null;
    city: string | null;
    address: string | null;
    zip: string | null;
    notes: string | null;
  } | null = null;
  try {
    const [customer, latestPort] = await Promise.all([
      prisma.customer.findUnique({
        where: { customerId: user.id },
        select: { contactName: true, phone: true, country: true, city: true, address: true, zip: true },
      }),
      prisma.salesOrder.findFirst({
        where: { customerId: user.id, customerNote: { not: null } },
        orderBy: { updatedAt: "desc" },
        select: { customerNote: true },
      }),
    ]);
    savedShipping = customer ? { ...customer, notes: latestPort?.customerNote ?? null } : null;
  } catch (error) {
    console.error("Load saved shipping error:", error);
  }

  return <CheckoutContent order={order} defaultName={defaultName} savedShipping={savedShipping} />;
}
