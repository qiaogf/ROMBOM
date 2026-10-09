// Category + Brand queries (by slug, by id, list all, cross-relationships).

import { prisma } from "@/lib/prisma";
import type { Category, Brand } from "./types";

// ============ 按 slug 查询 ============

/** 根据 slug 获取类目信息 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const category = await prisma.category.findUnique({
    where: { slug, isActive: true },
  });

  if (!category) return null;

  return {
    id: category.categoryId,
    name: category.categoryName,
    description: category.briefDesc || null,
    slug: category.slug,
  };
}

/** 根据 slug 获取品牌信息 */
export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  const brand = await prisma.brand.findUnique({
    where: { slug, isActive: true },
  });

  if (!brand) return null;

  return {
    id: brand.brandId,
    name: brand.brandName,
    description: brand.description || null,
    slug: brand.slug,
  };
}

// ============ 获取关联数据（by slug） ============

/** 获取指定类目下的所有品牌 */
export async function getBrandsByCategorySlug(categorySlug: string): Promise<Brand[]> {
  const category = await prisma.category.findUnique({
    where: { slug: categorySlug, isActive: true },
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
}

/** 获取指定品牌下的所有类目 */
export async function getCategoriesByBrandSlug(brandSlug: string): Promise<Category[]> {
  const brand = await prisma.brand.findUnique({
    where: { slug: brandSlug },
    select: { brandId: true },
  });

  if (!brand) return [];

  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      brands: { some: { brandId: brand.brandId } },
    },
    orderBy: { sortOrder: "asc" },
  });

  return categories.map((category) => ({
    id: category.categoryId,
    name: category.categoryName,
    description: category.briefDesc || null,
    slug: category.slug,
  }));
}

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

// ============ ID 辅助查询 ============

/** 根据 slug 获取类目 ID */
export async function getCategoryIdBySlug(slug: string): Promise<string | null> {
  const category = await prisma.category.findUnique({
    where: { slug, isActive: true },
    select: { categoryId: true },
  });
  return category?.categoryId || null;
}

/** 根据 slug 获取品牌 ID */
export async function getBrandIdBySlug(slug: string): Promise<string | null> {
  const brand = await prisma.brand.findUnique({
    where: { slug },
    select: { brandId: true },
  });
  return brand?.brandId || null;
}

// ============ 全量查询 ============

/** 获取所有类目（带 slug） */
export async function getAllCategories(): Promise<Category[]> {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return categories.map((category) => ({
    id: category.categoryId,
    name: category.categoryName,
    description: category.briefDesc || null,
    slug: category.slug,
  }));
}

/** 获取所有品牌（带 slug） */
export async function getAllBrands(): Promise<Brand[]> {
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    orderBy: { brandName: "asc" },
  });

  return brands.map((brand) => ({
    id: brand.brandId,
    name: brand.brandName,
    description: brand.description || null,
    slug: brand.slug,
  }));
}

// ============ 按 ID 查询 ============

/** 根据 categoryId 获取类目信息 */
export async function getCategoryById(id: string): Promise<Category | null> {
  const category = await prisma.category.findUnique({
    where: { categoryId: id, isActive: true },
  });
  if (!category) return null;
  return {
    id: category.categoryId,
    name: category.categoryName,
    description: category.briefDesc || null,
    slug: category.slug,
  };
}

/** 根据 brandId 获取品牌信息 */
export async function getBrandById(id: string): Promise<Brand | null> {
  const brand = await prisma.brand.findUnique({
    where: { brandId: id, isActive: true },
  });
  if (!brand) return null;
  return {
    id: brand.brandId,
    name: brand.brandName,
    description: brand.description || null,
    slug: brand.slug,
  };
}

/** 根据 categoryId 获取该类目下的所有品牌 */
export async function getBrandsByCategoryId(categoryId: string): Promise<Brand[]> {
  const brands = await prisma.brand.findMany({
    where: {
      isActive: true,
      categories: { some: { categoryId } },
    },
    orderBy: [{ sortOrder: "asc" }, { brandName: "asc" }],
  });
  return brands.map((b) => ({
    id: b.brandId,
    name: b.brandName,
    description: b.description || null,
    slug: b.slug,
  }));
}

/** 根据 brandId 获取该品牌下的所有类目 */
export async function getCategoriesByBrandId(brandId: string): Promise<Category[]> {
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      brands: { some: { brandId } },
    },
    orderBy: { sortOrder: "asc" },
  });
  return categories.map((c) => ({
    id: c.categoryId,
    name: c.categoryName,
    description: c.briefDesc || null,
    slug: c.slug,
  }));
}
