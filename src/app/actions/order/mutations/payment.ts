"use server";

// Order payment server actions: updateOrderShippingAndPay (checkout) and payOrder.

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import type { OrderActionResult, OrderWithItems, CreateOrderData } from "../shared";
import { toNumber } from "../shared";
import { validateOrderData } from "./shared";

/**
 * Checkout 页支付：更新收货信息 + 运费税费 + 支付状态
 */
export async function updateOrderShippingAndPay(
  orderId: string,
  data: CreateOrderData
): Promise<OrderActionResult> {
  try {
    const customerId = await getCurrentUserId();
    if (!customerId) return { success: false, message: "Please login to pay" };

    if (!/^[a-zA-Z0-9_-]+$/.test(orderId) || orderId.length > 255) {
      return { success: false, message: "Invalid order ID" };
    }

    const validation = validateOrderData(data);
    if (!validation.valid) return { success: false, message: validation.message };

    return prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({ where: { orderId } });
      if (!order || order.customerId !== customerId) {
        return { success: false, message: "Order not found or unauthorized" };
      }
      if (order.orderStatus === "cancelled") {
        return { success: false, message: "Cannot pay for a cancelled order" };
      }
      if (order.paymentStatus === "paid") {
        return { success: false, message: "Order is already paid" };
      }

      if (order.auditStatus !== "approved") {
        return { success: false, message: "Order must be approved by admin before payment" };
      }

      const subtotal = Number(order.subtotal);
      const shippingCost = toNumber(data.shippingCost);
      const taxAmount = toNumber(data.taxAmount);
      const totalAmount = Math.round((subtotal + shippingCost + taxAmount) * 100) / 100;

      const updated = await tx.salesOrder.update({
        where: { orderId },
        data: {
          shippingName: data.shippingName?.trim(),
          shippingPhone: data.shippingPhone?.trim(),
          shippingAddress: data.shippingAddress?.trim(),
          shippingCity: data.shippingCity?.trim(),
          shippingCountry: data.shippingCountry.toUpperCase(),
          shippingZip: data.shippingZip?.trim(),
          shippingCost,
          taxAmount,
          totalAmount,
          paymentMethod: data.paymentMethod || "credit_card",
          paymentStatus: "paid",
          soStatus: "paid",
          customerNote: data.notes?.trim(),
        },
        include: { items: true },
      });

      return {
        success: true,
        message: "Payment successful",
        order: updated as OrderWithItems,
      };
    }) as Promise<OrderActionResult>;
  } catch (error) {
    console.error("Update order shipping & pay error:", error);
    return { success: false, message: "An error occurred while processing payment" };
  }
}

/**
 * 模拟支付（项目无真实支付网关）：校验归属与状态后，将 paymentStatus 标记为 paid。
 * 订单发货等实时状态由 orderStatus 驱动，支付成功后订单列表/详情即时体现。
 */
export async function payOrder(orderId: string): Promise<OrderActionResult> {
  try {
    const customerId = await getCurrentUserId();
    if (!customerId) {
      return { success: false, message: "Please login to pay for your order" };
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(orderId) || orderId.length > 255) {
      return { success: false, message: "Invalid order ID" };
    }

    return prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { orderId },
      });

      if (!order || order.customerId !== customerId) {
        return { success: false, message: "Order not found or unauthorized" };
      }

      if (order.orderStatus === "cancelled") {
        return { success: false, message: "Cannot pay for a cancelled order" };
      }

      if (order.paymentStatus === "paid") {
        return { success: false, message: "Order is already paid" };
      }

      if (order.auditStatus !== "approved") {
        return { success: false, message: "Order must be approved by admin before payment" };
      }

      const updated = await tx.salesOrder.update({
        where: { orderId },
        data: {
          paymentStatus: "paid",
          soStatus: "paid",
        },
        include: { items: true },
      });

      return {
        success: true,
        message: "Payment successful",
        order: updated as OrderWithItems,
      };
    }) as Promise<OrderActionResult>;
  } catch (error) {
    console.error("Pay order error:", error);
    return { success: false, message: "An error occurred while processing payment. Please try again." };
  }
}
