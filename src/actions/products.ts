import { prisma } from "@/lib/prisma";
import type { Product, Category } from "@/../prisma/generated/client";

export type ProductWithCategory = Product & { category: Category };

type CategoryRaw = Awaited<ReturnType<typeof prisma.category.findMany>>[number];

type CategoryNode = CategoryRaw & {
  children: CategoryNode[];
  _count: { products: number };
};

// 获取所有类目（带 slug）并构建树结构，供侧边栏导航使用。
export async function getAllCategoriesWithSlug() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const categoryMap = new Map<string, CategoryNode>();
  const rootCategories: CategoryNode[] = [];

  categories.forEach((cat) => {
    categoryMap.set(cat.categoryId, { ...cat, children: [], _count: { products: 0 } });
  });

  categories.forEach((cat) => {
    const node = categoryMap.get(cat.categoryId);
    const parentId = cat.parentId;

    if (!parentId || parentId === "0") {
      rootCategories.push(node as CategoryNode);
    } else {
      const parentNode = categoryMap.get(parentId);
      if (parentNode) {
        parentNode.children.push(node as CategoryNode);
      } else {
        rootCategories.push(node as CategoryNode);
      }
    }
  });

  return rootCategories;
}

// 获取所有品牌（带 slug），供侧边栏导航使用。
export async function getAllBrandsWithSlug() {
  return prisma.brand.findMany({
    where: { isActive: true },
    orderBy: { brandName: "asc" },
  });
}

// 根据 productId 获取商品详情（含类目与有效报价），供产品详情页使用。
export async function getProductById(id: string): Promise<ProductWithCategory | null> {
  return prisma.product.findUnique({
    where: { productId: id },
    include: { category: true, supplierQuotes: { where: { isValid: true } } },
  }) as Promise<ProductWithCategory | null>;
}
