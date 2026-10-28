/**
 * 订单锁价 / 锁库存
 *
 * 规则：
 *  - 客户提交购物车 → 快照锁定当前价格，锁价 48 小时，同时软预留库存
 *  - 48 小时内完成支付 → 订单正常推进（预留转为实际占用，不再释放）
 *  - 逾期未支付 → 自动取消订单、释放预留库存、商品退回购物车（价格重新跟随实时比价）
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/../prisma/generated/client";

/** 锁价时长（小时） */
export const PRICE_LOCK_HOURS = 48;

export function computeLockExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + PRICE_LOCK_HOURS * 60 * 60 * 1000);
}

/**
 * 在订单创建事务内软预留库存。
 * 只有引用了 ModelPrice / SupplierQuote 的行才需要预留。
 */
export async function reserveStockForItems(
  tx: Prisma.TransactionClient,
  items: { modelPriceId?: string | null; quoteId?: string | null; quantity: number }[]
): Promise<void> {
  for (const item of items) {
    if (item.modelPriceId) {
      await tx.modelPrice.update({
        where: { modelPriceId: item.modelPriceId },
        data: { reservedQuantity: { increment: item.quantity } },
      });
    } else if (item.quoteId) {
      await tx.supplierQuote.update({
        where: { quoteId: item.quoteId },
        data: { reservedQuantity: { increment: item.quantity } },
      });
    }
  }
}

/**
 * 清扫逾期未支付的订单：取消订单 → 释放预留库存 → 商品退回购物车。
 * 返回处理结果统计。
 */
export async function releaseExpiredOrders(now: Date = new Date()): Promise<{
  ordersCancelled: number;
  itemsReturned: number;
}> {
  const expired = await prisma.salesOrder.findMany({
    where: {
      lockExpiresAt: { not: null, lt: now },
      stockLocked: true,
      orderStatus: { not: "cancelled" },
      paymentStatus: "pending",
    },
    select: { orderId: true, customerId: true },
    take: 200,
  });
  if (expired.length === 0) return { ordersCancelled: 0, itemsReturned: 0 };

  let ordersCancelled = 0;
  let itemsReturned = 0;

  for (const order of expired) {
    try {
      await prisma.$transaction(async (tx) => {
        const full = await tx.salesOrder.findUnique({
          where: { orderId: order.orderId },
          include: { items: true },
        });
        // 事务内复查，防并发重复处理
        if (!full || !full.stockLocked || full.orderStatus === "cancelled" || full.paymentStatus !== "pending") return;

        // ① 释放预留库存（读当前值后回写，确保不低于 0）
        for (const item of full.items) {
          if (item.modelPriceId) {
            const row = await tx.modelPrice.findUnique({
              where: { modelPriceId: item.modelPriceId },
              select: { reservedQuantity: true },
            });
            if (row) {
              await tx.modelPrice.update({
                where: { modelPriceId: item.modelPriceId },
                data: { reservedQuantity: Math.max(0, row.reservedQuantity - item.quantity) },
              });
            }
          } else if (item.quoteId) {
            const row = await tx.supplierQuote.findUnique({
              where: { quoteId: item.quoteId },
              select: { reservedQuantity: true },
            });
            if (row) {
              await tx.supplierQuote.update({
                where: { quoteId: item.quoteId },
                data: { reservedQuantity: Math.max(0, row.reservedQuantity - item.quantity) },
              });
            }
          }
        }

        // ② 取消订单
        await tx.salesOrder.update({
          where: { orderId: full.orderId },
          data: {
            orderStatus: "cancelled",
            soStatus: "cancelled",
            paymentStatus: "cancelled",
            stockLocked: false,
          },
        });

        // ③ 商品退回购物车（价格不落库，购物车读取时跟随实时比价）
        const cart =
          (await tx.cart.findFirst({ where: { customerId: order.customerId } })) ??
          (await tx.cart.create({ data: { customerId: order.customerId } }));

        for (const item of full.items) {
          if (item.modelPriceId) {
            const existing = await tx.cartItem.findFirst({
              where: { cartId: cart.cartId, modelPriceId: item.modelPriceId },
            });
            if (existing) {
              await tx.cartItem.update({
                where: { itemId: existing.itemId },
                data: { quantity: existing.quantity + item.quantity },
              });
            } else {
              await tx.cartItem.create({
                data: {
                  cartId: cart.cartId,
                  modelPriceId: item.modelPriceId,
                  productId: item.productId,
                  quantity: item.quantity,
                },
              });
            }
            itemsReturned++;
          } else if (item.quoteId) {
            const existing = await tx.cartItem.findFirst({
              where: { cartId: cart.cartId, quoteId: item.quoteId },
            });
            if (existing) {
              await tx.cartItem.update({
                where: { itemId: existing.itemId },
                data: { quantity: existing.quantity + item.quantity },
              });
            } else {
              await tx.cartItem.create({
                data: {
                  cartId: cart.cartId,
                  quoteId: item.quoteId,
                  productId: item.productId,
                  quantity: item.quantity,
                },
              });
            }
            itemsReturned++;
          }
        }

        ordersCancelled++;
      });
    } catch {
      // 单笔订单失败不影响其余订单处理
    }
  }

  return { ordersCancelled, itemsReturned };
}
