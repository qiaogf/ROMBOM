"use server";

import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth-admin";

// ============ Logistics-Capital 资金台账 ============

const CAPITAL_STATUSES = ["ordered", "paid", "shipped", "received"] as const;
type CapitalStatus = (typeof CAPITAL_STATUSES)[number];

function isCapitalStatus(v: string): v is CapitalStatus {
  return (CAPITAL_STATUSES as readonly string[]).includes(v);
}

// 更新销售订单收款信息：收款方式 + 订单状态
export async function updateSalesCapital(formData: FormData): Promise<{ success: boolean; message: string }> {
  const orderId = (formData.get("orderId") as string)?.trim();
  if (!orderId) return { success: false, message: "Order ID is required." };
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  const paymentMethod = (formData.get("paymentMethod") as string)?.trim() ?? "";
  const status = (formData.get("status") as string)?.trim() ?? "ordered";
  if (!isCapitalStatus(status)) return { success: false, message: "Invalid status." };
  try {
    await prisma.salesOrder.update({
      where: { orderId },
      data: { paymentMethod: paymentMethod || null, soStatus: status },
    });
    return { success: true, message: "Sales capital updated." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to update: ${msg}` };
  }
}

// 更新采购订单付款信息：付款方式 + 订单状态
export async function updatePurchaseCapital(formData: FormData): Promise<{ success: boolean; message: string }> {
  const poId = (formData.get("poId") as string)?.trim();
  if (!poId) return { success: false, message: "PO ID is required." };
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  const paymentMethod = (formData.get("paymentMethod") as string)?.trim() ?? "";
  const status = (formData.get("status") as string)?.trim() ?? "ordered";
  if (!isCapitalStatus(status)) return { success: false, message: "Invalid status." };
  try {
    await prisma.purchaseOrder.update({
      where: { poId },
      data: { paymentMethod: paymentMethod || null, poStatus: status },
    });
    return { success: true, message: "Purchase capital updated." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to update: ${msg}` };
  }
}
