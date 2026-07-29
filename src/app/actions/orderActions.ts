"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { decimalToNumber } from "@/lib/price";
import type { Order, OrderItem } from "@/../prisma/generated/client";

export interface OrderActionResult {
  success: boolean;
  message: string;
  order?: OrderWithItems;
}

export type OrderWithItems = Order & { items: OrderItem[] };

export interface CreateOrderData {
  shippingCountry: string;
  shippingCity: string;
  shippingAddress: string;
  shippingZip: string;
  shippingName: string;
  shippingPhone?: string;
  paymentMethod?: string;
  notes?: string;
}

const RATE_LIMIT_WINDOW_MS = 1000;
const MAX_ORDER_OPERATIONS = 3;
const orderRateLimit = new Map<string, number[]>();

const idempotencyStore = new Map<string, { orderId: string; createdAt: number }>();
const IDEMPOTENCY_WINDOW_MS = 30000;

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of orderRateLimit.entries()) {
    const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) {
      orderRateLimit.delete(key);
    } else {
      orderRateLimit.set(key, valid);
    }
  }
  for (const [key, value] of idempotencyStore.entries()) {
    if (now - value.createdAt > IDEMPOTENCY_WINDOW_MS) {
      idempotencyStore.delete(key);
    }
  }
}, 30000);

function validateShippingData(data: CreateOrderData): { valid: boolean; message: string } {
  const { shippingCountry, shippingCity, shippingAddress, shippingZip, shippingName } = data;

  if (!shippingCountry || !shippingCountry.trim()) {
    return { valid: false, message: "Shipping country is required" };
  }
  if (!/^[A-Z]{2}$/.test(shippingCountry.trim().toUpperCase())) {
    return { valid: false, message: "Invalid country code" };
  }
  if (!shippingCity || !shippingCity.trim()) {
    return { valid: false, message: "Shipping city is required" };
  }
  if (shippingCity.length > 100) {
    return { valid: false, message: "City name is too long" };
  }
  if (!shippingAddress || !shippingAddress.trim()) {
    return { valid: false, message: "Shipping address is required" };
  }
  if (shippingAddress.length > 200) {
    return { valid: false, message: "Address is too long" };
  }
  if (!shippingZip || !shippingZip.trim()) {
    return { valid: false, message: "ZIP/Postal code is required" };
  }
  if (shippingZip.length > 20) {
    return { valid: false, message: "ZIP/Postal code is too long" };
  }
  if (!shippingName || !shippingName.trim()) {
    return { valid: false, message: "Recipient name is required" };
  }
  if (shippingName.length > 100) {
    return { valid: false, message: "Name is too long" };
  }
  if (data.shippingPhone && data.shippingPhone.length > 30) {
    return { valid: false, message: "Phone number is too long" };
  }
  if (data.notes && data.notes.length > 500) {
    return { valid: false, message: "Order notes are too long" };
  }

  return { valid: true, message: "" };
}

function checkOrderRateLimit(userId: string, operation: string): { allowed: boolean; message: string } {
  const key = `${userId}:${operation}`;
  const now = Date.now();
  const timestamps = orderRateLimit.get(key) || [];
  const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (valid.length >= MAX_ORDER_OPERATIONS) {
    orderRateLimit.set(key, valid);
    return { allowed: false, message: "Too many order operations. Please wait a moment." };
  }

  valid.push(now);
  orderRateLimit.set(key, valid);
  return { allowed: true, message: "" };
}

function generateIdempotencyKey(userId: string, data: CreateOrderData): string {
  const content = `${userId}:${data.shippingCountry}:${data.shippingCity}:${data.shippingAddress}:${data.shippingZip}:${data.shippingName}:${data.paymentMethod || "default"}`;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `order:${userId}:${Math.abs(hash).toString(36)}`;
}

