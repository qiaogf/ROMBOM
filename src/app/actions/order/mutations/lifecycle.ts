"use server";

// Order lifecycle server actions: cancel / delete / hideFromCart.

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import type { OrderActionResult, OrderWithItems, CreateOrderData } from "../shared";
import { serializeDecimals } from "../shared";
import type { Prisma } from "@/../prisma/generated/client";
import { validateOrderData } from "./shared";
import {
  canSubmit,
  canWithdraw,
  resolveOrderLifecycle,
  resolveSubmittedAuditStatus,
} from "../status-machine";

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
        order: serializeDecimals(order) as OrderWithItems,
      };
    }, { maxWait: 20000, timeout: 60000 }) as Promise<OrderActionResult>;
  } catch (error) {
    console.error("Cancel order error:", error);
    return { success: false, message: "An error occurred while cancelling order" };
  }
}

/**
 * 提交订单后：把结算页填写的收货信息写进订单，并回写到客户档案
 * （Admin Panel → Customer 的账户记录随即同步）
 */
async function saveShippingProfile(
  tx: Prisma.TransactionClient,
  orderId: string,
  customerId: string,
  data: CreateOrderData
): Promise<{ valid: boolean; message: string }> {
  const validation = validateOrderData(data);
  if (!validation.valid) return validation;

  const profile = {
    country: data.shippingCountry.toUpperCase(),
    city: data.shippingCity?.trim() || undefined,
    address: data.shippingAddress?.trim() || undefined,
    zip: data.shippingZip?.trim() || undefined,
    phone: data.shippingPhone?.trim() || undefined,
    contactName: data.shippingName?.trim() || undefined,
  };

  await tx.salesOrder.update({
    where: { orderId },
    data: {
      shippingName: profile.contactName,
      shippingPhone: profile.phone,
      shippingCountry: profile.country,
      shippingCity: profile.city,
      shippingAddress: profile.address,
      shippingZip: profile.zip,
      customerNote: data.notes?.trim() || undefined,
    },
  });
  await tx.customer.update({ where: { customerId }, data: profile });

  return validation;
}

/**
 * 客户提交订单（Order Summary 的 Submit 按钮）
 * - 全部型号可自助下单（requiresManualConfirm 全为 false）→ 自动交易：auditStatus=approved
 * - 否则 → 人工确认：auditStatus=pending，待管理员在后台 Approve
 * 提交后订单出现在 My Orders 页（submittedAt 非空）
 */
export async function submitOrder(
  orderId: string,
  data?: CreateOrderData
): Promise<OrderActionResult & { autoApproved?: boolean }> {
  try {
    const customerId = await getCurrentUserId();
    if (!customerId) {
      return { success: false, message: "Please login" };
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
        return { success: false, message: "Cannot submit a cancelled order" };
      }
      // 已提交过：仅 Rejected 允许修改后重新提交（审核从零开始）；其余状态直接返回当前状态
      if (!canSubmit(order)) {
        return {
          success: true,
          autoApproved: order.auditStatus === "approved",
          message:
            order.auditStatus === "approved"
              ? "Order already approved. You can proceed to pay."
              : "Order already submitted. Pending admin confirmation.",
        };
      }

      const nextAuditStatus = resolveSubmittedAuditStatus(order.items);

      // 先把收货信息落库（订单 + 客户档案），再置提交状态
      if (data) {
        const saved = await saveShippingProfile(tx, orderId, customerId, data);
        if (!saved.valid) {
          return { success: false, message: saved.message };
        }
      }

      const isResubmit = order.auditStatus === "rejected";

      await tx.salesOrder.update({
        where: { orderId },
        data: {
          submittedAt: new Date(),
          auditStatus: nextAuditStatus,
          // 重新提交：清空上一轮的取消申请，重新进入审核流程
          cancelRequestedAt: null,
        },
      });

      return {
        success: true,
        autoApproved: nextAuditStatus === "approved",
        message:
          nextAuditStatus === "approved"
            ? "Order submitted and approved. You can proceed to pay."
            : isResubmit
              ? "Order resubmitted. Pending admin confirmation again."
              : "Order submitted. Please contact the administrator to confirm.",
      };
    }, { maxWait: 20000, timeout: 60000 });
  } catch (error) {
    console.error("Submit order error:", error);
    return { success: false, message: "An error occurred while submitting the order" };
  }
}

/**
 * 撤回订单 → 型号回到购物车（库存回滚 + 订单项写回 CartItem + 订单删除）
 * 适用场景：Checkout 页客户在支付前反悔，回到购物车继续选购。
 */
