// Server-side data fetching for /admin/supplier
// Extracted from page.tsx (Phase 17) — pure data assembly, no behavior change.

import { prisma } from "@/lib/prisma";

export async function getSupplierList() {
  return prisma.supplier.findMany({
    orderBy: [{ sortOrder: "asc" }, { supplierName: "asc" }],
    select: {
      supplierId: true,
      name: true,
      supplierName: true,
      email: true,
      country: true,
      isActive: true,
      qualificationLevel: true,
    },
  });
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
