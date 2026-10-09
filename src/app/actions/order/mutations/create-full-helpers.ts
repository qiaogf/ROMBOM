// Helpers for create-full.ts — purchase order generation + idempotency store.
// Extracted from create-full.ts (Phase 14) to keep the order creation leaf focused.

import type { Prisma } from "@/../prisma/generated/client";
import { toNumber } from "../shared";

/**
 * 为销售订单自动生成采购订单
 * 规则：
 *  1. 每个订单项逐一比对 SupplierQuote（公开报价表）的 costPrice
 *  2. 价格最低的供应商优先获得该产品的订单
 *  3. 价格相同时，按 supplier.priorityWeight 升序选择（值越小优先级越高）
 *  4. 若某供应商库存（stockQuantity）不足，剩余数量分配给价格次优的供应商
 *  5. 不同供应商可能获得不同型号/数量的产品
 *  6. PO 号格式：{salesOrderNumber}-{seq}，如 260919-1-1、260919-1-2
 */
export async function generatePurchaseOrders(
  tx: Prisma.TransactionClient,
  salesOrder: { orderId: string; orderNumber: string },
  items: Array<{
    productName: string;
    model: string | null;
    quantity: number;
    productId: string | null;
    stockStatus: string | null;
    leadTime: string | null;
  }>,
): Promise<void> {
  // supplierId -> 已分配的订单项
  const allocations = new Map<
    string,
    Array<{
      productName: string;
      model: string | null;
      unitPrice: number;
      quantity: number;
      stockStatus: string;
      leadTime: string | null;
    }>
  >();

  for (const item of items) {
    if (!item.model && !item.productId) continue;

    // 查找该产品的所有有效供应商报价
    const where: Prisma.SupplierQuoteWhereInput = { isValid: true };
    if (item.productId) {
      where.productId = item.productId;
    } else {
      where.product = { model: item.model ?? "" };
    }

    const quotes = await tx.supplierQuote.findMany({
      where: {
        ...where,
        supplier: { qualificationLevel: { gt: 0 } },
      },
      include: { supplier: true },
      orderBy: [
        { costPrice: "asc" },
        { supplier: { qualificationLevel: "desc" } },
        { supplier: { priorityWeight: "asc" } },
      ],
    });

    if (quotes.length === 0) continue;

    let remainingQty = item.quantity;
    for (const quote of quotes) {
      if (remainingQty <= 0) break;
      const available = quote.stockQuantity ?? 999999;
      const allocated = Math.min(remainingQty, available);
      if (allocated <= 0) continue;

      if (!allocations.has(quote.supplierId)) {
        allocations.set(quote.supplierId, []);
      }
      allocations.get(quote.supplierId)!.push({
        productName: item.productName,
        model: item.model,
        unitPrice: toNumber(quote.costPrice),
        quantity: allocated,
        stockStatus: String(quote.stockStatus ?? "in_stock"),
        leadTime: quote.leadTime ?? null,
      });
      remainingQty -= allocated;
    }
  }

  // 按供应商分组创建采购订单
  let seq = 1;
  for (const [supplierId, poItems] of allocations) {
    const poNumber = `${salesOrder.orderNumber}-${seq}`;
    const totalAmount = poItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

    await tx.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        salesOrderId: salesOrder.orderId,
        totalAmount,
        poStatus: "ordered",
        orderTime: new Date(),
        items: {
          create: poItems.map((it) => ({
            productName: it.productName,
            model: it.model,
            unitPrice: it.unitPrice,
            quantity: it.quantity,
            stockStatus: it.stockStatus,
            leadTime: it.leadTime,
            itemStatus: "ordered",
          })),
        },
      },
    });
    seq++;
  }
}

// 幂等性存储（内存级，进程重启后失效）
export const idempotencyStore = new Map<string, { orderId: string; createdAt: number }>();
const IDEMPOTENCY_WINDOW_MS = 30000;

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of idempotencyStore.entries()) {
    if (now - value.createdAt > IDEMPOTENCY_WINDOW_MS) {
      idempotencyStore.delete(key);
    }
  }
}, 30000);
