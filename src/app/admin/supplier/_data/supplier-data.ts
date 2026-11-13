// Server-side data fetching for /admin/supplier
// Extracted from page.tsx (Phase 17) — pure data assembly, no behavior change.

import { prisma } from "@/lib/prisma";

export async function getSupplierList() {
  const [suppliers, brandRows] = await Promise.all([
    prisma.supplier.findMany({
      orderBy: [{ sortOrder: "asc" }, { supplierName: "asc" }],
      select: {
        supplierId: true,
        supplierNo: true,
        name: true,
        supplierName: true,
        email: true,
        country: true,
        isActive: true,
        qualificationLevel: true,
      },
    }),
    // 品牌仅作注释：取该供应商上传过的价格表中解析出的品牌名，不建立任何关联
    prisma.$queryRaw<Array<{ supplierId: string; brandName: string }>>`
      SELECT DISTINCT ib."supplierId" AS "supplierId", btrim(ibi."brandName") AS "brandName"
      FROM "ImportBatchItem" ibi
      JOIN "ImportBatch" ib ON ib."importBatchId" = ibi."importBatchId"
      WHERE ib."supplierId" IS NOT NULL
        AND ibi."brandName" IS NOT NULL
        AND btrim(ibi."brandName") <> ''
    `,
  ]);

  const brandsBySupplier = new Map<string, Set<string>>();
  for (const row of brandRows) {
    let set = brandsBySupplier.get(row.supplierId);
    if (!set) {
      set = new Set();
      brandsBySupplier.set(row.supplierId, set);
    }
    set.add(row.brandName);
  }

  return suppliers.map((s) => ({
    ...s,
    brands: Array.from(brandsBySupplier.get(s.supplierId) ?? [])
      .sort((a, b) => a.localeCompare(b))
      .map((brandName) => ({ brandName })),
  }));
}

export async function getSupplierDetail(supplierId: string) {
  return prisma.supplier.findUnique({
    where: { supplierId },
    include: {
      brands: {
        select: { brandName: true },
        orderBy: { brandName: "asc" },
      },
    },
  });
}
