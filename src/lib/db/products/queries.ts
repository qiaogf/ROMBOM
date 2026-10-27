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

      if (!category) return [];

      const brand = await prisma.brand.findUnique({
        where: { slug: brSlug },
        select: { brandId: true },
      });

      if (!brand) return [];

      return getSeriesGroupsForCategoryBrand(category.categoryId, brand.brandId);
    },
    ["product-group-by-series", categorySlug, brandSlug],
    { tags: ["catalog"], revalidate: 3600 }
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
    { tags: ["catalog"], revalidate: 3600 }
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
    { tags: ["catalog"], revalidate: 3600 }
  );
  return cached(brandSlug);
}

async function getCategoryProductsGroupsByBrandSlugUncached(
  brandSlug: string
): Promise<CategoryProductsGroup[]> {
  // 一条查询同时拿到 brandId 与关联类目（嵌套 where 替代先查 brand 再查 links）
  const links = await prisma.categoryBrand.findMany({
    where: { brand: { slug: brandSlug, isActive: true }, category: { isActive: true } },
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
    { tags: ["catalog"], revalidate: 3600 }
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
  // 同时取 Product 的 ListPrice：比价任务写入的产品标准售价优先于该行 sellPrice，
  // 与标准路径（shared.ts）保持一致，避免同一型号在类目页与品牌页显示两个价。
  const [allMP, productInfoRows] = await Promise.all([
    prisma.modelPrice.findMany({
      where: {
        isActive: true,
        // 特殊类目的行不建系列，直接落在 categoryId；普通类目仍走 series.categoryId
        OR: [
          { categoryId: category.categoryId },
          { series: { categoryId: category.categoryId } },
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
    }),
    prisma.product.findMany({
      where: { categoryId: category.categoryId },
      select: { model: true, brandId: true, listPrice: true },
    }),
  ]);

  // 型号索引按「品牌 + 归一化型号」，大小写/空格差异也能命中
  const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();
  const listPriceByKey = new Map<string, number>();
  for (const p of productInfoRows) {
    if (p.listPrice == null) continue;
    listPriceByKey.set(`${p.brandId}|${norm(p.model)}`, toNumber(p.listPrice));
  }

  // 特殊类目按【品牌】分组（不按系列）：CSV 的 Series 列不参与导入，分组标题就是品牌名
  //   无品牌行（导入时归到 Generic）→ "(Others)"，排在页面末尾
  const normKey = (v: string) => v.replace(/[<>\s]+/g, "").toLowerCase();
  const isOthersBrand = (brandName: string) => normKey(brandName) === "generic";

  const groupMap = new Map<string, SeriesGroup>();
  // 记录遍历顺序（按品牌），保证分组按排序顺序出现
  const keyOrder: string[] = [];
  // groupKey → 排序层级（0 正常品牌 / 1 Others 末尾）
  const keyRank = new Map<string, number>();

  const brandNameOf = (m: (typeof allMP)[number]) =>
    m.brand?.brandName ?? m.series?.brand?.brandName ?? "(Others)";
  const brandIdOf = (m: (typeof allMP)[number]) =>
    m.brand?.brandId ?? m.series?.brand?.brandId ?? null;

  // 品牌 → 系列 → 型号（无系列行 seriesName 视为空，排在该品牌最前）
  allMP.sort(
    (a, b) =>
      brandNameOf(a).localeCompare(brandNameOf(b)) ||
      (a.series?.seriesName ?? "").localeCompare(b.series?.seriesName ?? "") ||
      a.model.localeCompare(b.model)
  );

  for (const m of allMP) {
    const brandName = brandNameOf(m);
    const groupKey = isOthersBrand(brandName) ? "(Others)" : brandName;
    const displayName = groupKey;

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        seriesName: displayName,
        seriesSlug: slugify(groupKey),
        seriesDesc: null,
        products: [],
      });
      keyOrder.push(groupKey);
      keyRank.set(groupKey, isOthersBrand(brandName) ? 1 : 0);
    }

    const brandId = brandIdOf(m) ?? `fallback-${brandName.toLowerCase().replace(/\s+/g, "-")}`;
    // ListPrice 优先（比价任务写入）；无产品级 ListPrice 时回退该行 sellPrice
    const listPrice = listPriceByKey.get(`${brandId}|${norm(m.model)}`);
    groupMap.get(groupKey)!.products.push({
      id: m.modelPriceId,
      quoteId: "", // 扁平路径下暂不走加购
      name: m.productName,
      model: m.model,
      description: m.description ?? null,
      unit: m.unit,
      price: listPrice ?? toNumber(m.sellPrice),
      moq: m.moq,
      condition: m.condition ?? null,
      leadTime: m.leadTime ?? null,
      categoryId: category.categoryId,
      brandId,
      seriesName: m.series?.seriesName ?? null,
      seriesDesc: null,
    } satisfies Product);
  }

  // 排序：正常品牌分组（0）→ (Others) 末尾（1），同级保持 SQL 排序顺序（品牌字母序）
  const orderedKeys = [...keyOrder].sort(
    (a, b) => (keyRank.get(a) ?? 0) - (keyRank.get(b) ?? 0)
  );
  return orderedKeys.map((k) => groupMap.get(k)!);
}
