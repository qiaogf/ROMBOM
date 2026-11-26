"use server";

// Order read-only server actions.

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { withDbRetry } from "@/lib/db-retry";
import type { OrderWithItems } from "./shared";
import { serializeDecimals } from "./shared";

export async function getOrders(customerId?: string): Promise<OrderWithItems[]> {
  const currentCustomerId = customerId || (await getCurrentUserId());
  if (!currentCustomerId) return [];

  // 瞬时连接错误重试一次；仍失败则抛错，由页面展示"暂时不可用"而不是空列表
  // 不按 submittedAt 过滤：Draft / Pending / Approved / Rejected / Cancelled 全量返回，与管理端订单列表对齐
  const orders = await withDbRetry(() =>
    prisma.salesOrder.findMany({
      where: { customerId: currentCustomerId },
      include: { items: { include: { modelPrice: true } } },
      orderBy: { createdAt: "desc" },
    })
  );

  return serializeDecimals(orders) as OrderWithItems[];
}

/** 订单查询结果：区分"确实不存在"与"数据库暂时不可用" */
type OrderLookup =
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
