"use server";

// 采购订单相关 admin actions：审核 / 提交 / 撤回 / 删除 / 明细改价改量增行。

import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth-admin";
import { round4 } from "./shared";

// ============ 订单审核 ============

// 采购订单审核
export async function approvePurchaseOrder(formData: FormData): Promise<{ success: boolean; message: string }> {
  const poId = (formData.get("poId") as string)?.trim();
  if (!poId) return { success: false, message: "PO ID is required." };
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  try {
    await prisma.purchaseOrder.update({ where: { poId }, data: { auditStatus: "approved" } });
    return { success: true, message: "Purchase order approved." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to approve: ${msg}` };
  }
}

// 草稿采购单提交审批：draft → ordered（管理者确认单价/数量后手动触发）
export async function submitPurchaseOrder(formData: FormData): Promise<{ success: boolean; message: string }> {
  const poId = (formData.get("poId") as string)?.trim();
  if (!poId) return { success: false, message: "PO ID is required." };
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  try {
    const po = await prisma.purchaseOrder.findUnique({ where: { poId }, select: { poStatus: true } });
    if (!po) return { success: false, message: "Purchase order not found." };
    if (po.poStatus !== "draft") return { success: false, message: "Only draft purchase orders can be submitted." };
    await prisma.purchaseOrder.update({ where: { poId }, data: { poStatus: "ordered" } });
    return { success: true, message: "Purchase order submitted." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to submit: ${msg}` };
  }
}

// 撤回采购订单：approved → pending（供应商端不再可见）
export async function withdrawPurchaseOrder(formData: FormData): Promise<{ success: boolean; message: string }> {
  const poId = (formData.get("poId") as string)?.trim();
  if (!poId) return { success: false, message: "PO ID is required." };
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  try {
    await prisma.purchaseOrder.update({ where: { poId }, data: { auditStatus: "pending" } });
    return { success: true, message: "Purchase order withdrawn." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to withdraw: ${msg}` };
  }
}

// ============ 订单明细改价（2026-10-20）============

// 管理者改采购订单明细的实际采购价（PurPrice 输入框，初始=unitPrice 供应单价）
// 同步重算 PO totalAmount = Σ (purPrice ?? unitPrice) × qty
export async function updatePurchaseOrderItemPurPrice(formData: FormData): Promise<{ success: boolean; message: string }> {
  const itemId = (formData.get("itemId") as string)?.trim();
  if (!itemId) return { success: false, message: "Item ID is required." };
  const purPrice = Number(formData.get("purPrice"));
  if (!Number.isFinite(purPrice) || purPrice <= 0 || purPrice > 1000000) {
    return { success: false, message: "PurPrice must be a number between 0 and 1,000,000." };
  }
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.purchaseOrderItem.findUnique({ where: { itemId } });
      if (!item) throw new Error("Purchase order item not found.");
      await tx.purchaseOrderItem.update({
        where: { itemId },
        data: { purPrice: round4(purPrice) },
      });
      const po = await tx.purchaseOrder.findUnique({
        where: { poId: item.poId },
        include: { items: true },
      });
      if (!po) throw new Error("Purchase order not found.");
      const totalAmount = round4(
        po.items.reduce((sum, it) => sum + Number(it.purPrice ?? it.unitPrice) * it.quantity, 0)
      );
      await tx.purchaseOrder.update({ where: { poId: po.poId }, data: { totalAmount } });
    });
    return { success: true, message: "PurPrice updated." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to update PurPrice: ${msg}` };
  }
}

