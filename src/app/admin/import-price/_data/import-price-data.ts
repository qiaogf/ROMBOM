// Server-side data fetching for /admin/import-price (product_info batches).
// Extracted from page.tsx (Phase 16) — pure data assembly, no behavior change.

import { prisma } from "@/lib/prisma";
import type {
  BatchDetailItem,
  BatchItemRow,
  BatchModelPrice,
} from "@/app/admin/_components/ImportBatchDetail";
import { assembleBatchListRows, loadSeriesMapByIds } from "@/lib/import-batch-rows";

interface DetailData {
  batch: BatchDetailItem;
  items: BatchItemRow[];
  modelPrices: BatchModelPrice[];
}

/** 列表数据：product_info 批次列表（含逐行系列拼装）+ 上传表单系列选项 */
export async function getListData() {
  const [batches, seriesList] = await Promise.all([
    prisma.importBatch.findMany({
      where: { batchType: "product_info" },
      orderBy: { importedAt: "desc" },
      include: {
        series: { select: { seriesName: true, brand: { select: { brandName: true } } } },
        admin: { select: { email: true } },
        supplier: { select: { email: true } },
        items: {
          select: {
            seriesId: true,
          },
        },
      },
    }),
    prisma.series.findMany({
      where: { isActive: true },
      select: {
        seriesId: true,
        seriesName: true,
        sortOrder: true,
        brand: { select: { brandName: true } },
      },
    }),
  ]);

  const seriesOptions = seriesList
    .map((s) => ({
      seriesId: s.seriesId,
      seriesName: s.seriesName,
      brandName: s.brand.brandName,
      sortOrder: s.sortOrder,
    }))
    .sort((a, b) => {
      const brandCmp = a.brandName.localeCompare(b.brandName);
      if (brandCmp !== 0) return brandCmp;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.seriesName.localeCompare(b.seriesName);
    })
    .map((s) => ({ seriesId: s.seriesId, seriesName: s.seriesName, brandName: s.brandName }));

  const listBatches = await assembleBatchListRows(batches);

  return { listBatches, seriesOptions };
}

/**
 * 批次详情数据：批次 + 暂存行快照（含系列拼装）+ 已批准批次的线上数据。
 * ModelPrice.slug 全局唯一，重复确认同一文件会把 importBatchId 指针移到最新批次，
 * 因此已批准批次的线上数据按 items 的 slug 集合关联，而非 importBatchId。
 * 找不到批次时返回 null（由页面 redirect）。
 */
export async function getDetailData(batchId: string) {
  const batch = await prisma.importBatch.findUnique({
    where: { importBatchId: batchId },
    include: {
      series: { select: { seriesName: true, brand: { select: { brandName: true } } } },
      admin: { select: { email: true } },
      supplier: { select: { email: true } },
      approvedBy: { select: { email: true } },
    },
  });
  if (!batch) return null;

  // 始终读取暂存行快照（seriesId 在每行上）
  const stagedItems = await prisma.importBatchItem.findMany({
    where: { importBatchId: batchId },
    orderBy: { rowNumber: "asc" },
    select: {
      itemId: true,
      slug: true,
      seriesId: true,
      productName: true,
      model: true,
      description: true,
      origin: true,
      certification: true,
      length: true,
      width: true,
      height: true,
      diameter: true,
      dimensionUnit: true,
      weight: true,
      packingWeight: true,
      weightUnit: true,
      batteryAttributes: true,
      datasheetLink: true,
      brandName: true,
    },
  });
  // ImportBatchItem 无 series 关联，按行上的 seriesId 批量取系列后拼装
  const itemSeriesMap = await loadSeriesMapByIds(stagedItems.map((it) => it.seriesId));
  const items: BatchItemRow[] = stagedItems.map((it) => ({
    itemId: it.itemId,
    productName: it.productName,
    model: it.model,
    description: it.description,
    origin: it.origin,
    certification: it.certification,
    length: it.length,
    width: it.width,
    height: it.height,
    diameter: it.diameter,
    dimensionUnit: it.dimensionUnit,
    weight: it.weight,
    packingWeight: it.packingWeight,
    weightUnit: it.weightUnit,
    batteryAttributes: it.batteryAttributes,
    datasheetLink: it.datasheetLink,
    brandName: it.brandName,
    series: it.seriesId ? (itemSeriesMap.get(it.seriesId) ?? null) : null,
  }));

  const isPending = batch.approvalStatus === "pending";
  let modelPrices: BatchModelPrice[] = [];

  if (!isPending && stagedItems.length > 0) {
    modelPrices = await prisma.modelPrice.findMany({
      where: { importBatchId: batchId },
      orderBy: { createdAt: "asc" },
      select: {
        modelPriceId: true,
        productName: true,
        model: true,
        description: true,
        origin: true,
        certification: true,
        length: true,
        width: true,
        height: true,
        diameter: true,
        dimensionUnit: true,
        weight: true,
        packingWeight: true,
        weightUnit: true,
        batteryAttributes: true,
        datasheetLink: true,
        brandName: true,
        series: { select: { seriesName: true, brand: { select: { brandName: true } } } },
      },
    });
  }

  const detail: DetailData = {
    batch: {
      ...batch,
      uploaderEmail: batch.admin?.email ?? batch.supplier?.email ?? null,
      approvedByEmail: batch.approvedBy?.email ?? null,
    },
    items,
    modelPrices,
  };
  return detail;
}
