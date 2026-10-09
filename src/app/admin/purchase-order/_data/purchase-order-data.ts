// Server-side data fetching for /admin/purchase-order
// Extracted from page.tsx (Phase 18) — pure data assembly, no behavior change.

import { prisma } from "@/lib/prisma";

export async function getPurchaseOrderList() {
  return prisma.purchaseOrder.findMany({
    orderBy: { orderTime: "desc" },
    include: {
      supplier: { select: { email: true } },
      salesOrder: { select: { orderNumber: true } },
      _count: { select: { items: true } },
    },
  });
}

export async function getPurchaseOrderDetail(poId: string) {
  return prisma.purchaseOrder.findUnique({
    where: { poId },
    include: { items: true, salesOrder: { select: { orderNumber: true } } },
  });
}
