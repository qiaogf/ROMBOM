// Shared helper for product group queries — merges old Product/SupplierQuote
// and new Series/ModelPrice data sources into grouped results.

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/../prisma/generated/client";
import type { SeriesGroup } from "../types";
import { slugify, toNumber } from "../types";

// ---------- 查询形状常量（单组合版与多品牌批量版共用，保证行为一致） ----------

const productInclude = {
  supplierQuotes: {
    where: { isValid: true },
    orderBy: { sellPrice: "asc" as const },
  },
} satisfies Prisma.ProductInclude;

const seriesSelect = {
  seriesName: true,
  slug: true,
  description: true,
  categoryId: true,
  brandId: true,
  modelPrices: {
    where: {
      isActive: true,
      status: "on_sale",
      // 线上只展示比价优胜行（最低价 / 最快交期）；特殊类目导入时已标记为优胜
      OR: [{ isWinnerPrice: true }, { isWinnerLeadTime: true }],
    },
    orderBy: [{ isWinnerPrice: "desc" as const }, { sortOrder: "asc" as const }],
  },
} satisfies Prisma.SeriesSelect;

// 特殊类目（seriesId=null）的 ModelPrice 查询条件内联到调用处，避免 Prisma 类型推断对抽取常量的不兼容

const productInfoSelect = {
  model: true,
  productName: true,
  description: true,
  brandId: true,
  listPrice: true,
} satisfies Prisma.ProductSelect;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
type SeriesRow = Prisma.SeriesGetPayload<{ select: typeof seriesSelect }>;
type ProductInfoRow = Prisma.ProductGetPayload<{ select: typeof productInfoSelect }>;

/**
 * 纯内存分组：将一个 (categoryId, brandId) 组合的三个查询结果合并为系列分组。
 * 无 DB 访问，供单组合版与多品牌批量版共用。
 */
