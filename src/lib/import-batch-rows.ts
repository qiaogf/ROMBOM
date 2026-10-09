// Shared ImportBatch row assembly helpers — used by admin/model-price,
// admin/import-price and supplier/import-price data modules.
// Extracted in Phase 16 to dedupe identical per-row series assembly logic.

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/../prisma/generated/client";

/** 系列 + 品牌名（批量加载的最小形状） */
export type SeriesWithBrand = Prisma.SeriesGetPayload<{
  select: { seriesId: true; seriesName: true; brand: { select: { brandName: true } } };
}>;

/** 批次列表行（含逐行系列拼装）所需的 ImportBatch include 形状 */
export type ImportBatchWithRows = Prisma.ImportBatchGetPayload<{
  include: {
    series: { select: { seriesName: true; brand: { select: { brandName: true } } } };
    admin: { select: { email: true } };
    supplier: { select: { email: true } };
    items: { select: { seriesId: true } };
  };
}>;

/**
 * 按 seriesId 批量加载系列+品牌并返回 Map（统一批量查询避免 N+1）。
 * 入参允许含 null（ImportBatchItem.seriesId 可空），内部自动去重。
 */
export async function loadSeriesMapByIds(
  seriesIds: Array<string | null>
): Promise<Map<string, SeriesWithBrand>> {
  const ids = Array.from(new Set(seriesIds.filter((v): v is string => v !== null)));
  if (ids.length === 0) return new Map();

  const rows = await prisma.series.findMany({
    where: { seriesId: { in: ids } },
    select: { seriesId: true, seriesName: true, brand: { select: { brandName: true } } },
  });
  return new Map(rows.map((s) => [s.seriesId, s]));
}

/**
 * 批次列表行组装：Series 以每行 items 的 seriesId 为准（Admin/Supplier CSV
 * 均逐行带 Series），去重后全部展示；行系列缺失时才回退到批次级 series。
 */
export async function assembleBatchListRows(batches: ImportBatchWithRows[]) {
  // 列表批次行系列：ImportBatchItem 仅存 seriesId，统一批量加载避免 N+1
  const rowSeriesMap = await loadSeriesMapByIds(
    batches.flatMap((b) => b.items.map((it) => it.seriesId))
  );

  return batches.map((b) => {
    const perRowSeries = Array.from(
      new Map(
        b.items
          .map((it) => (it.seriesId ? (rowSeriesMap.get(it.seriesId) ?? null) : null))
          .filter((s): s is NonNullable<typeof s> => s !== null)
          .map((s) => [s.seriesId, s])
      ).values()
    ).map((s) => ({ seriesName: s.seriesName, brand: s.brand }));
    const seriesRows = perRowSeries.length > 0
      ? perRowSeries
      : b.series
        ? [{ seriesName: b.series.seriesName, brand: b.series.brand }]
        : [];
    return {
      importBatchId: b.importBatchId,
      fileName: b.fileName,
      sourceType: b.sourceType,
      importedAt: b.importedAt,
      recordCount: b.recordCount,
      errorCount: b.errorCount,
      seriesId: b.seriesId,
      approvalStatus: b.approvalStatus,
      approvedAt: b.approvedAt,
      seriesRows,
      uploaderEmail: b.admin?.email ?? b.supplier?.email ?? null,
    };
  });
}
