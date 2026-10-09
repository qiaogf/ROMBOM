import { prisma } from "@/lib/prisma";
import { BrandContent } from "./BrandContent";

export const dynamic = "force-dynamic";

export default async function BrandListPage() {
  const brands = await prisma.brand.findMany({
    orderBy: [{ sortOrder: "asc" }, { brandName: "asc" }],
  });

  return <BrandContent brands={brands} />;
}
