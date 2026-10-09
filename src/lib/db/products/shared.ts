// Shared helper for product group queries — merges old Product/SupplierQuote
// and new Series/ModelPrice data sources into grouped results.

import { prisma } from "@/lib/prisma";
import type { SeriesGroup } from "../types";
import { slugify, toNumber } from "../types";

/**
 * 获取指定类目+品牌下的所有商品并按系列分组（内部共享实现）
 * 合并两个数据源：
 *   1) 旧模型 Product + SupplierQuote（取每个产品最低有效报价）
 *   2) 新模型 Series + ModelPrice（isActive 且 on_sale）
 * 按系列名（小写）合并：旧产品组保持首次出现顺序，Series 表中的系列
 * （含暂无型号的空系列）依次追加，保证系列结构始终完整展示。
 */
export async function getSeriesGroupsForCategoryBrand(
  categoryId: string,
  brandId: string
): Promise<SeriesGroup[]> {
  // 数据源 1：旧模型 Product + SupplierQuote
  const products = await prisma.product.findMany({
    where: {
      categoryId,
      brandId,
      status: "on_sale",
    },
    include: {
      supplierQuotes: {
        where: { isValid: true },
        orderBy: { sellPrice: "asc" },
      },
    },
    orderBy: [{ series: "asc" }, { sortOrder: "asc" }],
  });

  // 数据源 2：新模型 Series + ModelPrice
  const seriesRows = await prisma.series.findMany({
    where: { categoryId, brandId, isActive: true },
    select: {
      seriesName: true,
      slug: true,
      description: true,
      modelPrices: {
        where: { isActive: true, status: "on_sale" },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  // 系列名（小写）→ 分组下标；旧产品组保持首次出现顺序
  const indexByKey = new Map<string, number>();
  const groups: SeriesGroup[] = [];

  const ensureGroup = (key: string, displayName: string, slug?: string): number => {
    const existing = indexByKey.get(key);
    if (existing !== undefined) {
      // Series 表提供了权威 slug 时，覆盖由 Product 文本派生的 slug
      // 避免 slugify("LOGO!")="logo" 与 Series.slug="logo!" 不一致
      if (slug && groups[existing].seriesSlug !== slug) {
        groups[existing].seriesSlug = slug;
      }
      return existing;
    }
    const index = groups.length;
    indexByKey.set(key, index);
    groups.push({
      seriesName: displayName,
      seriesSlug: slug || slugify(displayName),
      seriesDesc: null,
      products: [],
    });
    return index;
  };

  products.forEach((product) => {
    const seriesName = product.series || "Other Models";
    const defaultQuote =
      product.supplierQuotes && product.supplierQuotes.length > 0
        ? product.supplierQuotes[0]
        : null;

    const index = ensureGroup(seriesName.toLowerCase(), seriesName);
    groups[index].products.push({
      id: product.productId,
      name: product.productName,
      model: product.model,
      description: product.description || null,
      unit: product.unit,
      price: defaultQuote ? toNumber(defaultQuote.sellPrice) : 0,
      quoteId: defaultQuote?.quoteId || "",
      moq: defaultQuote?.moq ?? 1,
      stockStatus: defaultQuote?.stockStatus ?? "in_stock",
      leadTime: defaultQuote?.leadTime ?? null,
      categoryId: product.categoryId,
      brandId: product.brandId,
      seriesName: product.series || null,
      seriesDesc: null,
    });
  });

  for (const row of seriesRows) {
    const name = row.seriesName.trim();
    if (!name) continue;

    // 空系列也建立分组（型号表中以"暂无型号"提示行展示）
    const index = ensureGroup(name.toLowerCase(), name, row.slug);
    if (!groups[index].seriesDesc) {
      groups[index].seriesDesc = row.description || null;
    }

    // 收集该分组已存在的 model（来自旧 Product），避免与新 ModelPrice 重复
    const existingModels = new Set(groups[index].products.map((p) => p.model));

    for (const mp of row.modelPrices) {
      // 同一 model 已由旧 Product 提供（含 quoteId 可加购），跳过新 ModelPrice 避免重复
      if (existingModels.has(mp.model)) continue;
      groups[index].products.push({
        id: mp.modelPriceId,
        name: mp.productName,
        model: mp.model,
        description: mp.description,
        unit: mp.unit,
        price: toNumber(mp.sellPrice),
        // 新模型暂无 SupplierQuote，quoteId 留空 → 前端加购按钮自动禁用
        quoteId: "",
        moq: mp.moq,
        condition: mp.condition ?? null,
        stockStatus: mp.stockStatus,
        leadTime: mp.leadTime,
        categoryId,
        brandId,
        seriesName: name,
        seriesDesc: row.description || null,
      });
    }
  }

  return groups;
}
