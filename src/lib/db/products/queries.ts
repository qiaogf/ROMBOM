// Public product group queries — by category/brand slug or IDs.

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type {
  SeriesGroup,
  BrandProductsGroup,
  CategoryProductsGroup,
  Brand,
  Category,
  Product,
} from "../types";
import {
  getSeriesGroupsForCategoryBrand,
  getSeriesGroupsForCategoryBrands,
} from "./shared";
import { slugify, toNumber } from "../types";

/** 获取指定类目+品牌下的所有产品，按系列分组（by slug，Data Cache：tags catalog + 1h 兜底） */
export async function getProductGroupBySeries(
  categorySlug: string,
  brandSlug: string
): Promise<SeriesGroup[]> {
  const cached = unstable_cache(
    async (catSlug: string, brSlug: string): Promise<SeriesGroup[]> => {
      const category = await prisma.category.findUnique({
        where: { slug: catSlug, isActive: true },
        select: { categoryId: true },
      });

      // discontinued 只是标记值：不走类目+品牌联动路径（仅 /category/discontinued 扁平页展示）
      if (!category || catSlug === "discontinued") return [];

      const brand = await prisma.brand.findUnique({
        where: { slug: brSlug },
        select: { brandId: true },
      });

      if (!brand) return [];

      return getSeriesGroupsForCategoryBrand(category.categoryId, brand.brandId);
    },
    ["product-group-by-series", categorySlug, brandSlug],
    { tags: ["catalog", `category-${categorySlug}`, `brand-${brandSlug}`], revalidate: 3600 }
  );
  return cached(categorySlug, brandSlug);
}

/**
 * 类目页数据：通过 CategoryBrand 找出该类目关联的每个品牌，
 * 直接返回该品牌在此类目下按系列分组的全部型号产品（含空系列占位）。
 * 不含任何系列的关联品牌不输出（关联保留在表中，前台不渲染空品牌）。
 *
 * 查询数与品牌数解耦：1 条关联查询 + 1 次多品牌批量取数（内部 3 条并行），
 * 原实现为每品牌 3 条查询（跨境外套 Neon 下 N×3 条往返是主要耗时）。
 */
/**
 * 类目页数据（Data Cache：tags catalog + 1h 兜底；Confirm/Reject/Delete 时 revalidateTag 立即失效）。
 */
export async function getBrandProductsGroupsByCategorySlug(
  categorySlug: string
): Promise<BrandProductsGroup[]> {
  const cached = unstable_cache(
    getBrandProductsGroupsByCategorySlugUncached,
    ["brand-products-groups", categorySlug],
    { tags: ["catalog", `category-${categorySlug}`], revalidate: 3600 }
  );
  return cached(categorySlug);
}

async function getBrandProductsGroupsByCategorySlugUncached(
  categorySlug: string
): Promise<BrandProductsGroup[]> {
  // 一条查询同时拿到 categoryId 与关联品牌（嵌套 where 替代先查 category 再查 links）
  const links = await prisma.categoryBrand.findMany({
    where: { category: { slug: categorySlug, isActive: true }, brand: { isActive: true } },
    select: {
      categoryId: true,
      brand: {
        select: {
          brandId: true,
          brandName: true,
          slug: true,
          description: true,
        },
      },
    },
    orderBy: { brand: { brandName: "asc" } },
  });
  if (links.length === 0) return [];

  const categoryId = links[0].categoryId;
  const groupsMap = await getSeriesGroupsForCategoryBrands(
    categoryId,
    links.map((l) => l.brand.brandId)
  );

  const groups = links.map(({ brand }): BrandProductsGroup | null => {
    const seriesGroups = groupsMap.get(brand.brandId) ?? [];
    if (seriesGroups.length === 0) return null;
    return {
      brand: {
        id: brand.brandId,
        name: brand.brandName,
        description: brand.description || null,
        slug: brand.slug,
      } satisfies Brand,
      seriesGroups,
    };
  });

  return groups.filter((g): g is BrandProductsGroup => g !== null);
}

/**
 * 品牌页数据：通过 CategoryBrand 找出该品牌关联的每个类目，
 * 直接返回该品牌在此类目下按系列分组的全部型号产品（含空系列占位）。
 * 不含任何系列的关联类目不输出（关联保留在表中，前台不渲染空类目）。
 */
export async function getCategoryProductsGroupsByBrandSlug(
  brandSlug: string
): Promise<CategoryProductsGroup[]> {
  const cached = unstable_cache(
    getCategoryProductsGroupsByBrandSlugUncached,
    ["category-products-groups", brandSlug],
    { tags: ["catalog", `brand-${brandSlug}`], revalidate: 3600 }
  );
  return cached(brandSlug);
}

