// Server-side data fetching for /supplier/import-price (list + batch detail views).
// Extracted from page.tsx (Phase 15) — pure data assembly, no behavior change.
// The purchase-items assembly is shared by both views (previously duplicated).

import { prisma } from "@/lib/prisma";
import { loadSeriesMapByIds } from "@/lib/import-batch-rows";

// ============ 采购单（两个视图共享） ============

/**
 * 供应商端采购订单（按 PO 分组，每组带明细）
 * 管理者在 Admin Purchase 页 Approve 后发给当前供应商的真实采购单。
 */
export interface SupplierPurchaseOrder {
  poId: string;
  poNumber: string;
  items: Array<{
    itemId: string;
    model: string;
    productName: string;
    quantity: number;
    purPrice: string;      // 实际采购价（管理者可调整后的值）
    accept: boolean;       // 供应商接受状态
    condition: string | null;
    leadTime: string | null;
  }>;
}

/**
 * 采购单：管理者在 Admin Purchase 页 Approve 后发给当前供应商的真实采购单。
 * 按 PO 分组返回，每组带明细；Condition 经该供应商 ModelPrice（按 model 匹配）补充，无匹配显示 null。
 */
export async function getSupplierPurchaseOrders(supplierId: string): Promise<SupplierPurchaseOrder[]> {
  const pos = await prisma.purchaseOrder.findMany({
    where: { supplierId, auditStatus: "approved" },
    orderBy: { orderTime: "desc" },
    include: { items: true },
  });

  const models = [
    ...new Set(
      pos.flatMap((po) => po.items.map((it) => it.model).filter((m): m is string => !!m))
    ),
  ];
  const modelPrices = models.length
    ? await prisma.modelPrice.findMany({
        where: { supplierId, model: { in: models } },
        select: { model: true, condition: true },
      })
    : [];
  const conditionByModel = new Map(modelPrices.map((mp) => [mp.model, mp.condition]));

  return pos.map((po) => ({
    poId: po.poId,
    poNumber: po.poNumber,
    items: po.items.map((it) => ({
      itemId: it.itemId,
      model: it.model ?? "—",
      productName: it.productName,
      quantity: it.quantity,
      purPrice: (it.purPrice ?? it.unitPrice).toString(),
      accept: it.accept,
      condition: it.condition ?? (it.model ? conditionByModel.get(it.model) : null) ?? null,
      leadTime: it.leadTime ?? null,
    })),
  }));
}

// ============ 批次详情视图 ============

/**
 * 批次详情视图数据：批次（校验归属）+ 暂存行（含系列拼装）+ 采购单。
 * 找不到批次或不属于当前供应商时返回 null（由页面 redirect）。
 */
export async function getBatchDetailViewData(batchId: string, supplierId: string) {
  const batch = await prisma.importBatch.findUnique({
    where: { importBatchId: batchId },
    include: {
      series: { select: { seriesName: true, brand: { select: { brandName: true } } } },
    },
  });
  if (!batch || batch.supplierId !== supplierId) return null;

  const stagedItems = await prisma.importBatchItem.findMany({
    where: { importBatchId: batchId },
    orderBy: { rowNumber: "asc" },
    select: {
      itemId: true,
      model: true,
      productName: true,
      sellPrice: true,
      moq: true,
      condition: true,
      leadTime: true,
      seriesId: true,
    },
  });

  // ImportBatchItem 无 series 关联，按行上的 seriesId 批量取系列+品牌后拼装
  const itemSeriesMap = await loadSeriesMapByIds(stagedItems.map((it) => it.seriesId));

  const purchaseOrders = await getSupplierPurchaseOrders(supplierId);

  return { batch, stagedItems, itemSeriesMap, purchaseOrders };
}

// ============ 列表视图 ============

/** 列表视图数据：当前供应商自己上传的导入批次（同一文件名仅保留最新）+ 采购单 */
export async function getListData(supplierId: string) {
  const allBatches = await prisma.importBatch.findMany({
    where: { supplierId },
    orderBy: { importedAt: "desc" },
    include: {
      series: {
        select: {
          seriesName: true,
          brand: { select: { brandName: true } },
          category: { select: { categoryName: true } },
        },
      },
    },
  });

  // 同一文件名只保留上传时间最新的一条
  const seenFiles = new Set<string>();
  const myBatches = allBatches.filter((b) => {
    if (seenFiles.has(b.fileName)) return false;
    seenFiles.add(b.fileName);
    return true;
  });

  const purchaseOrders = await getSupplierPurchaseOrders(supplierId);

  return { myBatches, purchaseOrders };
}