export async function createOrder(data: CreateOrderData): Promise<OrderActionResult> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, message: "Please login to place an order" };
    }

    const shippingValidation = validateShippingData(data);
    if (!shippingValidation.valid) {
      return { success: false, message: shippingValidation.message };
    }

    const rateLimit = checkOrderRateLimit(userId, "createOrder");
    if (!rateLimit.allowed) {
      return { success: false, message: rateLimit.message };
    }

    const idempotencyKey = generateIdempotencyKey(userId, data);
    const existingOrder = idempotencyStore.get(idempotencyKey);
    if (existingOrder) {
      const existingOrderData = await prisma.order.findUnique({
        where: { id: existingOrder.orderId },
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
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return { success: false, message: "User not found" };
      }

      if (!user.isActive) {
        return { success: false, message: "Account is not active" };
      }

      const cart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: true,
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

      for (const item of cart.items) {
        if (!item.product.isActive) {
          return {
            success: false,
            message: `${item.product.nameEn || item.product.name} is no longer available`,
          };
        }

        if (item.quantity <= 0) {
          return {
            success: false,
            message: "Invalid item quantity in cart",
          };
        }

        if (decimalToNumber(item.unitPrice) <= 0) {
          return {
            success: false,
            message: `Invalid price for ${item.product.nameEn || item.product.name}`,
          };
        }

        const updateResult = await tx.product.updateMany({
          where: {
            id: item.productId,
            stock: { gte: item.quantity },
            isActive: true,
          },
          data: {
            stock: { decrement: item.quantity },
            salesCount: { increment: item.quantity },
          },
        });

        if (updateResult.count === 0) {
          const currentProduct = await tx.product.findUnique({
            where: { id: item.productId },
          });
          const displayName = currentProduct?.nameEn || currentProduct?.name || "Product";
          const availableStock = currentProduct?.stock || 0;

          return {
            success: false,
            message: `${displayName} is out of stock or insufficient quantity. Only ${availableStock} items available.`,
          };
        }
      }

      const subtotal = cart.items.reduce((sum, item) => {
        return sum + decimalToNumber(item.unitPrice) * item.quantity;
      }, 0);

      if (subtotal <= 0) {
        return { success: false, message: "Invalid order amount" };
      }

      const shippingCost = subtotal >= 100 ? 0 : 10;
      const taxRate = 0.08;
      const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
      const totalAmount = Math.round((subtotal + shippingCost + taxAmount) * 100) / 100;

      if (totalAmount <= 0 || totalAmount > 999999.99) {
        return { success: false, message: "Invalid order amount" };
      }

      const orderNumber = generateOrderNumber();

      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: "PENDING",
          totalAmount: totalAmount.toString(),
          subtotal: subtotal.toString(),
          shippingCost: shippingCost.toString(),
          taxAmount: taxAmount.toString(),
          currency: cart.currency || user.currency || "USD",
          shippingCountry: data.shippingCountry.toUpperCase(),
          shippingCity: data.shippingCity.trim(),
          shippingAddress: data.shippingAddress.trim(),
          shippingZip: data.shippingZip.trim(),
          shippingName: data.shippingName.trim(),
          shippingPhone: data.shippingPhone?.trim(),
          paymentMethod: data.paymentMethod || "credit_card",
          notes: data.notes?.trim(),
          paymentStatus: "PENDING",
        },
      });

      await tx.orderItem.createMany({
        data: cart.items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          sku: item.product.sku,
          name: item.product.name,
          nameEn: item.product.nameEn,
          description: item.product.description,
          descriptionEn: item.product.descriptionEn,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          currency: item.currency || cart.currency || "USD",
          subtotal: (decimalToNumber(item.unitPrice) * item.quantity).toString(),
          weight: item.product.weight,
          weightUnit: item.product.weightUnit,
        })),
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { totalAmount: "0" } });

      idempotencyStore.set(idempotencyKey, { orderId: order.id, createdAt: Date.now() });

      const orderWithItems = await tx.order.findUnique({
        where: { id: order.id },
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

export async function getOrders(userId?: string): Promise<OrderWithItems[]> {
  try {
    const currentUserId = userId || (await getCurrentUserId());
    if (!currentUserId) return [];

    const orders = await prisma.order.findMany({
      where: { userId: currentUserId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    return orders as OrderWithItems[];
  } catch (error) {
    console.error("Get orders error:", error);
    return [];
  }
}

export async function getOrderById(orderId: string): Promise<OrderWithItems | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    if (!/^[a-zA-Z0-9_-]+$/.test(orderId) || orderId.length > 255) {
      return null;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    }) as OrderWithItems | null;

    if (!order || order.userId !== userId) {
      return null;
    }

    return order;
  } catch (error) {
    console.error("Get order by id error:", error);
    return null;
  }
}

export async function cancelOrder(orderId: string): Promise<OrderActionResult> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, message: "Please login to cancel order" };
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(orderId) || orderId.length > 255) {
      return { success: false, message: "Invalid order ID" };
    }

    const rateLimit = checkOrderRateLimit(userId, "cancelOrder");
    if (!rateLimit.allowed) {
      return { success: false, message: rateLimit.message };
    }

    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order || order.userId !== userId) {
        return { success: false, message: "Order not found or unauthorized" };
      }

      if (order.status === "CANCELLED") {
        return { success: false, message: "Order is already cancelled" };
      }

      if (order.status === "SHIPPED" || order.status === "DELIVERED") {
        return { success: false, message: "Cannot cancel shipped or delivered orders" };
      }

      if (order.status === "REFUNDED") {
        return { success: false, message: "Cannot cancel refunded orders" };
      }

      for (const item of order.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          console.warn(`Product ${item.productId} not found during order cancellation, skipping inventory rollback`);
          continue;
        }

        await tx.product.update({
          where: { id: item.productId, isActive: true },
          data: {
            stock: { increment: item.quantity },
            salesCount: { decrement: item.quantity },
          },
        });
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
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

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 8).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}