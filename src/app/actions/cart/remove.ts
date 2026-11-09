"use server";

// Cart remove actions — removeFromCart (single item, auto-prune empty cart) + clearCart (whole cart).

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import type { CartActionResult, CartWithItems, CartItemWithProduct } from "./types";
import {
  validateItemId,
  calcTotals,
  serializeCartDecimals,
  resolveCartSelfOrder,
} from "./shared";

export async function removeFromCart(itemId: string): Promise<CartActionResult> {
  try {
    if (!validateItemId(itemId)) {
      return { success: false, message: "Invalid cart item ID" };
    }

    const customerId = await getCurrentUserId();
    if (!customerId) {
      return { success: false, message: "Please login to remove items from cart" };
    }

    const txResult = (await prisma.$transaction(async (tx) => {
      const cartItem = await tx.cartItem.findUnique({
        where: { itemId },
        include: { cart: true },
      });

      if (!cartItem) {
        return { success: false, message: "Cart item not found" };
      }

      if (cartItem.cart.customerId !== customerId) {
        return { success: false, message: "Unauthorized access to cart" };
      }

      await tx.cartItem.delete({ where: { itemId } });

      // 删除该条目后，若购物车已空，则把 Cart 记录本身一并删除（不残留空购物车）
      const remainingCount = await tx.cartItem.count({ where: { cartId: cartItem.cartId } });

      let updatedCart: CartWithItems | null = null;
      if (remainingCount === 0) {
        await tx.cart.delete({ where: { cartId: cartItem.cartId } });
      } else {
        updatedCart = (await tx.cart.findFirst({
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
        })) as CartWithItems | null;
      }

      const { totalQuantity, totalAmount } = updatedCart
        ? calcTotals(updatedCart.items)
        : { totalQuantity: 0, totalAmount: 0 };

      return {
        success: true,
        message: remainingCount === 0 ? "Item removed. Your cart is now empty." : "Item removed from cart",
        cart: serializeCartDecimals(updatedCart),
        totalQuantity,
        totalAmount,
      };
    })) as CartActionResult;

    if (txResult.success && txResult.cart) {
      await resolveCartSelfOrder(txResult.cart.items as unknown as CartItemWithProduct[]);
    }
    return txResult;
  } catch (error) {
    console.error("Remove from cart error:", error);
    return { success: false, message: "An error occurred while removing item from cart" };
  }
}

export async function clearCart(): Promise<CartActionResult> {
  try {
    const customerId = await getCurrentUserId();
    if (!customerId) {
      return { success: false, message: "Please login to clear cart" };
    }

    const txResult = (await prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({ where: { customerId } });
      if (!cart) {
        return { success: false, message: "Cart not found" };
      }

      // 先删所有条目，再删除 Cart 记录本身（不残留空购物车）
      await tx.cartItem.deleteMany({ where: { cartId: cart.cartId } });
      await tx.cart.delete({ where: { cartId: cart.cartId } });

      return {
        success: true,
        message: "Cart cleared",
        cart: null,
        totalQuantity: 0,
        totalAmount: 0,
      };
    })) as CartActionResult;

    if (txResult.success && txResult.cart) {
      await resolveCartSelfOrder(txResult.cart.items as unknown as CartItemWithProduct[]);
    }
    return txResult;
  } catch (error) {
    console.error("Clear cart error:", error);
    return { success: false, message: "An error occurred while clearing cart" };
  }
}
