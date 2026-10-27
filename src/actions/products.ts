import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Product, Category } from "@/../prisma/generated/client";

export type ProductWithCategory = Product & { category: Category };

type CategoryRaw = Awaited<ReturnType<typeof prisma.category.findMany>>[number];

type CategoryNode = CategoryRaw & {
  children: CategoryNode[];
  _count: { products: number };
};

// 获取所有类目（带 slug）并构建树结构，供侧边栏导航使用。
// Data Cache：动态页布局每次渲染都会调用，跨境外套 Neon 下不加缓存=每请求 2 次串行往返（~500ms 基线+抖动）。
// tags catalog：Admin 类目/品牌增删改路径已有 revalidateTag("catalog") 联动失效。
export async function getAllCategoriesWithSlug() {
  const cached = unstable_cache(
    async () => {
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
    },
    ["sidebar-categories"],
    { tags: ["catalog"], revalidate: 3600 }
  );
  return cached();
}

// 获取所有品牌（带 slug），供侧边栏导航使用。（Data Cache 同上）
export async function getAllBrandsWithSlug() {
  const cached = unstable_cache(
    async () =>
      prisma.brand.findMany({
        where: { isActive: true },
        // sortOrder 升序优先，同值按名称字母序（与后台列表/分类页一致）
        orderBy: [{ sortOrder: "asc" }, { brandName: "asc" }],
      }),
    ["sidebar-brands"],
    { tags: ["catalog"], revalidate: 3600 }
  );
  return cached();
}

// 根据 productId 获取商品详情（含类目与有效报价），供产品详情页使用。
export async function getProductById(id: string): Promise<ProductWithCategory | null> {
  return prisma.product.findUnique({
    where: { productId: id },
    include: { category: true, supplierQuotes: { where: { isValid: true } } },
  }) as Promise<ProductWithCategory | null>;
}
