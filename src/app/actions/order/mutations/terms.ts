"use server";

// 客户侧商务条款（Payment Terms / Payment Method / Delivery Terms）保存。
// 管理员一旦锁定（*SetByAdmin = true），客户端不可再修改，服务端同样拒绝写入。

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { isValidOrderTerm, type OrderTermField } from "@/lib/order-terms";
import type { OrderActionResult } from "../shared";

export async function updateOrderTerm(
  orderId: string,
  field: OrderTermField,
  value: string | null
): Promise<OrderActionResult> {
  const customerId = await getCurrentUserId();
  if (!customerId) return { success: false, message: "Please login to update order terms" };

  if (!/^[a-zA-Z0-9_-]+$/.test(orderId) || orderId.length > 255) {
    return { success: false, message: "Invalid order ID" };
  }

  const fields: OrderTermField[] = ["paymentTerms", "paymentMethod", "deliveryTerms"];
  if (!fields.includes(field)) {
    return { success: false, message: "Invalid term field" };
  }

  if (value !== null && !isValidOrderTerm(field, value)) {
    return { success: false, message: "Invalid option" };
  }

  try {
    const order = await prisma.salesOrder.findUnique({
      where: { orderId },
      select: {
        customerId: true,
        orderStatus: true,
        paymentTermsSetByAdmin: true,
        paymentMethodSetByAdmin: true,
        deliveryTermsSetByAdmin: true,
      },
    });

    if (!order || order.customerId !== customerId) {
      return { success: false, message: "Order not found or unauthorized" };
    }
    if (order.orderStatus === "cancelled") {
      return { success: false, message: "Cannot change a cancelled order" };
    }

    const locked =
      (field === "paymentTerms" && order.paymentTermsSetByAdmin) ||
      (field === "paymentMethod" && order.paymentMethodSetByAdmin) ||
      (field === "deliveryTerms" && order.deliveryTermsSetByAdmin);

    if (locked) {
      return { success: false, message: "This term has been confirmed by the seller and can no longer be changed" };
    }

    await prisma.salesOrder.update({
      where: { orderId },
      data: { [field]: value },
    });

    return { success: true, message: "Saved" };
  } catch (error) {
    console.error("Update order term error:", error);
    return { success: false, message: "An error occurred while saving" };
  }
}