async function getCategoryProductsGroupsByBrandSlugUncached(
  brandSlug: string
): Promise<CategoryProductsGroup[]> {
  // 一条查询同时拿到 brandId 与关联类目（嵌套 where 替代先查 brand 再查 links）
  // discontinued 只是标记值：品牌页强制排除（该类目数据仅 /category/discontinued 展示）
  const links = await prisma.categoryBrand.findMany({
    where: { brand: { slug: brandSlug, isActive: true }, category: { isActive: true, slug: { not: "discontinued" } } },
    select: {
      brandId: true,
      category: {
        select: {
          categoryId: true,
          categoryName: true,
          slug: true,
          briefDesc: true,
        },
      },
    },
    orderBy: { category: { sortOrder: "asc" } },
  });
  if (links.length === 0) return [];

  // 品牌页维度为"一品牌 × 多类目"，批量版（一类目 × 多品牌）不适用，
  // 各类目独立取分组但整体并行（links 查询已从 2 条合并为 1 条）
  const brandId = links[0].brandId;
  const groups = await Promise.all(
    links.map(({ category }): Promise<CategoryProductsGroup | null> =>
      getSeriesGroupsForCategoryBrand(category.categoryId, brandId).then(
        (seriesGroups) =>
          seriesGroups.length === 0
            ? null
            : {
                category: {
                  id: category.categoryId,
                  name: category.categoryName,
                  description: category.briefDesc || null,
                  slug: category.slug,
                } satisfies Category,
                seriesGroups,
              }
      )
    )
  );

  return groups.filter((g): g is CategoryProductsGroup => g !== null);
}

// ============================================================================
// 扁平类目：Discontinued + 类目名含圆括号（如 (Cement)）
//   直接展示公开报价表 ProductPriceTable，所有型号平铺，按 brand→series→model 排序
//   跳过 CategoryBrand 关联链，适用于停产/行业聚合等"品牌系列停产多年难整理"的场景
// ============================================================================

/** 判断类目是否应走扁平报价表展示路径 */
export function isFlatCategory(nameOrSlug: string, slug: string): boolean {
  // 特殊类目格式：`<xxx>` / `(xxx)`（含全角括号），点击跳过系列选择直接展示公开价表
  return slug === "discontinued" || /[()<>（）]/.test(nameOrSlug);
}

/**
 * 产品页标题/面包屑/SEO 显示用：去掉导航类目名的 <>() 包装（`<Discontinued>` → `Discontinued`）。
 * 侧边栏导航保留原始名称（含括号），CSV Category 列也仍按导航原名填写。
 */
export function displayCategoryName(name: string): string {
  return name.replace(/[<>()（）]/g, "").trim();
}

/**
 * 扁平报价表查询：直接查该类目下所有 ModelPrice（不限 status，停产产品就是 off_sale），
 * 按 brandName → seriesName → model 排序后按 series 分组为 SeriesGroup[]，
 * 直接喂给 ProductPriceTable 组件渲染。
 * Data Cache：tags catalog + 1h 兜底。
 */
export async function getFlatPriceTableGroupsByCategorySlug(
  categorySlug: string
): Promise<SeriesGroup[]> {
  const cached = unstable_cache(
    getFlatPriceTableGroupsByCategorySlugUncached,
    ["flat-price-table", categorySlug],
    { tags: ["catalog", `category-${categorySlug}`], revalidate: 3600 }
  );
  return cached(categorySlug);
}

