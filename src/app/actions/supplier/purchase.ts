"use server";

// Supplier 采购单操作：Accept / Reject 明细行（单行 + 整单批量）。

import { prisma } from "@/lib/prisma";
import { getSupplierSession } from "@/lib/auth-admin";

/**
 * 供应商切换采购明细行的 Accept 状态：false → true 或 true → false
 * 仅允许操作属于当前登录供应商且 auditStatus=approved 的采购单明细行
 */
export async function togglePurchaseOrderItemAccept(
  itemId: string,
  accept: boolean
): Promise<{ success: boolean; message: string }> {
  if (!itemId) return { success: false, message: "Item ID is required." };
  const session = await getSupplierSession();
  if (!session) return { success: false, message: "Unauthorized. Supplier login required." };

  try {
    // 先查 item → 确认归属供应商 + PO 已 Approve（才允许切换）
    const item = await prisma.purchaseOrderItem.findUnique({
      where: { itemId },
      include: {
        purchaseOrder: {
          select: { poId: true, supplierId: true, auditStatus: true },
        },
      },
    });
    if (!item) return { success: false, message: "Purchase order item not found." };

    const po = item.purchaseOrder;
    if (po.supplierId !== session.supplierId) {
      return { success: false, message: "Unauthorized. This item does not belong to your supplier account." };
    }
    if (po.auditStatus !== "approved") {
      return { success: false, message: "You can only accept items from approved purchase orders." };
    }

    await prisma.purchaseOrderItem.update({
      where: { itemId },
      data: { accept },
    });

    return { success: true, message: accept ? "Item accepted." : "Item acceptance withdrawn." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to update: ${msg}` };
  }
}

/**
 * 供应商一键接受 / 拒绝整个 PO 的所有明细行
 * 仅允许操作属于当前登录供应商且 auditStatus=approved 的采购单
 */
export async function setPurchaseOrderAllItemsAccept(
  poId: string,
  accept: boolean
): Promise<{ success: boolean; message: string }> {
  if (!poId) return { success: false, message: "PO ID is required." };
  const session = await getSupplierSession();
  if (!session) return { success: false, message: "Unauthorized. Supplier login required." };

  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { poId },
      select: { supplierId: true, auditStatus: true },
    });
    if (!po) return { success: false, message: "Purchase order not found." };
    if (po.supplierId !== session.supplierId) {
      return { success: false, message: "Unauthorized. This PO does not belong to your supplier account." };
    }
    if (po.auditStatus !== "approved") {
      return { success: false, message: "You can only accept items from approved purchase orders." };
    }

    await prisma.purchaseOrderItem.updateMany({
      where: { poId },
      data: { accept },
    });

    return { success: true, message: accept ? "All items accepted." : "All items rejected." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to update: ${msg}` };
  }
}
