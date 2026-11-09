// Server-side data fetching for /admin/model-price (list + batch detail views).
// Extracted from page.tsx (Phase 15) — pure data assembly, no behavior change.
// The standard price table assembly is shared by both views (previously duplicated).

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/../prisma/generated/client";
import type { StandardPriceSeriesGroup } from "@/app/admin/_components/StandardPriceTable";
import { assembleBatchListRows, loadSeriesMapByIds } from "@/lib/import-batch-rows";

// 最低成本归组键：有系列按 seriesId，无系列（特殊类目）按品牌归属
const costNorm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();
const costKey = (seriesId: string | null, brandKey: string, model: string) =>
  seriesId ? `s:${seriesId}:${model}` : `b:${brandKey}:${model}`;

// ============ 批次详情视图 ============

/**
 * 批次详情视图数据：批次 + 暂存行（含系列拼装）+ 已批准批次的线上价。
 * ModelPrice.slug 全局唯一，重复确认同一文件会把 importBatchId 指针移到最新批次，
 * 因此已批准批次的线上价按 items 的 slug 集合关联，而非 importBatchId。
 * 找不到批次或批次含错误时返回 null（由页面 redirect）。
 */
export async function getBatchDetailViewData(batchId: string) {
  const batch = await prisma.importBatch.findUnique({
    where: { importBatchId: batchId },
    include: {
      series: { select: { seriesName: true, brand: { select: { brandName: true } } } },
      admin: { select: { email: true } },
      supplier: { select: { email: true } },
      approvedBy: { select: { email: true } },
    },
  });
  // 与 Product 导入页一致：含解析错误的批次也列出，便于管理员查看/驳回/删除
  if (!batch) return null;

  // 始终读取暂存行快照（seriesId 在每行上）
  const items = await prisma.importBatchItem.findMany({
    where: { importBatchId: batchId },
    orderBy: { rowNumber: "asc" },
    select: {
      itemId: true,
      seriesId: true,
      slug: true,
      model: true,
      categoryName: true,
      costPrice: true,
      sellPrice: true,
      markup: true,
      moq: true,
      condition: true,
      leadTime: true,
    },
  });
  // ImportBatchItem 无 series 关联，按行上的 seriesId 批量取系列+品牌后拼装
  const itemSeriesMap = await loadSeriesMapByIds(items.map((it) => it.seriesId));
  const itemRows = items.map((it) => ({
    itemId: it.itemId,
    slug: it.slug,
    model: it.model,
    costPrice: it.costPrice,
    sellPrice: it.sellPrice,
    markup: it.markup,
    moq: it.moq,
    condition: it.condition,
    leadTime: it.leadTime,
    series: it.seriesId ? (itemSeriesMap.get(it.seriesId) ?? null) : null,
  }));

  const isPending = batch.approvalStatus === "pending";
  let modelPrices: Prisma.ModelPriceGetPayload<{
    select: {
      modelPriceId: true;
      model: true;
      costPrice: true;
      sellPrice: true;
      markup: true;
      moq: true;
      condition: true;
      leadTime: true;
      series: { select: { seriesName: true; brand: { select: { brandName: true } } } };
    };
  }>[] = [];

  if (!isPending && itemRows.length > 0) {
    // 线上行按"类目+型号+Condition"文件身份关联：slug 只含型号（跨类目撞 slug），
    // importBatchId 会因价格批次原地更新/重复确认而漂移，两者都会串行。
    const catNames = [...new Set(items.map((it) => it.categoryName).filter((v): v is string => !!v))];
    const cats = await prisma.category.findMany({
      where: { categoryName: { in: catNames } },
      select: { categoryId: true, categoryName: true },
    });
    const catIdByName = new Map(cats.map((c) => [c.categoryName.trim().toLowerCase(), c.categoryId]));
    const fileKeys = new Set<string>();
    const rowOrder = new Map<string, number>();
    items.forEach((it, idx) => {
      const cid = it.categoryName ? catIdByName.get(it.categoryName.trim().toLowerCase()) : undefined;
      if (!cid) return;
      const key = `${cid}|${it.model.trim().toLowerCase()}|${(it.condition ?? "").trim().toLowerCase()}`;
      fileKeys.add(key);
      if (!rowOrder.has(key)) rowOrder.set(key, idx);
    });
    const categoryIds = [...new Set(cats.map((c) => c.categoryId))];
    const models = [...new Set(items.map((it) => it.model))];
    const rows = categoryIds.length > 0 && models.length > 0
      ? await prisma.modelPrice.findMany({
          where: { categoryId: { in: categoryIds }, model: { in: models } },
          select: {
            modelPriceId: true,
            model: true,
            costPrice: true,
            sellPrice: true,
            markup: true,
            moq: true,
            condition: true,
            leadTime: true,
            categoryId: true,
            series: { select: { seriesName: true, brand: { select: { brandName: true } } } },
          },
        })
      : [];
    modelPrices = rows
      .filter((mp) => fileKeys.has(`${mp.categoryId}|${mp.model.trim().toLowerCase()}|${(mp.condition ?? "").trim().toLowerCase()}`))
      .sort((a, b) => {
        const ka = rowOrder.get(`${a.categoryId}|${a.model.trim().toLowerCase()}|${(a.condition ?? "").trim().toLowerCase()}`) ?? 0;
        const kb = rowOrder.get(`${b.categoryId}|${b.model.trim().toLowerCase()}|${(b.condition ?? "").trim().toLowerCase()}`) ?? 0;
        return ka - kb;
      })
      .map((mp) => {
        const { categoryId, ...rest } = mp;
        void categoryId;
        return rest;
      });
  }

  return { batch, itemRows, modelPrices };
}