async function getFlatPriceTableGroupsByCategorySlugUncached(
  categorySlug: string
): Promise<SeriesGroup[]> {
  const category = await prisma.category.findUnique({
    where: { slug: categorySlug, isActive: true },
    select: { categoryId: true },
  });
  if (!category) return [];

  // 查出该类目下所有系列的 ModelPrice（不限 status，停产产品就是 off_sale 也要展示）
  const allMP = await prisma.modelPrice.findMany({
      where: {
        AND: [
          { isActive: true },
          // 线上只展示比价优胜行（最低价 / 最快交期）；特殊类目导入时已标记为优胜
          { OR: [{ isWinnerPrice: true }, { isWinnerLeadTime: true }] },
          // 特殊类目的行不建系列，直接落在 categoryId；普通类目仍走 series.categoryId
          {
            OR: [
              { categoryId: category.categoryId },
              { series: { categoryId: category.categoryId } },
            ],
          },
        ],
      },
      include: {
        brand: { select: { brandId: true, brandName: true } },
        series: {
          include: {
            brand: { select: { brandId: true, brandName: true } },
          },
        },
      },
      orderBy: [{ model: "asc" }],
    });

  // 规则：只显示 Product 表和 ModelPrice 表共同存在的 model
  // 取 allMP 的唯一 model 列表，查 Product 表存在性，过滤掉 ModelPrice 独有的
  const mpModels = Array.from(new Set(allMP.map((m) => m.model)));
  let filteredMP = allMP;
  // model → Product 的真实品牌：Generic（无品牌）行归到该品牌下，不再单独出 (Others) 组
  const brandByModel = new Map<string, { brandId: string; brandName: string }>();
  if (mpModels.length > 0) {
    const productModels = await prisma.product.findMany({
      where: { categoryId: category.categoryId, model: { in: mpModels } },
      select: { model: true, brandId: true, brand: { select: { brandName: true } } },
      distinct: ["model"],
    });
    const productModelSet = new Set(productModels.map((p) => p.model));
    filteredMP = allMP.filter((m) => productModelSet.has(m.model));
    productModels.forEach((p) => {
      if (p.brand?.brandName) {
        brandByModel.set(p.model, { brandId: p.brandId, brandName: p.brand.brandName });
      }
    });
  }

  // 特殊类目按【品牌】分组（不按系列）：CSV 的 Series 列不参与导入，分组标题就是品牌名
  //   Generic/无品牌行按 model 归到 Product 的真实品牌；找不到品牌的才落 "(Others)"（页面末尾）
  const normKey = (v: string) => v.replace(/[<>\s]+/g, "").toLowerCase();
  const isOthersBrand = (brandName: string) => normKey(brandName) === "generic";

  const groupMap = new Map<string, SeriesGroup>();
  // 记录遍历顺序（按品牌），保证分组按排序顺序出现
  const keyOrder: string[] = [];
  // groupKey → 排序层级（0 正常品牌 / 1 Others 末尾）
  const keyRank = new Map<string, number>();

  const rawBrandNameOf = (m: (typeof filteredMP)[number]) =>
    m.brand?.brandName ?? m.series?.brand?.brandName ?? null;
  const brandNameOf = (m: (typeof filteredMP)[number]) => {
    const raw = rawBrandNameOf(m);
    if (!raw || isOthersBrand(raw)) {
      return brandByModel.get(m.model)?.brandName ?? "(Others)";
    }
    return raw;
  };
  const brandIdOf = (m: (typeof filteredMP)[number]) => {
    const raw = m.brand?.brandId ?? m.series?.brand?.brandId ?? null;
    const rawName = rawBrandNameOf(m);
    if (!raw || !rawName || isOthersBrand(rawName)) {
      return brandByModel.get(m.model)?.brandId ?? null;
    }
    return raw;
  };

  // 品牌 → 系列 → 型号（无系列行 seriesName 视为空，排在该品牌最前）
  filteredMP.sort(
    (a, b) =>
      brandNameOf(a).localeCompare(brandNameOf(b)) ||
      (a.series?.seriesName ?? "").localeCompare(b.series?.seriesName ?? "") ||
      a.model.localeCompare(b.model)
  );

  for (const m of filteredMP) {
    const brandName = brandNameOf(m);
    const groupKey = isOthersBrand(brandName) ? "(Others)" : brandName;
    const displayName = groupKey;

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        seriesName: displayName,
        // (Others) 是特殊分组，不走 slugify（slugify 会剥掉括号导致系列详情页识别失败）
        seriesSlug: displayName === "(Others)" ? "(Others)" : slugify(groupKey),
        seriesDesc: null,
        products: [],
      });
      keyOrder.push(groupKey);
      keyRank.set(groupKey, isOthersBrand(brandName) ? 1 : 0);
    }

    const brandId = brandIdOf(m) ?? `fallback-${brandName.toLowerCase().replace(/\s+/g, "-")}`;
    // 优胜行展示该行自身成交价（最低价行 / 最快交期行各一行）
    groupMap.get(groupKey)!.products.push({
      id: m.modelPriceId,
      quoteId: "", // 扁平路径下暂不走加购
      name: m.productName,
      model: m.model,
      description: m.description ?? null,
      unit: m.unit,
      price: toNumber(m.sellPrice),
      moq: m.moq,
      condition: m.condition ?? null,
      leadTime: m.leadTime ?? null,
      categoryId: category.categoryId,
      brandId,
      seriesName: m.series?.seriesName ?? null,
      seriesDesc: null,
      priceTag:
        m.isWinnerPrice && m.isWinnerLeadTime
          ? "both"
          : m.isWinnerPrice
            ? "lowest"
            : "fastest",
    } satisfies Product);
  }

  // 组内同型号去重：Generic 行映射到品牌后可能与该品牌的同型号行同组，优先保留有价格的行
  for (const g of groupMap.values()) {
    const seen = new Map<string, (typeof g.products)[number]>();
    for (const p of g.products) {
      const prev = seen.get(p.model);
      if (!prev || (prev.price === 0 && p.price > 0)) seen.set(p.model, p);
    }
    g.products = Array.from(seen.values());
  }

  // 排序：正常品牌分组（0）→ (Others) 末尾（1），同级保持 SQL 排序顺序（品牌字母序）
  const orderedKeys = [...keyOrder].sort(
    (a, b) => (keyRank.get(a) ?? 0) - (keyRank.get(b) ?? 0)
  );
  return orderedKeys.map((k) => groupMap.get(k)!);
}
