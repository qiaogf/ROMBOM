"use server";

// Cart update action — updateCartItem (quantity change, MOQ re-validation).

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import type { CartActionResult, CartWithItems } from "./types";
import {
  validateItemId,
  validateQuantity,
  calcTotals,
  serializeCartDecimals,
} from "./shared";

export async function updateCartItem(itemId: string, quantity: number): Promise<CartActionResult> {
  try {
    if (!validateItemId(itemId)) {
      return { success: false, message: "Invalid cart item ID" };
    }

    if (!validateQuantity(quantity)) {
      return { success: false, message: "Quantity must be a positive integer (1-999)" };
    }

    const customerId = await getCurrentUserId();
    if (!customerId) {
      return { success: false, message: "Please login to update cart" };
    }

    return prisma.$transaction(async (tx) => {
      const cartItem = await tx.cartItem.findUnique({
        where: { itemId },
        include: { cart: true, supplierQuote: true, modelPrice: true },
      });

      if (!cartItem) {
        return { success: false, message: "Cart item not found" };
      }

      if (cartItem.cart.customerId !== customerId) {
        return { success: false, message: "Unauthorized access to cart" };
      }

      // 双路径 MOQ 校验：SupplierQuote > ModelPrice > 1
      if (!cartItem.supplierQuote && !cartItem.modelPrice) {
        return { success: false, message: "Pricing reference unavailable for this cart item" };
      }
      const moq = cartItem.supplierQuote?.moq ?? cartItem.modelPrice?.moq ?? 1;
      if (quantity < moq) {
        return { success: false, message: `Minimum order quantity is ${moq}` };
      }

      await tx.cartItem.update({
        where: { itemId },
        data: { quantity },
      });

      const updatedCart = await tx.cart.findFirst({
        where: { customerId },
        include: {
          items: {
            include: {
              product: { include: { category: true } },
              supplierQuote: true,
              modelPrice: true,
            },
          },
        },
      }) as unknown as CartWithItems;

      const { totalQuantity, totalAmount } = calcTotals(updatedCart?.items ?? []);

      return {
        success: true,
        message: "Cart updated",
        cart: serializeCartDecimals(updatedCart),
        totalQuantity,
        totalAmount,
      };
    }) as Promise<CartActionResult>;
  } catch (error) {
    console.error("Update cart item error:", error);
    return { success: false, message: "An error occurred while updating cart" };
  }
}
