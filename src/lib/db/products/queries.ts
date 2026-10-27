// Public product group queries — by category/brand slug or IDs.

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type {
  SeriesGroup,
  BrandProductsGroup,
  CategoryProductsGroup,
  Brand,
  Category,
} from "../types";
import {
  getSeriesGroupsForCategoryBrand,
  getSeriesGroupsForCategoryBrands,
} from "./shared";

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

/** 根据 categoryId + brandId 获取产品并按系列分组 */
export async function getProductGroupBySeriesByIds(
  categoryId: string,
  brandId: string
): Promise<SeriesGroup[]> {
  return getSeriesGroupsForCategoryBrand(categoryId, brandId);
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
