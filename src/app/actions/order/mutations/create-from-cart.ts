"use server";

// Order creation from cart (no shipping/payment) — createOrderFromCart.

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import type { OrderActionResult, OrderWithItems } from "../shared";
import { toNumber } from "../shared";
import { generateSalesOrderNumber } from "./create-shared";
import { isPurchasableLeadtime } from "@/lib/cart-display";
import { generatePurchaseOrders } from "./create-full-helpers";

/**
 * 从购物车直接创建订单（状态 ordered / 已提交）
 * - 不涉及收货信息与支付，由 checkout 页后续补全
 * - 创建后清空购物车
 * - 同时自动生成采购订单（按供应商最优价格拆分）
 */
export async function createOrderFromCart(): Promise<OrderActionResult> {
  try {
    const customerId = await getCurrentUserId();
    if (!customerId) {
      return { success: false, message: "Please login to place an order" };
    }

    return prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { customerId } });
      if (!customer) return { success: false, message: "Customer not found" };
      if (!customer.isActive) return { success: false, message: "Account is not active" };

      const cart = await tx.cart.findFirst({
        where: { customerId },
        include: {
          items: { include: { product: true, supplierQuote: true, modelPrice: true } },
        },
      });

      if (!cart || cart.items.length === 0) {
        return { success: false, message: "Cart is empty" };
      }
      if (cart.items.length > 100) {
        return { success: false, message: "Cart has too many items" };
      }

      // 逐商品校验 + 计算小计（双路径兼容）
      let subtotal = 0;
      for (const item of cart.items) {
        const mp = item.modelPrice ?? null;
        const sq = item.supplierQuote ?? null;
        const product = item.product ?? null;

        const productName = mp?.productName ?? product?.productName;
        const model = mp?.model ?? product?.model;
        const price = mp ? toNumber(mp.sellPrice) : sq ? toNumber(sq.sellPrice) : 0;

        if (!productName || !model || price <= 0) {
          return { success: false, message: "Invalid item in cart" };
        }
        if (!mp && product && product.status !== "on_sale") {
          return { success: false, message: `${productName} is no longer available` };
        }
        if (item.quantity <= 0) {
          return { success: false, message: "Invalid item quantity in cart" };
        }
        if (!isPurchasableLeadtime(sq?.leadTime ?? mp?.leadTime ?? null)) {
          return { success: false, message: `${productName} is out of stock` };
        }
        const moq = mp?.moq ?? sq?.moq ?? 1;
        if (moq > 1 && item.quantity < moq) {
          return { success: false, message: `Minimum order quantity for ${productName} is ${moq}` };
        }
        subtotal += price * item.quantity;
      }

      if (subtotal <= 0) return { success: false, message: "Invalid order amount" };

      const orderNumber = await generateSalesOrderNumber(tx);
      const order = await tx.salesOrder.create({
        data: {
          orderNumber,
          customerId,
          subtotal,
          shippingCost: 0,
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: subtotal,
          currency: "USD",
          paymentStatus: "pending",
          orderStatus: "pending_review",
          soStatus: "ordered",
          deliveryMethod: "standard",
        },
      });

      await tx.salesOrderItem.createMany({
        data: cart.items.map((item) => {
          const mp = item.modelPrice ?? null;
          const sq = item.supplierQuote ?? null;
          const product = item.product ?? null;
          const productName = mp?.productName ?? product?.productName!;
          const model = mp?.model ?? product?.model!;
          const price = mp ? toNumber(mp.sellPrice) : sq ? toNumber(sq.sellPrice) : 0;
          const leadTime = sq?.leadTime ?? mp?.leadTime ?? null;
          return {
            orderId: order.orderId,
            quoteId: item.quoteId,
            productId: item.productId,
            modelPriceId: item.modelPriceId,
            productName,
            model,
            unitPrice: price,
            finalSellPrice: price,
            quantity: item.quantity,
            subtotal: price * item.quantity,
            leadTime,
            itemStatus: "ordered",
            weight: mp?.weight != null ? toNumber(mp.weight) : null,
            weightUnit: mp?.weightUnit ?? null,
          };
        }),
      });

      // 自动生成采购订单：双报价源比价（管理员价格表优先 + 5工作日供应商报价），草稿状态
      await generatePurchaseOrders(
        tx,
        { orderId: order.orderId, orderNumber: order.orderNumber },
        cart.items.map((item) => {
          const mp = item.modelPrice ?? null;
          const sq = item.supplierQuote ?? null;
          const product = item.product ?? null;
          return {
            productName: mp?.productName ?? product?.productName ?? "",
            model: mp?.model ?? product?.model ?? null,
            quantity: item.quantity,
            productId: item.productId,
            leadTime: sq?.leadTime ?? mp?.leadTime ?? null,
          };
        }),
      );

      // 清空购物车
      await tx.cartItem.deleteMany({ where: { cartId: cart.cartId } });

      return {
        success: true,
        message: "Order created",
        order: { ...order, items: [] } as OrderWithItems,
      };
    }, { timeout: 30000, maxWait: 10000 }) as Promise<OrderActionResult>;
  } catch (error) {
    console.error("Create order from cart error:", error);
    return { success: false, message: "An error occurred while creating order" };
  }
}
