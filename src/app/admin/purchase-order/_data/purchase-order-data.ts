// Server-side data fetching for /admin/purchase-order
// Extracted from page.tsx (Phase 18) — pure data assembly, no behavior change.

import { prisma } from "@/lib/prisma";

export async function getPurchaseOrderList() {
  return prisma.purchaseOrder.findMany({
    // 仅显示关联 Sales Order 已 Approved 的 PO，或无关联 SO 的手动 PO
    where: {
      OR: [
        { salesOrder: { auditStatus: "approved" } },
        { salesOrderId: null },
      ],
    },
    orderBy: { orderTime: "desc" },
    include: {
      supplier: { select: { email: true } },
      // 带完整 salesOrder 数据（用于 resolveOrderLifecycle 显示生命周期徽章）
      salesOrder: true,
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
