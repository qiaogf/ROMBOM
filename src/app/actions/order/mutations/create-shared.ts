// Shared helpers for order creation — used by both create-from-cart and create-full.
// No "use server" boundary: these are internal helpers, not re-exported through the barrel.

import type { Prisma } from "@/../prisma/generated/client";

/** 生成今日日期前缀 YYMMDD，如 260919 */
export function getDatePrefix(d: Date = new Date()): string {
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
export async function generateSalesOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
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
