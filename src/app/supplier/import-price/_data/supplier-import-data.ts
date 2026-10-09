// Server-side data fetching for /supplier/import-price (list + batch detail views).
// Extracted from page.tsx (Phase 15) — pure data assembly, no behavior change.
// The purchase-items assembly is shared by both views (previously duplicated).

import { prisma } from "@/lib/prisma";
import type { PurchaseItem } from "../PurchaseOrderPanel";
import { loadSeriesMapByIds } from "@/lib/import-batch-rows";

// ============ 采购单（两个视图共享） ============

/**
 * 采购单：客户购物车中归属当前供应商的意向成交型号。
 * 兼容旧 supplierQuote 路径与新 modelPrice 路径。
 */
export async function getPurchaseItems(supplierId: string): Promise<PurchaseItem[]> {
  const cartRows = await prisma.cartItem.findMany({
    where: {
      OR: [
        { modelPrice: { supplierId } },
        { supplierQuote: { supplierId } },
      ],
    },
    select: {
      itemId: true,
      quantity: true,
      modelPrice: {
        select: {
          model: true,
          productName: true,
          sellPrice: true,
          condition: true,
          stockStatus: true,
          leadTime: true,
        },
      },
      supplierQuote: {
        select: {
          sellPrice: true,
          stockStatus: true,
          leadTime: true,
          product: { select: { model: true, productName: true } },
        },
      },
    },
  });

  return cartRows.map((c) => {
    if (c.modelPrice) {
      return {
        cartItemId: c.itemId,
        model: c.modelPrice.model,
        productName: c.modelPrice.productName,
        quantity: c.quantity,
        unitPrice: c.modelPrice.sellPrice.toString(),
        condition: c.modelPrice.condition ?? null,
        stockStatus: c.modelPrice.stockStatus ?? "in_stock",
        leadTime: c.modelPrice.leadTime ?? null,
      };
    }
    return {
      cartItemId: c.itemId,
      model: c.supplierQuote?.product?.model ?? "—",
      productName: c.supplierQuote?.product?.productName ?? "—",
      quantity: c.quantity,
      unitPrice: c.supplierQuote?.sellPrice.toString() ?? "0",
      condition: null,
      stockStatus: c.supplierQuote?.stockStatus ?? "in_stock",
      leadTime: c.supplierQuote?.leadTime ?? null,
    };
  });
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
      stockStatus: true,
      leadTime: true,
      seriesId: true,
    },
  });

  // ImportBatchItem 无 series 关联，按行上的 seriesId 批量取系列+品牌后拼装
  const itemSeriesMap = await loadSeriesMapByIds(stagedItems.map((it) => it.seriesId));

  const purchaseItems = await getPurchaseItems(supplierId);

  return { batch, stagedItems, itemSeriesMap, purchaseItems };
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

  const purchaseItems = await getPurchaseItems(supplierId);

  return { myBatches, purchaseItems };
}
