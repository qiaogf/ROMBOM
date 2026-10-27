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
  // Condition 经关联销售订单的明细（model → modelPrice.condition）映射得出：
  // POItem 未存 condition 快照，同单同型号即客户下单时看到的 ModelPrice 条件
  return prisma.purchaseOrder.findUnique({
    where: { poId },
    include: {
      items: true,
      salesOrder: {
        select: {
          orderNumber: true,
          items: { select: { model: true, modelPrice: { select: { condition: true } } } },
        },
      },
    },
  });
}

// 按销售订单取全部采购订单（含明细）—— 点击 SalesOrder 列时右侧显示该销售单对应的所有 PO 明细
export async function getPurchaseOrdersBySalesOrder(orderNumber: string) {
  const pos = await prisma.purchaseOrder.findMany({
    where: { salesOrder: { orderNumber } },
    orderBy: { poNumber: "asc" },
    include: {
      items: true,
      salesOrder: {
        select: {
          orderNumber: true,
          items: { select: { model: true, modelPrice: { select: { condition: true } } } },
        },
      },
    },
  });
  return pos;
}
