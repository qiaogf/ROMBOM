"use server";

import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth-admin";

// ============ 订单审核 ============

// 销售订单审核
export async function approveSalesOrder(formData: FormData): Promise<{ success: boolean; message: string }> {
  const orderId = (formData.get("orderId") as string)?.trim();
  if (!orderId) return { success: false, message: "Order ID is required." };
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  try {
    await prisma.salesOrder.update({ where: { orderId }, data: { auditStatus: "approved" } });
    return { success: true, message: "Sales order approved." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to approve: ${msg}` };
  }
}

export async function rejectSalesOrder(formData: FormData): Promise<{ success: boolean; message: string }> {
  const orderId = (formData.get("orderId") as string)?.trim();
  if (!orderId) return { success: false, message: "Order ID is required." };
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  try {
    await prisma.salesOrder.update({ where: { orderId }, data: { auditStatus: "rejected" } });
    return { success: true, message: "Sales order rejected." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to reject: ${msg}` };
  }
}

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

export async function rejectPurchaseOrder(formData: FormData): Promise<{ success: boolean; message: string }> {
  const poId = (formData.get("poId") as string)?.trim();
  if (!poId) return { success: false, message: "PO ID is required." };
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  try {
    await prisma.purchaseOrder.update({ where: { poId }, data: { auditStatus: "rejected" } });
    return { success: true, message: "Purchase order rejected." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to reject: ${msg}` };
  }
}

// 删除销售订单（SalesOrderItem 由 onDelete: Cascade 自动清理）
export async function deleteSalesOrder(formData: FormData): Promise<{ success: boolean; message: string }> {
  const orderId = (formData.get("orderId") as string)?.trim();
  if (!orderId) return { success: false, message: "Order ID is required." };
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  try {
    await prisma.salesOrder.delete({ where: { orderId } });
    return { success: true, message: "Sales order deleted." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to delete sales order: ${msg}` };
  }
}

// ============ 订单明细改价（2026-10-20）============

const round4 = (n: number) => Math.round(n * 10000) / 10000;

// 管理者改销售订单明细的实际销售价（ListPrice 输入框，初始=下单时 ListPrice 快照 unitPrice）
// 同步重算 item.subtotal 与订单 subtotal/totalAmount
export async function updateSalesOrderItemPrice(formData: FormData): Promise<{ success: boolean; message: string }> {
  const itemId = (formData.get("itemId") as string)?.trim();
  if (!itemId) return { success: false, message: "Item ID is required." };
  const price = Number(formData.get("price"));
  if (!Number.isFinite(price) || price <= 0 || price > 1000000) {
    return { success: false, message: "Price must be a number between 0 and 1,000,000." };
  }
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.salesOrderItem.findUnique({ where: { itemId } });
      if (!item) throw new Error("Order item not found.");
      const newSubtotal = round4(price * item.quantity);
      await tx.salesOrderItem.update({
        where: { itemId },
        data: { finalSellPrice: round4(price), subtotal: newSubtotal },
      });
      const order = await tx.salesOrder.findUnique({
        where: { orderId: item.orderId },
        include: { items: true },
      });
      if (!order) throw new Error("Sales order not found.");
      const subtotal = round4(
        order.items.reduce((sum, it) => sum + Number(it.finalSellPrice) * it.quantity, 0)
      );
      await tx.salesOrder.update({
        where: { orderId: order.orderId },
        data: {
          subtotal,
          totalAmount: round4(subtotal + Number(order.shippingCost) + Number(order.taxAmount) - Number(order.discountAmount)),
        },
      });
    });
    return { success: true, message: "Item price updated." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to update item price: ${msg}` };
  }
}

// 管理者改销售订单明细数量（Qty 输入框，初始=下单数量）
// 同步重算 item.subtotal 与订单 subtotal/totalAmount
export async function updateSalesOrderItemQty(formData: FormData): Promise<{ success: boolean; message: string }> {
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
      const item = await tx.salesOrderItem.findUnique({ where: { itemId } });
      if (!item) throw new Error("Order item not found.");
      const newSubtotal = round4(Number(item.finalSellPrice ?? item.unitPrice) * qty);
      await tx.salesOrderItem.update({
        where: { itemId },
        data: { quantity: qty, subtotal: newSubtotal },
      });
      const order = await tx.salesOrder.findUnique({
        where: { orderId: item.orderId },
        include: { items: true },
      });
      if (!order) throw new Error("Sales order not found.");
      const subtotal = round4(
        order.items.reduce((sum, it) => sum + Number(it.finalSellPrice ?? it.unitPrice) * it.quantity, 0)
      );
      await tx.salesOrder.update({
        where: { orderId: order.orderId },
        data: {
          subtotal,
          totalAmount: round4(subtotal + Number(order.shippingCost) + Number(order.taxAmount) - Number(order.discountAmount)),
        },
      });
    });
    return { success: true, message: "Quantity updated." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to update quantity: ${msg}` };
  }
}

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
