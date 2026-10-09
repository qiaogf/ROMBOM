"use server";

// Full order creation (with shipping/payment + idempotency + purchase order generation) — createOrder.
// Helpers (generatePurchaseOrders, idempotencyStore) extracted to ./create-full-helpers (Phase 14).

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { generateIdempotencyKey } from "@/lib/security";
import type { OrderActionResult, OrderWithItems, CreateOrderData } from "../shared";
import { toNumber, SHIPPING_THRESHOLD, SHIPPING_COST, TAX_RATE } from "../shared";
import { validateOrderData } from "./shared";
import { generateSalesOrderNumber } from "./create-shared";
import { generatePurchaseOrders, idempotencyStore } from "./create-full-helpers";

export async function createOrder(data: CreateOrderData): Promise<OrderActionResult> {
  try {
    const customerId = await getCurrentUserId();
    if (!customerId) {
      return { success: false, message: "Please login to place an order" };
    }

    const validation = validateOrderData(data);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    const idempotencyKey = generateIdempotencyKey(
      "order",
      customerId,
      data.shippingCountry,
      data.paymentMethod || "default",
      data.notes || ""
    );
    const existingOrder = idempotencyStore.get(idempotencyKey);
    if (existingOrder) {
      const existingOrderData = await prisma.salesOrder.findUnique({
        where: { orderId: existingOrder.orderId },
        include: { items: true },
      });
      if (existingOrderData) {
        return {
          success: true,
          message: "Order already placed",
          order: existingOrderData as OrderWithItems,
        };
      }
      idempotencyStore.delete(idempotencyKey);
    }

    return prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { customerId },
      });

      if (!customer) {
        return { success: false, message: "Customer not found" };
      }

      if (!customer.isActive) {
        return { success: false, message: "Account is not active" };
      }

      const cart = await tx.cart.findFirst({
        where: { customerId },
        include: {
          items: {
            include: {
              product: true,
              supplierQuote: true,
              modelPrice: true,
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        return { success: false, message: "Cart is empty" };
      }

      if (cart.items.length > 100) {
        return { success: false, message: "Cart has too many items" };
      }

      // 逐商品校验：兼容旧 supplierQuote 路径与新 modelPrice 路径
      for (const item of cart.items) {
        const mp = item.modelPrice ?? null;
        const sq = item.supplierQuote ?? null;
        const product = item.product ?? null;

        // 必须有 productName/model/price 的来源
        const productName = mp?.productName ?? product?.productName;
        const model = mp?.model ?? product?.model;
        const price = mp ? toNumber(mp.sellPrice) : sq ? toNumber(sq.sellPrice) : 0;

        if (!productName || !model || price <= 0) {
          return { success: false, message: "Invalid item in cart" };
        }

        // 旧路径：Product 必须在售；新路径：ModelPrice 不检查 Product.status
        if (!mp && product && product.status !== "on_sale") {
          return {
            success: false,
            message: `${productName} is no longer available`,
          };
        }

        if (item.quantity <= 0) {
          return { success: false, message: "Invalid item quantity in cart" };
        }

        const stockStatus = sq?.stockStatus ?? mp?.stockStatus ?? "in_stock";
        if (stockStatus === "out_of_stock") {
          return {
            success: false,
            message: `${productName} is out of stock`,
          };
        }

        const moq = mp?.moq ?? sq?.moq ?? 1;
        if (moq > 1 && item.quantity < moq) {
          return {
            success: false,
            message: `Minimum order quantity for ${productName} is ${moq}`,
          };
        }
      }

      const subtotal = cart.items.reduce((sum, item) => {
        const mp = item.modelPrice ?? null;
        const sq = item.supplierQuote ?? null;
        const price = mp ? toNumber(mp.sellPrice) : sq ? toNumber(sq.sellPrice) : 0;
        return sum + price * item.quantity;
      }, 0);

      if (subtotal <= 0) {
        return { success: false, message: "Invalid order amount" };
      }

      const shippingCost = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
      const taxAmount = Math.round(subtotal * TAX_RATE * 100) / 100;
      const totalAmount = Math.round((subtotal + shippingCost + taxAmount) * 100) / 100;

      const orderNumber = await generateSalesOrderNumber(tx);

      const order = await tx.salesOrder.create({
        data: {
          orderNumber,
          customerId,
          totalAmount,
          orderStatus: "pending_review",
          shippingName: data.shippingName?.trim(),
          shippingPhone: data.shippingPhone?.trim(),
          shippingAddress: data.shippingAddress?.trim(),
          shippingCity: data.shippingCity?.trim(),
          shippingCountry: data.shippingCountry.toUpperCase(),
          shippingZip: data.shippingZip?.trim(),
          subtotal,
          shippingCost,
          taxAmount,
          discountAmount: 0,
          currency: "USD",
          paymentMethod: data.paymentMethod || "credit_card",
          paymentStatus: "pending",
          deliveryMethod: "standard",
          customerNote: data.notes?.trim(),
        },
      });

      await tx.salesOrderItem.createMany({
        data: cart.items.map((item) => {
          const mp = item.modelPrice ?? null;
          const sq = item.supplierQuote ?? null;
          const product = item.product ?? null;

          const productName = mp?.productName ?? product?.productName;
          const model = mp?.model ?? product?.model;
          const price = mp ? toNumber(mp.sellPrice) : sq ? toNumber(sq.sellPrice) : 0;
          const stockStatus = sq?.stockStatus ?? mp?.stockStatus ?? "in_stock";
          const leadTime = sq?.leadTime ?? mp?.leadTime ?? null;

          if (!productName || !model || price <= 0) {
            throw new Error("Invalid cart item during order creation");
          }

          const subtotalAmount = price * item.quantity;
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
            subtotal: subtotalAmount,
            stockStatus,
            leadTime,
            itemStatus: "ordered",
            weight: mp?.weight != null ? toNumber(mp.weight) : null,
            weightUnit: mp?.weightUnit ?? null,
          };
        }),
      });

      // 自动生成采购订单：按供应商最优价格拆分
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
            stockStatus: sq?.stockStatus ?? mp?.stockStatus ?? "in_stock",
            leadTime: sq?.leadTime ?? mp?.leadTime ?? null,
          };
        }),
      );

      await tx.cartItem.deleteMany({ where: { cartId: cart.cartId } });

      idempotencyStore.set(idempotencyKey, { orderId: order.orderId, createdAt: Date.now() });

      const orderWithItems = await tx.salesOrder.findUnique({
        where: { orderId: order.orderId },
        include: { items: true },
      });

      return {
        success: true,
        message: "Order placed successfully",
        order: orderWithItems as OrderWithItems,
      };
    }) as Promise<OrderActionResult>;
  } catch (error) {
    console.error("Create order error:", error);
    return { success: false, message: "An error occurred while creating order. Please try again." };
  }
}
