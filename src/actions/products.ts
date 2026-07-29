import { prisma } from "@/lib/prisma";

export async function getFeaturedProducts() {
  return prisma.product.findMany({
    where: { featured: true, isActive: true },
    include: { category: true },
    take: 8,
    orderBy: { salesCount: "desc" },
  });
}

export async function getCategories() {
  return prisma.category.findMany({
    where: { isActive: true, parentId: null },
    take: 6,
    orderBy: { sortOrder: "asc" },
  });
}

export async function getAllCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getTopSellers() {
  return prisma.product.findMany({
    where: { isActive: true },
    take: 4,
    orderBy: { salesCount: "desc" },
  });
}

export async function getNewestProducts() {
  return prisma.product.findMany({
    where: { isActive: true },
    take: 4,
    orderBy: { createdAt: "desc" },
  });
}

import type { Product, Category } from "@/../prisma/generated/client";

export type ProductWithCategory = Product & { category: Category };

interface PaginatedProductsResult {
  products: ProductWithCategory[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getProductById(id: string): Promise<ProductWithCategory | null> {
  return prisma.product.findUnique({
    where: { id, isActive: true },
    include: { category: true },
  }) as Promise<ProductWithCategory | null>;
}

export async function getPaginatedProducts(
  page: number = 1,
  pageSize: number = 12,
  categoryId?: string
): Promise<PaginatedProductsResult> {
  const skip = (page - 1) * pageSize;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: categoryId
        ? { isActive: true, categoryId }
        : { isActive: true },
      include: { category: true },
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }) as Promise<(Product & { category: Category })[]>,
    prisma.product.count({
      where: categoryId
        ? { isActive: true, categoryId }
        : { isActive: true },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    products,
    total,
    page,
    pageSize,
    totalPages,
  };
}