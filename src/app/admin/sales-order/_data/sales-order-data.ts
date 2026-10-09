// Server-side data fetching for /admin/sales-order
// Extracted from page.tsx (Phase 17) — pure data assembly, no behavior change.

import { prisma } from "@/lib/prisma";

export async function getSalesOrderList() {
  return prisma.salesOrder.findMany({
    orderBy: { orderTime: "desc" },
    include: {
      customer: { select: { firstName: true, lastName: true, email: true } },
      _count: { select: { items: true } },
    },
  });
}

export async function getSalesOrderDetail(orderId: string) {
  return prisma.salesOrder.findUnique({
    where: { orderId },
    include: { items: true },
  });
}