// ============ 标准价格表（两个视图共享） ============

/**
 * 全部上架的标准价格表（公开报价页同源数据），按品牌/系列名排序分组。
 * Cost = 同系列已确认(approved)文件中该型号的最低 costPrice。
 */
export async function getStandardPriceGroups(): Promise<StandardPriceSeriesGroup[]> {
  const allModelPrices = await prisma.modelPrice.findMany({
    where: { isActive: true, status: "on_sale" },
    orderBy: [{ seriesId: "asc" }, { sortOrder: "asc" }, { model: "asc" }],
    select: {
      modelPriceId: true,
      model: true,
      productName: true,
      costPrice: true,
      sellPrice: true,
      markup: true,
      moq: true,
      condition: true,
      leadTime: true,
      brandId: true,
      brandName: true,
      brand: { select: { brandName: true } },
      series: { select: { seriesId: true, seriesName: true, brand: { select: { brandName: true } } } },
    },
  });
  // 已确认文件(approved 价格批次)的同组最低成本：有系列按 seriesId 归组，
  // 无系列行（特殊类目）按品牌归属归组，避免这些行的「最低确认成本」恒为空
  const [confirmedItems, brands] = await Promise.all([
    prisma.importBatchItem.findMany({
      where: { importBatch: { approvalStatus: "approved", batchType: "price" } },
      select: { seriesId: true, model: true, costPrice: true, brandName: true },
    }),
    prisma.brand.findMany({ select: { brandId: true, brandName: true } }),
  ]);
  const brandIdByName = new Map(brands.map((b) => [costNorm(b.brandName), b.brandId]));
  const minCostMap = new Map<string, number>();
  for (const it of confirmedItems) {
    const brandKey = it.seriesId
      ? ""
      : (brandIdByName.get(costNorm(it.brandName)) ?? `name:${costNorm(it.brandName)}`);
    const key = costKey(it.seriesId, brandKey, it.model);
    const cost = Number(it.costPrice);
    const prev = minCostMap.get(key);
    if (prev === undefined || cost < prev) minCostMap.set(key, cost);
  }

  const sgMap = new Map<string, StandardPriceSeriesGroup>();
  for (const mp of allModelPrices) {
    // 无系列行（特殊类目）按品牌归为一组
    const sid = mp.series?.seriesId ?? `brand:${mp.brandId ?? "unknown"}`;
    if (!sgMap.has(sid)) {
      sgMap.set(sid, {
        seriesId: sid,
        seriesName: mp.series?.seriesName ?? "",
        brandName: mp.brand?.brandName ?? mp.series?.brand?.brandName ?? "",
        items: [],
      });
    }
    const brandKey = mp.series?.seriesId
      ? ""
      : (mp.brandId ?? `name:${costNorm(mp.brandName)}`);
    const minCost = minCostMap.get(costKey(mp.series?.seriesId ?? null, brandKey, mp.model));
    sgMap.get(sid)!.items.push({
      modelPriceId: mp.modelPriceId,
      model: mp.model,
      productName: mp.productName,
      costPrice: mp.costPrice.toString(),
      sellPrice: mp.sellPrice.toString(),
      markup: mp.markup !== null ? mp.markup.toString() : null,
      moq: mp.moq,
      condition: mp.condition,
      leadTime: mp.leadTime,
      minConfirmedCost: minCost !== undefined ? minCost.toString() : null,
    });
  }

  return Array.from(sgMap.values()).sort((a, b) =>
    a.brandName.localeCompare(b.brandName) || a.seriesName.localeCompare(b.seriesName)
  );
}

// ============ 列表视图 ============

/** 列表视图数据：价格批次列表（含逐行系列拼装）+ 上传表单系列选项 */
export async function getListViewData() {
  const [batches, seriesList] = await Promise.all([
    prisma.importBatch.findMany({
      where: { batchType: "price" },
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
    }))
    .sort((a, b) => a.brandName.localeCompare(b.brandName) || a.seriesName.localeCompare(b.seriesName));

  const listBatches = await assembleBatchListRows(batches);

  return { listBatches, seriesOptions };
}
