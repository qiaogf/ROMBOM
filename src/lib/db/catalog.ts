// Category + Brand queries (by slug, by id, list all, cross-relationships).

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Category, Brand } from "./types";

// ============ 按 slug 查询 ============

/** 根据 slug 获取类目信息（React cache 请求级去重 + Data Cache tags catalog，同页 metadata + 正文只查一次库） */
export const getCategoryBySlug = cache(async function getCategoryBySlug(
  slug: string
): Promise<Category | null> {
  const cached = unstable_cache(
    async (s: string): Promise<Category | null> => {
      const category = await prisma.category.findUnique({
        where: { slug: s, isActive: true },
      });

      if (!category) return null;

      return {
        id: category.categoryId,
        name: category.categoryName,
        description: category.briefDesc || null,
        slug: category.slug,
      };
    },
    ["category-by-slug", slug],
    { tags: ["catalog"], revalidate: 3600 }
  );
  return cached(slug);
});

/** 根据 slug 获取品牌信息（Data Cache：tags catalog + 1h 兜底；品牌页 generateMetadata + 正文共用） */
export const getBrandBySlug = cache(async function getBrandBySlug(
  slug: string
): Promise<Brand | null> {
  const cached = unstable_cache(
    async (s: string): Promise<Brand | null> => {
      const brand = await prisma.brand.findUnique({
        where: { slug: s, isActive: true },
      });

      if (!brand) return null;

      return {
        id: brand.brandId,
        name: brand.brandName,
        description: brand.description || null,
        slug: brand.slug,
      };
    },
    ["brand-by-slug", slug],
    { tags: ["catalog"], revalidate: 3600 }
  );
  return cached(slug);
});

// ============ 获取关联数据（by slug） ============

/** 获取指定类目下的所有品牌（Data Cache：tags catalog + 1h 兜底；类目页/目录页共用） */
export const getBrandsByCategorySlug = cache(async function getBrandsByCategorySlug(
  categorySlug: string
): Promise<Brand[]> {
  const cached = unstable_cache(
    async (slug: string): Promise<Brand[]> => {
      const category = await prisma.category.findUnique({
        where: { slug, isActive: true },
        select: { categoryId: true },
      });

      if (!category) return [];

      const brands = await prisma.brand.findMany({
        where: {
          isActive: true,
          categories: { some: { categoryId: category.categoryId } },
        },
        orderBy: [{ sortOrder: "asc" }, { brandName: "asc" }],
      });

      return brands.map((brand) => ({
        id: brand.brandId,
        name: brand.brandName,
        description: brand.description || null,
        slug: brand.slug,
      }));
    },
    ["brands-by-category-slug", categorySlug],
    { tags: ["catalog"], revalidate: 3600 }
  );
  return cached(categorySlug);
});

// ============ 品类解析 ============

/**
 * 为指定品牌解析其所属品类 — 用于导入新品时自动归类，
 * 保证业务规则"一个系列/产品既属于一个品牌，也属于一个品类"成立。
 *
 * 优先级：
 *   1) CategoryBrand 显式关联（后台维护的品牌↔品类多对多）
 *   2) 该品牌已有在售产品中最常见的品类（从现有数据派生）
 *   3) 系统首个 active 品类（兜底）
 */
export async function resolveCategoryIdForBrand(brandId: string): Promise<string | null> {
  // 1) 显式品类关联
  const link = await prisma.categoryBrand.findFirst({
    where: { brandId },
    select: { categoryId: true },
  });
  if (link) return link.categoryId;

  // 2) 该品牌已有在售产品最常见的品类
  const products = await prisma.product.findMany({
    where: { brandId, status: "on_sale" },
    select: { categoryId: true },
    take: 500,
  });
  if (products.length > 0) {
    const counts = new Map<string, number>();
    for (const pr of products) {
      counts.set(pr.categoryId, (counts.get(pr.categoryId) || 0) + 1);
    }
    let best = "";
    let bestN = 0;
    for (const [cid, n] of counts) {
      if (n > bestN) {
        best = cid;
        bestN = n;
      }
    }
    if (best) return best;
  }

  // 3) 兜底：系统首个 active 品类
  const first = await prisma.category.findFirst({
    where: { isActive: true },
    select: { categoryId: true },
    orderBy: { sortOrder: "asc" },
  });
  return first?.categoryId ?? null;
}