function buildSeriesGroups(
  products: ProductRow[],
  seriesRows: SeriesRow[],
  productInfoRows: ProductInfoRow[]
): SeriesGroup[] {
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
      // (Others) 是特殊分组，不走 slugify（slugify 会剥掉括号导致系列详情页识别失败）
      seriesSlug: slug || (displayName === "(Others)" ? "(Others)" : slugify(displayName)),
      seriesDesc: null,
      products: [],
    });
    return index;
  };

  // 新型号价格体系（ModelPrice）已覆盖的型号：以新报价行为准（可展示最低价 / 最快交期两行）
  // 旧 Product 行只用于新体系里没有报价的型号，避免同一型号重复出现
  const modelsWithNewPrice = new Set<string>();
  for (const s of seriesRows) {
    for (const mp of s.modelPrices) modelsWithNewPrice.add(mp.model);
  }

  products.forEach((product) => {
    if (modelsWithNewPrice.has(product.model)) return;
    const seriesName = product.series || "Other Models";
    const defaultQuote =
      product.supplierQuotes && product.supplierQuotes.length > 0
        ? product.supplierQuotes[0]
        : null;
    // ListPrice 优先：比价任务写入的产品标准售价；无则回退最低有效报价
    const ownListPrice = product.listPrice != null ? toNumber(product.listPrice) : null;

    const index = ensureGroup(seriesName.toLowerCase(), seriesName);
    groups[index].products.push({
      id: product.productId,
      name: product.productName,
      model: product.model,
      description: product.description || null,
      unit: product.unit,
      price: ownListPrice ?? (defaultQuote ? toNumber(defaultQuote.sellPrice) : 0),
      quoteId: defaultQuote?.quoteId || "",
      moq: defaultQuote?.moq ?? 1,
      leadTime: defaultQuote?.leadTime ?? null,
      categoryId: product.categoryId,
      brandId: product.brandId,
      seriesName: product.series || null,
      seriesDesc: null,
    });
  });

  // Product 展示信息映射（不限上架状态）：供 ModelPrice 行通过 model 关联
  // 回填真实 Name/Description（价格模板无 Name 列时 productName 回退为型号）
  const productInfoMap = new Map(
    productInfoRows
      .filter((p) => p.productName && p.productName !== p.model)
      .map((p) => [p.model, p])
  );

  for (const row of seriesRows) {
    const name = row.seriesName.trim();
    // 空名称：注入的虚拟 seriesRow（特殊类目 seriesId=null 的 ModelPrice）
    // 没有系列归属，统一合并到 "(Others)" 分组展示
    const groupName = name || "(Others)";
    const slug = row.slug || "";

    // 空系列也建立分组（型号表中以"暂无型号"提示行展示）
    const index = ensureGroup(groupName.toLowerCase(), groupName, slug);
    if (!groups[index].seriesDesc) {
      groups[index].seriesDesc = row.description || null;
    }

    // 收集该分组已存在的 model（来自旧 Product），避免与新 ModelPrice 重复
    const existingModels = new Set(groups[index].products.map((p) => p.model));

    for (const mp of row.modelPrices) {
      // 同一 model 已由旧 Product 提供（含 quoteId 可加购），跳过新 ModelPrice 避免重复
      if (existingModels.has(mp.model)) continue;
      const info = productInfoMap.get(mp.model);
      groups[index].products.push({
        id: mp.modelPriceId,
        name: info?.productName || mp.productName,
        model: mp.model,
        description: info?.description || mp.description,
        unit: mp.unit,
        // 优胜行展示该行自身成交价（最低价行 / 最快交期行各一行）
        price: toNumber(mp.sellPrice),
        // 新模型暂无 SupplierQuote，quoteId 留空 → 前端加购按钮自动禁用
        quoteId: "",
        moq: mp.moq,
        condition: mp.condition ?? null,
        leadTime: mp.leadTime,
        categoryId: row.categoryId,
        brandId: row.brandId,
        seriesName: groupName,
        seriesDesc: row.description || null,
        priceTag:
          mp.isWinnerPrice && mp.isWinnerLeadTime
            ? "both"
            : mp.isWinnerPrice
              ? "lowest"
              : "fastest",
      });
    }
  }

  return groups;
}

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
  // 四条查询互相独立，并行发出
  const [products, seriesRows, productInfoRows, specialMpRows] = await Promise.all([
    prisma.product.findMany({
      where: {
        categoryId,
        brandId,
        status: "on_sale",
      },
      include: productInclude,
      orderBy: [{ series: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.series.findMany({
      where: { categoryId, brandId, isActive: true },
      select: seriesSelect,
      orderBy: { sortOrder: "asc" },
    }),
    prisma.product.findMany({
      where: { categoryId, brandId },
      select: productInfoSelect,
    }),
    // 特殊类目：seriesId=null 的 ModelPrice（不建 Series，价格行直接挂 categoryId+brandId）
    prisma.modelPrice.findMany({
      where: {
        isActive: true,
        status: "on_sale" as const,
        seriesId: null,
        OR: [{ isWinnerPrice: true }, { isWinnerLeadTime: true }],
        categoryId,
        brandId,
      },
      orderBy: [
        { isWinnerPrice: "desc" as const },
        { sortOrder: "asc" as const },
      ],
    }),
  ]);

  // 注入虚拟 seriesRow：把特殊类目 ModelPrice 塞进 seriesRows，让 buildSeriesGroups 复用统一逻辑
  let effectiveSeriesRows = seriesRows;
  if (specialMpRows.length > 0) {
    effectiveSeriesRows = [
      ...seriesRows,
      {
        seriesName: "", // 空名称 → buildSeriesGroups 会跳过（第 126 行 `if (!name) continue`）
        slug: "",
        description: null,
        categoryId,
        brandId,
        modelPrices: specialMpRows,
      } as unknown as SeriesRow,
    ];
  }

  // 规则：Product 独有 model（ModelPrice 表无对应价格行）不得上线展示
  // 从 ModelPrice 相关结果（Series.modelPrices + specialMpRows）提取全部有价格的 model 集合
  const modelsWithPrice = new Set<string>();
  for (const s of effectiveSeriesRows) {
    for (const mp of s.modelPrices) modelsWithPrice.add(mp.model);
  }
  // 过滤掉 Product 里不在 ModelPrice 集合中的行
  const filteredProducts = products.filter((p) => modelsWithPrice.has(p.model));

  return buildSeriesGroups(filteredProducts, effectiveSeriesRows, productInfoRows);
}

/**
 * 多品牌批量版：一个 categoryId 下多个品牌一次性取数（3 条带 IN 的查询），
 * 内存分桶后逐品牌分组。跨境外套 Neon 下把 N×3 条查询压缩为 3 条。
 * 返回 brandId → 该品牌的系列分组（分组为空即该品牌无可展示内容）。
 */
export async function getSeriesGroupsForCategoryBrands(
  categoryId: string,
  brandIds: string[]
): Promise<Map<string, SeriesGroup[]>> {
  const result = new Map<string, SeriesGroup[]>();
  if (brandIds.length === 0) return result;

  const [products, seriesRows, productInfoRows, specialMpRows] = await Promise.all([
    prisma.product.findMany({
      where: { categoryId, brandId: { in: brandIds }, status: "on_sale" },
      include: productInclude,
      orderBy: [{ series: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.series.findMany({
      where: { categoryId, brandId: { in: brandIds }, isActive: true },
      select: seriesSelect,
      orderBy: { sortOrder: "asc" },
    }),
    prisma.product.findMany({
      where: { categoryId, brandId: { in: brandIds } },
      select: productInfoSelect,
    }),
    prisma.modelPrice.findMany({
      where: {
        isActive: true,
        status: "on_sale" as const,
        seriesId: null,
        OR: [{ isWinnerPrice: true }, { isWinnerLeadTime: true }],
        categoryId,
        brandId: { in: brandIds },
      },
      orderBy: [
        { brandId: "asc" as const },
        { isWinnerPrice: "desc" as const },
        { sortOrder: "asc" as const },
      ],
    }),
  ]);

  // 特殊类目 ModelPrice 按 brandId 分桶，注入虚拟 seriesRow
  const buckets = new Map<
    string,
    {
      products: ProductRow[];
      seriesRows: SeriesRow[];
      infoRows: ProductInfoRow[];
      specialMps: typeof specialMpRows;
    }
  >();
  for (const brandId of brandIds) {
    buckets.set(brandId, { products: [], seriesRows: [], infoRows: [], specialMps: [] });
  }
  for (const p of products) buckets.get(p.brandId)?.products.push(p);
  for (const s of seriesRows) buckets.get(s.brandId)?.seriesRows.push(s);
  for (const info of productInfoRows) buckets.get(info.brandId)?.infoRows.push(info);
  for (const mp of specialMpRows) if (mp.brandId) buckets.get(mp.brandId)?.specialMps.push(mp);

  for (const [brandId, bucket] of buckets) {
    // 注入虚拟 seriesRow：空名称，modelPrices 填特殊类目行
    let effectiveSeriesRows = bucket.seriesRows;
    if (bucket.specialMps.length > 0) {
      effectiveSeriesRows = [
        ...bucket.seriesRows,
        {
          seriesName: "",
          slug: "",
          description: null,
          categoryId,
          brandId,
          modelPrices: bucket.specialMps,
        } as unknown as SeriesRow,
      ];
    }
    // 规则：Product 独有 model（ModelPrice 表无对应价格行）不得上线展示
    const modelsWithPrice = new Set<string>();
    for (const s of effectiveSeriesRows) {
      for (const mp of s.modelPrices) modelsWithPrice.add(mp.model);
    }
    const filteredProducts = bucket.products.filter((p) => modelsWithPrice.has(p.model));
    result.set(brandId, buildSeriesGroups(filteredProducts, effectiveSeriesRows, bucket.infoRows));
  }
  return result;
}
