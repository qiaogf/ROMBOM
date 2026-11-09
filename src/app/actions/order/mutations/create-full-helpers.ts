// Helpers for create-full.ts — purchase order generation + idempotency store.
// Extracted from create-full.ts (Phase 14) to keep the order creation leaf focused.

import type { Prisma } from "@/../prisma/generated/client";

/**
 * 工作日回溯：从 from 向前数 workingDays 个工作日（排除周六周日与 HOLIDAYS 配置的节假日），
 * 返回截止时间点。用于供应商报价的 5 个工作日检索窗口。
 */
// 节假日配置（ISO 日期，每年维护；当前为 2026 中国法定节假日，可按需增删）
const HOLIDAYS = new Set<string>([
  "2026-01-01", "2026-01-02", // 元旦
  "2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19", "2026-02-20", "2026-02-22", // 春节
  "2026-04-04", "2026-04-05", "2026-04-06", // 清明
  "2026-05-01", "2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05", // 劳动节
  "2026-06-19", "2026-06-20", "2026-06-21", // 端午
  "2026-09-25", "2026-09-26", "2026-09-27", // 中秋
  "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", // 国庆
]);

export function workingDaysCutoff(from: Date, workingDays: number): Date {
  const d = new Date(from);
  let counted = 0;
  while (counted < workingDays) {
    d.setDate(d.getDate() - 1);
    const day = d.getDay();
    if (day === 0 || day === 6) continue; // 周末
    if (HOLIDAYS.has(d.toISOString().slice(0, 10))) continue; // 节假日
    counted++;
  }
  return d;
}

/**
 * 为销售订单自动生成最优采购订单（购物车提交即触发，不校验支付状态）
 * 规则：
 *  1. 报价窗口：以购物车提交时间（=当前事务时间）为起点，向前 5 个工作日内创建的 SupplierQuote
 *  2. 供应商优先级（同 Model）：UnitPrice(costPrice) 升序 → qualificationLevel 信誉分降序 → priorityWeight 升序
 *  3. 数量分配：优先全部分配给优先级最高供应商；stockQuantity 不足时剩余需求顺延下一供应商，自动拆单
 *  4. 无符合条件报价（或库存总和不足）的剩余需求 → 归入无供应商的草稿采购单：
 *     明细行 UnitPrice=0、Qty=0（前端输入框显示为空），由采购手动维护
 *  5. 所有生成的采购单初始 poStatus = "draft"（草稿），管理者修改单价/数量后人工提交审批
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
    leadTime: string | null;
  }>,
): Promise<void> {
  // supplierId -> 已分配的订单项；null key = 无报价草稿单
  const allocations = new Map<
    string | null,
    Array<{
      productName: string;
      model: string | null;
      unitPrice: number;
      quantity: number;
      leadTime: string | null;
    }>
  >();

  const cutoff = workingDaysCutoff(new Date(), 5); // 购物车提交时间 = 现在

  for (const item of items) {
    if (!item.model && !item.productId) continue;

    // 查找该产品 5 个工作日内的有效供应商报价
    const where: Prisma.SupplierQuoteWhereInput = {
      isValid: true,
      createdAt: { gte: cutoff },
    };
    if (item.productId) {
      where.productId = item.productId;
    } else {
      where.product = { model: item.model ?? "" };
    }

    // ── 报价源合并 ──
    // ① 系统管理员上传的价格表（ModelPrice，Approved 价格批次）：同价时优先于供应商报价
    const mpRows = await tx.modelPrice.findMany({
      where: {
        model: item.model ?? "",
        sellPrice: { gt: 0 },
        importBatch: { approvalStatus: "approved", batchType: "price" },
        supplierId: { not: null },
      },
      include: { supplier: true },
    });

    // ② 供应商报价（5 个工作日窗口内）
    const quotes = await tx.supplierQuote.findMany({
      where: {
        ...where,
        supplier: { qualificationLevel: { gt: 0 } },
      },
      include: { supplier: true },
    });

    type Candidate = {
      kind: "admin" | "quote";
      supplierId: string;
      costPrice: number;
      stockQuantity: number; // ModelPrice 无库存字段 → 视为充足
      leadTime: string | null;
      qualification: number;
      priorityWeight: number;
    };

    const candidates: Candidate[] = [
      ...mpRows.map(
        (r): Candidate => ({
          kind: "admin",
          supplierId: r.supplierId!,
          costPrice: r.costPrice.toNumber(),
          stockQuantity: 999999,
          leadTime: r.leadTime ?? null,
          qualification: r.supplier?.qualificationLevel ?? 0,
          priorityWeight: r.supplier?.priorityWeight ?? 0,
        })
      ),
      ...quotes.map(
        (q): Candidate => ({
          kind: "quote",
          supplierId: q.supplierId,
          costPrice: q.costPrice.toNumber(),
          stockQuantity: q.stockQuantity ?? 999999,
          leadTime: q.leadTime ?? null,
          qualification: q.supplier.qualificationLevel,
          priorityWeight: q.supplier.priorityWeight,
        })
      ),
    ];
    // 排序：UnitPrice 升序 → 同价时管理员价格表优先 → 信誉分降序 → priorityWeight 升序
    candidates.sort(
      (a, b) =>
        a.costPrice - b.costPrice ||
        (a.kind === b.kind ? 0 : a.kind === "admin" ? -1 : 1) ||
        b.qualification - a.qualification ||
        a.priorityWeight - b.priorityWeight
    );

    // 分配：价低优先，stockQuantity 不足顺延下一供应商（同一供应商同型号只取一条最优源）
    let remainingQty = item.quantity;
    const usedSuppliers = new Set<string>();
    for (const c of candidates) {
      if (remainingQty <= 0) break;
      if (usedSuppliers.has(c.supplierId)) continue;
      const allocated = Math.min(remainingQty, c.stockQuantity);
      if (allocated <= 0) continue;

      usedSuppliers.add(c.supplierId);
      if (!allocations.has(c.supplierId)) {
        allocations.set(c.supplierId, []);
      }
      allocations.get(c.supplierId)!.push({
        productName: item.productName,
        model: item.model,
        unitPrice: c.costPrice,
        quantity: allocated,
        leadTime: c.leadTime,
      });
      remainingQty -= allocated;
    }

    // 无报价 / 库存不足的剩余需求 → 草稿行（UnitPrice/Qty 置空，采购手动维护）
    if (remainingQty > 0) {
      if (!allocations.has(null)) {
        allocations.set(null, []);
      }
      allocations.get(null)!.push({
        productName: item.productName,
        model: item.model,
        unitPrice: 0,
        quantity: 0,
        leadTime: null,
      });
    }
  }

  // 按供应商分组创建采购订单（初始均为草稿）
  let seq = 1;
  for (const [supplierId, poItems] of allocations) {
    const poNumber = `${salesOrder.orderNumber}-${seq}`;
    const totalAmount = poItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

    await tx.purchaseOrder.create({
      data: {
        poNumber,
        supplierId, // null = 无报价草稿单，供应商由采购后续维护
        salesOrderId: salesOrder.orderId,
        totalAmount,
        poStatus: "draft", // 草稿：管理者确认单价/数量后人工提交审批
        auditStatus: "pending", // 待审批：管理者 Approve 后才发给供应商
        orderTime: new Date(),
        items: {
          create: poItems.map((it) => ({
            productName: it.productName,
            model: it.model,
            unitPrice: it.unitPrice,
            purPrice: it.unitPrice > 0 ? it.unitPrice : null, // 实际采购价初始 = 供应单价；无报价为 null
            quantity: it.quantity,
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
