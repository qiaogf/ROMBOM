"use server";

// Order payment server actions: updateOrderShippingAndPay (checkout) and payOrder.

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import type { OrderActionResult, OrderWithItems, CreateOrderData } from "../shared";
import { toNumber, serializeDecimals } from "../shared";
import { validateOrderData } from "./shared";

/**
 * Checkout 页支付：更新收货信息 + 运费税费 + 按组件部分支付标记
 * - paySubtotal / payShipping / payTax 均 undefined 时视为全付（向后兼容）
 * - 已付组件不再重复标记；shippingCost / taxAmount 仅在首次支付对应组件时写入
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
      if (order.auditStatus !== "approved") {
        return { success: false, message: "Order must be approved by admin before payment" };
      }

      // 解析本次要付的组件 — 三者全 undefined 视为全付（向后兼容）
      const allUndefined =
        data.paySubtotal === undefined &&
        data.payShipping === undefined &&
        data.payTax === undefined;
      const paySubtotal = allUndefined ? true : !!data.paySubtotal;
      const payShipping = allUndefined ? true : !!data.payShipping;
      const payTax = allUndefined ? true : !!data.payTax;

      const shippingCost = toNumber(data.shippingCost);
      const taxAmount = toNumber(data.taxAmount);

      // 合并已付 + 本次标记
      const subtotalPaid = order.subtotalPaid || paySubtotal;
      const shippingPaid = order.shippingPaid || payShipping;
      const taxPaid = order.taxPaid || payTax;

      // 全部组件已付 → 标记订单级 paid
      const allPaid = subtotalPaid && shippingPaid && taxPaid;

      const subtotal = Number(order.subtotal);
      // 如果首次写入运费/税费，更新订单上的数值；否则保留原有值
      const finalShipping = shippingPaid ? shippingCost : Number(order.shippingCost ?? 0);
      const finalTax = taxPaid ? taxAmount : Number(order.taxAmount ?? 0);
      const totalAmount = Math.round((subtotal + finalShipping + finalTax) * 100) / 100;

      const updated = await tx.salesOrder.update({
        where: { orderId },
        data: {
          shippingName: data.shippingName?.trim(),
          shippingPhone: data.shippingPhone?.trim(),
          shippingAddress: data.shippingAddress?.trim(),
          shippingCity: data.shippingCity?.trim(),
          shippingCountry: data.shippingCountry.toUpperCase(),
          shippingZip: data.shippingZip?.trim(),
          shippingCost: finalShipping,
          taxAmount: finalTax,
          totalAmount,
          paymentMethod: data.paymentMethod || order.paymentMethod || "credit_card",
          customerNote: data.notes?.trim(),
          subtotalPaid,
          shippingPaid,
          taxPaid,
          paymentStatus: allPaid ? "paid" : "partial",
        },
        include: { items: true },
      });

      return {
        success: true,
        message: allPaid
          ? "Payment successful — full order paid"
          : `Partial payment saved. ${[
              subtotalPaid ? "Subtotal ✓" : "Subtotal pending",
              shippingPaid ? "Shipping ✓" : "Shipping pending",
              taxPaid ? "Tax ✓" : "Tax pending",
            ].join(" · ")}`,
        order: serializeDecimals(updated) as OrderWithItems,
      };
    }, { maxWait: 20000, timeout: 60000 }) as Promise<OrderActionResult>;
  } catch (error) {
    console.error("Update order shipping & pay error:", error);
    return { success: false, message: "An error occurred while processing payment" };
  }
}

/**
 * 逐项切换支付状态（Checkout 页两个 Pay 按钮）
 * - nextPaid=true：标记该项已付；两项都付清后订单级状态转为 paid
 * - nextPaid=false：撤销误点，订单级状态回退为 ordered
 * Tax 行已移除：任一项已付即视为 Tax 一并结清；两项都撤销则 Tax 一并撤销。
 */
export async function toggleOrderComponentPaid(
  orderId: string,
  component: "subtotal" | "shipping",
  nextPaid: boolean
): Promise<OrderActionResult> {
  try {
    const customerId = await getCurrentUserId();
    if (!customerId) return { success: false, message: "Please login to pay" };

    if (!/^[a-zA-Z0-9_-]+$/.test(orderId) || orderId.length > 255) {
      return { success: false, message: "Invalid order ID" };
    }
    if (component !== "subtotal" && component !== "shipping") {
      return { success: false, message: "Invalid payment component" };
    }

    return prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({ where: { orderId } });
      if (!order || order.customerId !== customerId) {
        return { success: false, message: "Order not found or unauthorized" };
      }
      if (order.orderStatus === "cancelled") {
        return { success: false, message: "Cannot pay for a cancelled order" };
      }

      const subtotalPaid = component === "subtotal" ? nextPaid : order.subtotalPaid;
      const shippingPaid = component === "shipping" ? nextPaid : order.shippingPaid;
      const taxPaid = subtotalPaid || shippingPaid;
      const allPaid = subtotalPaid && shippingPaid && taxPaid;

      // soStatus（Ordered/Paid/Received）由管理员在后台设置，前端支付只切换颜色状态
      const updated = await tx.salesOrder.update({
        where: { orderId },
        data: {
          subtotalPaid,
          shippingPaid,
          taxPaid,
          paymentStatus: allPaid ? "paid" : subtotalPaid || shippingPaid ? "partial" : "pending",
        },
        include: { items: true },
      });

      return {
        success: true,
        message: allPaid
          ? "Payment successful — full order paid"
          : subtotalPaid || shippingPaid
            ? "Partial payment saved"
            : "Payment unmarked",
        order: serializeDecimals(updated) as OrderWithItems,
      };
    }, { maxWait: 20000, timeout: 60000 }) as Promise<OrderActionResult>;
  } catch (error) {
    console.error("Toggle order component paid error:", error);
    return { success: false, message: "An error occurred while updating payment" };
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

      if (order.auditStatus !== "approved") {
        return { success: false, message: "Order must be approved by admin before payment" };
      }

      const updated = await tx.salesOrder.update({
        where: { orderId },
        data: {
          paymentStatus: "paid",
          soStatus: "paid",
          subtotalPaid: true,
          shippingPaid: true,
          taxPaid: true,
        },
        include: { items: true },
      });

      return {
        success: true,
        message: "Payment successful",
        order: serializeDecimals(updated) as OrderWithItems,
      };
    }, { maxWait: 20000, timeout: 60000 }) as Promise<OrderActionResult>;
  } catch (error) {
    console.error("Pay order error:", error);
    return { success: false, message: "An error occurred while processing payment. Please try again." };
  }
}
