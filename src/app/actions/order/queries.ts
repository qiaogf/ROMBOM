"use server";

// Order read-only server actions.

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import type { Prisma } from "@/../prisma/generated/client";
import type { OrderWithItems } from "./shared";
import { serializeDecimals } from "./shared";

/** 生成今日日期前缀 YYMMDD，如 260919 */
function getDatePrefix(d: Date = new Date()): string {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

/**
 * 按日期顺序生成销售订单号：YYMMDD-N
 * - 同一天内按顺序递增
 * - 若存在已取消（cancelled）订单的空号，则优先填补最小空号
 */
async function generateSalesOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  const prefix = getDatePrefix();
  const orders = await tx.salesOrder.findMany({
    where: { orderNumber: { startsWith: `${prefix}-` } },
    select: { orderNumber: true, orderStatus: true },
  });

  const taken = new Set<number>();
  const reusable: number[] = [];
  for (const o of orders) {
    const seqPart = o.orderNumber.slice(prefix.length + 1);
    const seq = parseInt(seqPart, 10);
    if (Number.isNaN(seq)) continue;
    if (o.orderStatus === "cancelled") {
      reusable.push(seq);
    } else {
      taken.add(seq);
    }
  }

  // 优先填补未被占用的最小空号（来自已取消订单）
  reusable.sort((a, b) => a - b);
  for (const seq of reusable) {
    if (!taken.has(seq)) {
      return `${prefix}-${seq}`;
    }
  }

  // 否则取最大已用序号 + 1
  let maxSeq = 0;
  for (const seq of taken) {
    if (seq > maxSeq) maxSeq = seq;
  }
  return `${prefix}-${maxSeq + 1}`;
}

/** 暴露给前端展示用：获取下一个可用销售订单号 */
export async function getNextSalesOrderNumber(): Promise<string> {
  return generateSalesOrderNumber(prisma as unknown as Prisma.TransactionClient);
}

export async function getOrders(customerId?: string): Promise<OrderWithItems[]> {
  try {
    const currentCustomerId = customerId || (await getCurrentUserId());
    if (!currentCustomerId) return [];

    const orders = await prisma.salesOrder.findMany({
      where: { customerId: currentCustomerId },
      include: { items: { include: { modelPrice: true } } },
      orderBy: { createdAt: "desc" },
    });

    return serializeDecimals(orders) as OrderWithItems[];
  } catch (error) {
    console.error("Get orders error:", error);
    return [];
  }
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

export async function getOrderById(orderId: string): Promise<OrderWithItems | null> {
  try {
    const customerId = await getCurrentUserId();
    if (!customerId) return null;

    if (!/^[a-zA-Z0-9_-]+$/.test(orderId) || orderId.length > 255) {
      return null;
    }

    const order = await prisma.salesOrder.findUnique({
      where: { orderId },
      include: { items: { include: { modelPrice: true } } },
    }) as OrderWithItems | null;

    if (!order || order.customerId !== customerId) {
      return null;
    }

    return serializeDecimals(order) as OrderWithItems;
  } catch (error) {
    console.error("Get order by id error:", error);
    return null;
  }
}
