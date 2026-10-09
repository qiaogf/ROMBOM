import { prisma } from "@/lib/prisma";
import { SeriesContent } from "./SeriesContent";

export const dynamic = "force-dynamic";

export default async function SeriesListPage() {
  const [series, brands, categories] = await Promise.all([
    prisma.series.findMany({
      orderBy: [{ sortOrder: "asc" }, { seriesName: "asc" }],
      include: {
        brand: { select: { brandId: true, brandName: true } },
        category: { select: { categoryId: true, categoryName: true } },
      },
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      select: { brandId: true, brandName: true },
      orderBy: { brandName: "asc" },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { categoryId: true, categoryName: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const brandOptions = brands.map((b) => ({
    brandId: b.brandId,
    brandName: b.brandName,
  }));

  const categoryOptions = categories.map((c) => ({
    categoryId: c.categoryId,
    categoryName: c.categoryName,
  }));

  return <SeriesContent series={series} brandOptions={brandOptions} categoryOptions={categoryOptions} />;
}
