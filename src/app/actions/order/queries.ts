"use server";

// Order read-only server actions.

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { withDbRetry } from "@/lib/db-retry";
import type { Prisma } from "@/../prisma/generated/client";
import type { OrderWithItems } from "./shared";
import { serializeDecimals } from "./shared";
import { generateSalesOrderNumber } from "./mutations/create-shared";

/** 暴露给前端展示用：获取下一个可用销售订单号 */
export async function getNextSalesOrderNumber(): Promise<string> {
  return generateSalesOrderNumber(prisma as unknown as Prisma.TransactionClient);
}

export async function getOrders(customerId?: string): Promise<OrderWithItems[]> {
  const currentCustomerId = customerId || (await getCurrentUserId());
  if (!currentCustomerId) return [];

  // 瞬时连接错误重试一次；仍失败则抛错，由页面展示"暂时不可用"而不是空列表
  const orders = await withDbRetry(() =>
    prisma.salesOrder.findMany({
      // 只要客户在 Order Summary 提交（Submit）过的订单均显示（Self / Manual 均可见）
      where: { customerId: currentCustomerId, submittedAt: { not: null } },
      include: { items: { include: { modelPrice: true } } },
      orderBy: { createdAt: "desc" },
    })
  );

  return serializeDecimals(orders) as OrderWithItems[];
}

/** 获取购物车页展示用的未支付订单（soStatus=ordered 且未从购物车隐藏） */
export async function getUnpaidOrdersForCart(): Promise<OrderWithItems[]> {
  try {
    const customerId = await getCurrentUserId();
    if (!customerId) return [];

    const orders = await prisma.salesOrder.findMany({
      where: {
        customerId,
        soStatus: "ordered",
        hiddenFromCart: false,
      },
      include: { items: { include: { modelPrice: true } } },
      orderBy: { createdAt: "desc" },
    });

    return serializeDecimals(orders) as OrderWithItems[];
  } catch (error) {
    console.error("Get unpaid orders for cart error:", error);
    return [];
  }
}

/** 订单查询结果：区分"确实不存在"与"数据库暂时不可用" */
export type OrderLookup =
  | { status: "ok"; order: OrderWithItems }
  | { status: "not_found" }
  | { status: "unavailable" };

/**
 * 按 ID 查询当前客户的订单。
 * 网络/中继抖动时重试一次；仍失败返回 unavailable，页面据此提示重试而非"订单不存在"。
 */
export async function lookupOrder(orderId: string): Promise<OrderLookup> {
  const customerId = await getCurrentUserId();
  if (!customerId) return { status: "not_found" };

  if (!/^[a-zA-Z0-9_-]+$/.test(orderId) || orderId.length > 255) {
    return { status: "not_found" };
  }

  try {
    const order = (await withDbRetry(() =>
      prisma.salesOrder.findUnique({
        where: { orderId },
        include: { items: { include: { modelPrice: true } } },
      })
    )) as OrderWithItems | null;

    if (!order || order.customerId !== customerId) {
      return { status: "not_found" };
    }

    return { status: "ok", order: serializeDecimals(order) as OrderWithItems };
  } catch (error) {
    console.error("Lookup order error:", error);
    return { status: "unavailable" };
  }
}
