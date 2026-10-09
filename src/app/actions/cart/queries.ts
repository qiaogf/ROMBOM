"use server";

// Cart read-only actions — getCartWithItems / getCurrentCart / getCartSummary / getCartItemCount.

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { decimalToNumber } from "@/lib/price";
import type { CartWithItems, CartSummary } from "./types";
import { getSellPrice, serializeCartDecimals } from "./shared";

export async function getCartWithItems(customerId: string): Promise<CartWithItems | null> {
  const cart = await prisma.cart.findFirst({
    where: { customerId },
    include: {
      items: {
        include: {
          product: {
            include: { category: true },
          },
          supplierQuote: true,
          modelPrice: true,
        },
      },
    },
  });
  return serializeCartDecimals(cart) as unknown as CartWithItems | null;
}

export async function getCurrentCart(): Promise<CartWithItems | null> {
  try {
    const customerId = await getCurrentUserId();
    if (!customerId) return null;
    return getCartWithItems(customerId);
  } catch (error) {
    console.error("Get cart error:", error);
    return null;
  }
}

export async function getCartSummary(): Promise<CartSummary> {
  try {
    const customerId = await getCurrentUserId();
    if (!customerId) {
      return { totalQuantity: 0, totalAmount: 0, itemCount: 0 };
    }

    const cart = await prisma.cart.findFirst({
      where: { customerId },
      include: {
        items: {
          include: { supplierQuote: true, modelPrice: true },
        },
      },
    });

    if (!cart || !cart.items.length) {
      return { totalQuantity: 0, totalAmount: 0, itemCount: 0 };
    }

    // 双路径：旧 SupplierQuote / 新 ModelPrice
    const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cart.items.reduce((sum, item) => {
      if (item.supplierQuote) {
        return sum + getSellPrice(item.supplierQuote) * item.quantity;
      }
      if (item.modelPrice) {
        return sum + decimalToNumber(item.modelPrice.sellPrice) * item.quantity;
      }
      return sum;
    }, 0);

    return {
      totalQuantity,
      totalAmount,
      itemCount: cart.items.length,
    };
  } catch (error) {
    console.error("Get cart summary error:", error);
    return { totalQuantity: 0, totalAmount: 0, itemCount: 0 };
  }
}

export async function getCartItemCount(): Promise<number> {
  try {
    const customerId = await getCurrentUserId();
    if (!customerId) return 0;

    const cart = await prisma.cart.findFirst({
      where: { customerId },
      include: { items: true },
    });

    return cart?.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0) || 0;
  } catch (error) {
    console.error("Get cart item count error:", error);
    return 0;
  }
}
