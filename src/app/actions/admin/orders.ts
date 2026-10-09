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
