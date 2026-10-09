import { prisma } from "@/lib/prisma";
import { CategoryContent } from "./CategoryContent";

export const dynamic = "force-dynamic";

export default async function CategoryListPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { categoryName: "asc" }],
  });

  const parentOptions = categories.map((c) => ({
    categoryId: c.categoryId,
    categoryName: c.categoryName,
  }));

  return (
    <CategoryContent
      categories={categories}
      parentOptions={parentOptions}
    />
  );
}
