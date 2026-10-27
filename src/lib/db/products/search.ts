// Product search — keyword search by model/series, returns grouped SeriesGroup[].

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Product, SeriesGroup } from "../types";
import { slugify, toNumber } from "../types";

/**
 * 按型号(model)或系列(series)关键词搜索产品，返回按系列分组的 SeriesGroup[]
 * 用于全局搜索条 → /search?q=xxx 页面渲染价格表
 * Data Cache：tags catalog + 1h 兜底（与目录/品牌/类目页同一失效链路）
 */
export async function searchProductsByModelOrSeries(
  query: string
): Promise<SeriesGroup[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const cached = unstable_cache(
    async (q: string): Promise<SeriesGroup[]> => searchUncached(q),
    ["product-search", trimmed],
    { tags: ["catalog"], revalidate: 3600 }
  );
  return cached(trimmed);
}

async function searchUncached(trimmed: string): Promise<SeriesGroup[]> {

  const products = await prisma.product.findMany({
    where: {
      status: "on_sale",
      OR: [
        { model: { contains: trimmed } },
        { productName: { contains: trimmed } },
        { series: { contains: trimmed } },
      ],
    },
    include: {
      supplierQuotes: {
        where: { isValid: true },
        orderBy: { sellPrice: "asc" },
      },
    },
    orderBy: [{ series: "asc" }, { sortOrder: "asc" }],
  });

  // Product(旧模型) 无 Product Condition 字段，从 ModelPrice（新模型）按 model 批量补充
  const conditions = await prisma.modelPrice.findMany({
    where: { model: { in: products.map((p) => p.model) } },
    select: { model: true, condition: true },
  });
  const conditionMap = new Map(conditions.map((c) => [c.model, c.condition]));

  const seriesMap = new Map<string, Product[]>();

  products.forEach((product) => {
    const seriesName = product.series || "Other Models";
    const defaultQuote =
      product.supplierQuotes && product.supplierQuotes.length > 0
        ? product.supplierQuotes[0]
        : null;

    const productData: Product = {
      id: product.productId,
      name: product.productName,
      model: product.model,
      description: product.description || null,
      unit: product.unit,
      price: defaultQuote ? toNumber(defaultQuote.sellPrice) : 0,
      quoteId: defaultQuote?.quoteId || "",
      moq: defaultQuote?.moq ?? 1,
      condition: conditionMap.get(product.model) ?? null,
      leadTime: defaultQuote?.leadTime ?? null,
      categoryId: product.categoryId,
      brandId: product.brandId,
      seriesName: product.series || null,
      seriesDesc: null,
    };

    if (!seriesMap.has(seriesName)) {
      seriesMap.set(seriesName, []);
    }
    seriesMap.get(seriesName)!.push(productData);
  });

  const seriesGroups: SeriesGroup[] = [];
  seriesMap.forEach((prods, seriesName) => {
    seriesGroups.push({
      seriesName,
      seriesSlug: slugify(seriesName),
      seriesDesc: null,
      products: prods,
    });
  });

  return seriesGroups;
}
