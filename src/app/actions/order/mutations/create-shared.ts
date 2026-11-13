// Shared helpers for order creation — used by both create-from-cart and create-full.
// No "use server" boundary: these are internal helpers, not re-exported through the barrel.

import type { Prisma } from "@/../prisma/generated/client";
import { Prisma as PrismaNS } from "@/../prisma/generated/client";

/** 生成今日日期前缀 YYMMDD，如 260919 */
export function getDatePrefix(d: Date = new Date()): string {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

/**
 * 按日期顺序生成销售订单号：YYMMDD-N
 * - 同一天内按顺序递增，取当天所有订单（含已取消）的最大序号 + 1
 * - 不复用已取消订单的号码：orderNumber 有唯一约束，旧 cancelled 行仍占着该号，
 *   直接复用会触发 P2002。号码有空洞是正常现象。
 */
export async function generateSalesOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  const prefix = getDatePrefix();
  const orders = await tx.salesOrder.findMany({
    where: { orderNumber: { startsWith: `${prefix}-` } },
    select: { orderNumber: true },
  });

  let maxSeq = 0;
  for (const o of orders) {
    const seq = parseInt(o.orderNumber.slice(prefix.length + 1), 10);
    if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }
  return `${prefix}-${maxSeq + 1}`;
}

/**
 * 并发提交订单时，两个请求可能算出相同的下一个订单号，第二个 create 会 P2002。
 * 捕获唯一约束冲突后整个事务回滚并重试（重新生成号码）。
 */
export async function withOrderNumberRetry<T>(run: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await run();
    } catch (error) {
      const isConflict =
        error instanceof PrismaNS.PrismaClientKnownRequestError && error.code === "P2002";
      if (isConflict && i < attempts - 1) continue;
      throw error;
    }
  }
  throw new Error("Unreachable");
}
