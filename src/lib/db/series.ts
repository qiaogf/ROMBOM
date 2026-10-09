// Series queries — list series by category or brand (by slug or id).

import { prisma } from "@/lib/prisma";
import type { SeriesInfo } from "./types";
import { mergeSeriesSources } from "./types";

/** 获取指定类目下的所有产品系列（by category slug） */
export async function getSeriesByCategorySlug(categorySlug: string): Promise<SeriesInfo[]> {
  const category = await prisma.category.findUnique({
    where: { slug: categorySlug, isActive: true },
    select: { categoryId: true },
  });

  if (!category) return [];

  const seriesFromTable = await prisma.series.findMany({
    where: { categoryId: category.categoryId, isActive: true },
    select: { seriesName: true, description: true },
    orderBy: { seriesName: "asc" },
  });

  const products = await prisma.product.findMany({
    where: {
      categoryId: category.categoryId,
      status: "on_sale",
      series: { not: null },
    },
    select: { series: true },
    distinct: ["series"],
    orderBy: { series: "asc" },
  });

  return mergeSeriesSources(seriesFromTable, products);
}

/** 获取指定品牌下的所有产品系列（by brand slug） */
export async function getSeriesByBrandSlug(brandSlug: string): Promise<SeriesInfo[]> {
  const brand = await prisma.brand.findUnique({
    where: { slug: brandSlug },
    select: { brandId: true },
  });

  if (!brand) return [];

  const seriesFromTable = await prisma.series.findMany({
    where: { brandId: brand.brandId, isActive: true },
    select: { seriesName: true, description: true },
    orderBy: { seriesName: "asc" },
  });

  const products = await prisma.product.findMany({
    where: {
      brandId: brand.brandId,
      status: "on_sale",
      series: { not: null },
    },
    select: { series: true },
    distinct: ["series"],
    orderBy: { series: "asc" },
  });

  return mergeSeriesSources(seriesFromTable, products);
}

/** 获取指定类目下的所有产品系列（by categoryId） */
export async function getSeriesByCategoryId(categoryId: string): Promise<SeriesInfo[]> {
  const [seriesFromTable, products] = await Promise.all([
    prisma.series.findMany({
      where: { categoryId, isActive: true },
      select: { seriesName: true, description: true },
      orderBy: { seriesName: "asc" },
    }),
    prisma.product.findMany({
      where: { categoryId, status: "on_sale", series: { not: null } },
      select: { series: true },
      distinct: ["series"],
      orderBy: { series: "asc" },
    }),
  ]);
  return mergeSeriesSources(seriesFromTable, products);
}

/** 获取指定品牌下的所有产品系列（by brandId） */
export async function getSeriesByBrandId(brandId: string): Promise<SeriesInfo[]> {
  const [seriesFromTable, products] = await Promise.all([
    prisma.series.findMany({
      where: { brandId, isActive: true },
      select: { seriesName: true, description: true },
      orderBy: { seriesName: "asc" },
    }),
    prisma.product.findMany({
      where: { brandId, status: "on_sale", series: { not: null } },
      select: { series: true },
      distinct: ["series"],
      orderBy: { series: "asc" },
    }),
  ]);
  return mergeSeriesSources(seriesFromTable, products);
}