export async function withdrawOrderToCart(orderId: string): Promise<OrderActionResult> {
  try {
    const customerId = await getCurrentUserId();
    if (!customerId) {
      return { success: false, message: "Please login" };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(orderId) || orderId.length > 255) {
      return { success: false, message: "Invalid order ID" };
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { orderId },
        include: { items: true },
      });
      if (!order || order.customerId !== customerId) {
        return { success: false, message: "Order not found or unauthorized" };
      }
      // 仅 Draft（未提交）与 Pending（已提交待审核）允许撤回
      if (!canWithdraw(order)) {
        return {
          success: false,
          message: "Only draft or pending orders can be withdrawn. Use Cancel Request once approved.",
        };
      }

      // 1) 释放 ModelPrice 预留库存
      if (order.stockLocked) {
        const uniqMpIds = [...new Set(order.items.flatMap((it) => it.modelPriceId ? [it.modelPriceId] : []))];
        for (const mpId of uniqMpIds) {
          const totalQty = order.items
            .filter((it) => it.modelPriceId === mpId)
            .reduce((s, it) => s + it.quantity, 0);
          await tx.modelPrice.update({
            where: { modelPriceId: mpId },
            data: { reservedQuantity: { decrement: totalQty } },
          });
        }
      }

      // 2) 确保有 Cart 容器
      let cart = await tx.cart.findFirst({ where: { customerId } });
      if (!cart) {
        cart = await tx.cart.create({ data: { customerId } });
      }

      // 3) 写回 CartItem（同型号合并数量）
      for (const item of order.items) {
        if (item.modelPriceId) {
          await tx.cartItem.upsert({
            where: { cartId_modelPriceId: { cartId: cart.cartId, modelPriceId: item.modelPriceId } },
            update: { quantity: { increment: item.quantity } },
            create: { cartId: cart.cartId, modelPriceId: item.modelPriceId, quantity: item.quantity },
          });
        } else if (item.quoteId && item.productId) {
          await tx.cartItem.upsert({
            where: { cartId_quoteId: { cartId: cart.cartId, quoteId: item.quoteId } },
            update: { quantity: { increment: item.quantity } },
            create: {
              cartId: cart.cartId,
              quoteId: item.quoteId,
              productId: item.productId,
              quantity: item.quantity,
            },
          });
        }
      }

      // 4) 删除订单（级联删除订单项）
      await tx.salesOrder.delete({ where: { orderId } });

      return { success: true, message: "Order withdrawn. Items returned to cart." };
    }, { maxWait: 20000, timeout: 60000 }) as OrderActionResult;

    return result;
  } catch (error) {
    console.error("Withdraw order error:", error);
    return { success: false, message: "An error occurred while withdrawing the order" };
  }
}

/**
 * 客户对 Approved 订单提交「取消申请」（并非直接取消）
 * 订单在客户端与管理端均保留；须管理员在 Audit 中点击 Cancel 后才变为 Cancelled。
 */
export async function requestOrderCancel(orderId: string): Promise<OrderActionResult> {
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
    if (order.orderStatus === "cancelled") {
      return { success: false, message: "This order is already cancelled." };
    }
    if (resolveOrderLifecycle(order) !== "approved") {
      return { success: false, message: "Cancel Request is only available for approved orders." };
    }
    if (order.cancelRequestedAt) {
      return {
        success: true,
        message: "Cancellation request already submitted. Waiting for the administrator to approve it.",
      };
    }

    await prisma.salesOrder.update({
      where: { orderId },
      data: { cancelRequestedAt: new Date() },
    });

    return {
      success: true,
      message: "Cancellation request submitted. The order stays active until the administrator approves it.",
    };
  } catch (error) {
    console.error("Request order cancel error:", error);
    return { success: false, message: "An error occurred while submitting the cancellation request" };
  }
}

/**
 * 客户确认收货（Confirm Receipt）
 * 仅记录确认时间 deliveredAt —— 后台据此看到客户已确认；
 * 订单状态（Status → Received）由管理员在后台手工修改，不在前端自行置位。
 */
export async function confirmReceipt(orderId: string): Promise<OrderActionResult> {
  try {
    const customerId = await getCurrentUserId();
    if (!customerId) {
      return { success: false, message: "Please login to confirm receipt" };
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
        return { success: false, message: "Cannot confirm receipt for a cancelled order" };
      }
      if (order.deliveredAt) {
        return {
          success: false,
          message: "Receipt already confirmed. Awaiting admin status update.",
          order: serializeDecimals(order) as OrderWithItems,
        };
      }

      const updated = await tx.salesOrder.update({
        where: { orderId },
        data: { deliveredAt: new Date() },
        include: { items: true },
      });

      return {
        success: true,
        message: "Receipt confirmed. Admin will update the status to Received.",
        order: serializeDecimals(updated) as OrderWithItems,
      };
    }, { maxWait: 20000, timeout: 60000 }) as Promise<OrderActionResult>;
  } catch (error) {
    console.error("Confirm receipt error:", error);
    return { success: false, message: "An error occurred while confirming receipt" };
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
