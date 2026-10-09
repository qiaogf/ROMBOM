"use server";

// Order lifecycle server actions: cancel / delete / hideFromCart.

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import type { OrderActionResult, OrderWithItems } from "../shared";

export async function cancelOrder(orderId: string): Promise<OrderActionResult> {
  try {
    const customerId = await getCurrentUserId();
    if (!customerId) {
      return { success: false, message: "Please login to cancel order" };
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(orderId) || orderId.length > 255) {
      return { success: false, message: "Invalid order ID" };
    }

    return prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { orderId },
        include: { items: true },
      });

      if (!order || order.customerId !== customerId) {
        return { success: false, message: "Order not found or unauthorized" };
      }

      if (order.orderStatus === "cancelled") {
        return { success: false, message: "Order is already cancelled" };
      }

      if (order.orderStatus === "purchasing" || order.orderStatus === "completed") {
        return { success: false, message: "Cannot cancel orders that are already being processed or completed" };
      }

      await tx.salesOrder.update({
        where: { orderId },
        data: { orderStatus: "cancelled" },
      });

      return {
        success: true,
        message: "Order cancelled successfully",
        order: order as OrderWithItems,
      };
    }) as Promise<OrderActionResult>;
  } catch (error) {
    console.error("Cancel order error:", error);
    return { success: false, message: "An error occurred while cancelling order" };
  }
}

/** 删除订单（级联删除订单项） */
export async function deleteOrder(orderId: string): Promise<OrderActionResult> {
  try {
    const customerId = await getCurrentUserId();
    if (!customerId) {
      return { success: false, message: "Please login to delete order" };
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

      await tx.salesOrder.delete({ where: { orderId } });

      return {
        success: true,
        message: "Order deleted successfully",
      };
    }) as Promise<OrderActionResult>;
  } catch (error) {
    console.error("Delete order error:", error);
    return { success: false, message: "An error occurred while deleting order" };
  }
}

/**
 * 从 Cart 页移除订单（仅隐藏，不删除订单本身）
 * 订单仍可在 Orders 页查看并支付
 */
export async function hideOrderFromCart(orderId: string): Promise<OrderActionResult> {
  try {
    const customerId = await getCurrentUserId();
    if (!customerId) {
      return { success: false, message: "Please login" };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(orderId) || orderId.length > 255) {
      return { success: false, message: "Invalid order ID" };
    }

    const order = await prisma.salesOrder.findUnique({ where: { orderId } });
    if (!order || order.customerId !== customerId) {
      return { success: false, message: "Order not found or unauthorized" };
    }

    await prisma.salesOrder.update({
      where: { orderId },
      data: { hiddenFromCart: true },
    });

    return { success: true, message: "Order removed from cart" };
  } catch (error) {
    console.error("Hide order from cart error:", error);
    return { success: false, message: "An error occurred" };
  }
}