// 管理者改采购订单明细的实际采购数量（Qty 输入框，初始=订单创建时按报价从低到高分配的数量）
// 同步重算 PO totalAmount = Σ (purPrice ?? unitPrice) × qty
export async function updatePurchaseOrderItemQty(formData: FormData): Promise<{ success: boolean; message: string }> {
  const itemId = (formData.get("itemId") as string)?.trim();
  if (!itemId) return { success: false, message: "Item ID is required." };
  const qty = Number(formData.get("quantity"));
  if (!Number.isInteger(qty) || qty < 1 || qty > 99999) {
    return { success: false, message: "Quantity must be an integer between 1 and 99,999." };
  }
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.purchaseOrderItem.findUnique({ where: { itemId } });
      if (!item) throw new Error("Purchase order item not found.");
      await tx.purchaseOrderItem.update({
        where: { itemId },
        data: { quantity: qty },
      });
      const po = await tx.purchaseOrder.findUnique({
        where: { poId: item.poId },
        include: { items: true },
      });
      if (!po) throw new Error("Purchase order not found.");
      const totalAmount = round4(
        po.items.reduce((sum, it) => sum + Number(it.purPrice ?? it.unitPrice) * it.quantity, 0)
      );
      await tx.purchaseOrder.update({ where: { poId: po.poId }, data: { totalAmount } });
    });
    return { success: true, message: "Quantity updated." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to update quantity: ${msg}` };
  }
}

// 删除采购订单（PurchaseOrderItem 由 onDelete: Cascade 自动清理）
export async function deletePurchaseOrder(formData: FormData): Promise<{ success: boolean; message: string }> {
  const poId = (formData.get("poId") as string)?.trim();
  if (!poId) return { success: false, message: "PO ID is required." };
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  try {
    await prisma.purchaseOrder.delete({ where: { poId } });
    return { success: true, message: "Purchase order deleted." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to delete purchase order: ${msg}` };
  }
}

// 管理者手动增购一行（Model / PurPrice / Qty 输入）：写入 PurchaseOrderItem 并重算 PO totalAmount
// productName 为必填快照字段，增购行无产品上下文，回退用 model 填充
export async function addPurchaseOrderItem(formData: FormData): Promise<{ success: boolean; message: string }> {
  const poId = (formData.get("poId") as string)?.trim();
  if (!poId) return { success: false, message: "PO ID is required." };
  const model = (formData.get("model") as string)?.trim();
  if (!model) return { success: false, message: "Model is required." };
  const purPrice = Number(formData.get("purPrice"));
  if (!Number.isFinite(purPrice) || purPrice <= 0 || purPrice > 1000000) {
    return { success: false, message: "PurPrice must be a number between 0 and 1,000,000." };
  }
  const qty = Number(formData.get("quantity"));
  if (!Number.isInteger(qty) || qty < 1 || qty > 99999) {
    return { success: false, message: "Quantity must be an integer between 1 and 99,999." };
  }
  // Condition / Leadtime 可选：留空存 null
  const condition = (formData.get("condition") as string)?.trim() || null;
  const leadTime = (formData.get("leadTime") as string)?.trim() || null;
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  try {
    await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({ where: { poId }, select: { poId: true } });
      if (!po) throw new Error("Purchase order not found.");
      await tx.purchaseOrderItem.create({
        data: {
          poId,
          productName: model,
          model,
          unitPrice: round4(purPrice),
          purPrice: round4(purPrice),
          quantity: qty,
          condition,
          leadTime,
          itemStatus: "ordered",
        },
      });
      const items = await tx.purchaseOrderItem.findMany({ where: { poId } });
      const totalAmount = round4(
        items.reduce((sum, it) => sum + Number(it.purPrice ?? it.unitPrice) * it.quantity, 0)
      );
      await tx.purchaseOrder.update({ where: { poId }, data: { totalAmount } });
    });
    return { success: true, message: "Item added." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to add item: ${msg}` };
  }
}

// 管理者删除采购单一行（减行）：删除 PurchaseOrderItem 并重算 PO totalAmount
export async function deletePurchaseOrderItem(formData: FormData): Promise<{ success: boolean; message: string }> {
  const itemId = (formData.get("itemId") as string)?.trim();
  if (!itemId) return { success: false, message: "Item ID is required." };
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.purchaseOrderItem.findUnique({ where: { itemId } });
      if (!item) throw new Error("Purchase order item not found.");
      await tx.purchaseOrderItem.delete({ where: { itemId } });
      const items = await tx.purchaseOrderItem.findMany({ where: { poId: item.poId } });
      const totalAmount = round4(
        items.reduce((sum, it) => sum + Number(it.purPrice ?? it.unitPrice) * it.quantity, 0)
      );
      await tx.purchaseOrder.update({ where: { poId: item.poId }, data: { totalAmount } });
    });
    return { success: true, message: "Item deleted." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to delete item: ${msg}` };
  }
}
