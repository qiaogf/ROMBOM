// Public product group queries — by category/brand slug or IDs.

import { prisma } from "@/lib/prisma";
import type {
  SeriesGroup,
  BrandProductsGroup,
  CategoryProductsGroup,
  Brand,
  Category,
} from "../types";
import { getSeriesGroupsForCategoryBrand } from "./shared";

/** 获取指定类目+品牌下的所有产品，按系列分组（by slug） */
export async function getProductGroupBySeries(
  categorySlug: string,
  brandSlug: string
): Promise<SeriesGroup[]> {
  const category = await prisma.category.findUnique({
    where: { slug: categorySlug, isActive: true },
    select: { categoryId: true },
  });

  if (!category) return [];

  const brand = await prisma.brand.findUnique({
    where: { slug: brandSlug },
    select: { brandId: true },
  });

  if (!brand) return [];

  return getSeriesGroupsForCategoryBrand(category.categoryId, brand.brandId);
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
 */
export async function getBrandProductsGroupsByCategorySlug(
  categorySlug: string
): Promise<BrandProductsGroup[]> {
  const category = await prisma.category.findUnique({
    where: { slug: categorySlug, isActive: true },
    select: { categoryId: true },
  });
  if (!category) return [];

  const links = await prisma.categoryBrand.findMany({
    where: { categoryId: category.categoryId, brand: { isActive: true } },
    select: {
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

  const groups = await Promise.all(
    links.map(async ({ brand }): Promise<BrandProductsGroup | null> => {
      const seriesGroups = await getSeriesGroupsForCategoryBrand(
        category.categoryId,
        brand.brandId
      );
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
    })
  );

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
  const brand = await prisma.brand.findUnique({
    where: { slug: brandSlug, isActive: true },
    select: { brandId: true },
  });
  if (!brand) return [];

  const links = await prisma.categoryBrand.findMany({
    where: { brandId: brand.brandId, category: { isActive: true } },
    select: {
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

  const groups = await Promise.all(
    links.map(async ({ category }): Promise<CategoryProductsGroup | null> => {
      const seriesGroups = await getSeriesGroupsForCategoryBrand(
        category.categoryId,
        brand.brandId
      );
      if (seriesGroups.length === 0) return null;
      return {
        category: {
          id: category.categoryId,
          name: category.categoryName,
          description: category.briefDesc || null,
          slug: category.slug,
        } satisfies Category,
        seriesGroups,
      };
    })
  );

  return groups.filter((g): g is CategoryProductsGroup => g !== null);
}
