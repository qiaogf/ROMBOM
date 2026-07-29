"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { decimalToNumber } from "@/lib/price";
import type { Cart, CartItem } from "@/../prisma/generated/client";

export interface CartActionResult {
  success: boolean;
  message: string;
  cart?: CartWithItems;
  totalQuantity?: number;
  totalAmount?: number;
}

export interface CartWithItems extends Cart {
  items: (CartItem & { product: {
    id: string;
    sku: string;
    name: string;
    nameEn: string | null;
    price: { toString: () => string };
    originalPrice: { toString: () => string } | null;
    currency: string;
    stock: number;
    thumbnail: string | null;
    isActive: boolean;
    weight: { toString: () => string } | null;
    weightUnit: string;
    category: { id: string; name: string; nameEn: string | null } | null;
  } })[];
}

export interface CartSummary {
  totalQuantity: number;
  totalAmount: number;
  itemCount: number;
}

const MAX_QUANTITY_PER_ITEM = 999;
const MAX_CART_ITEMS = 100;
const RATE_LIMIT_WINDOW_MS = 1000;
const MAX_OPERATIONS_PER_WINDOW = 5;
const operationRateLimit = new Map<string, number[]>();

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of operationRateLimit.entries()) {
    const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) {
      operationRateLimit.delete(key);
    } else {
      operationRateLimit.set(key, valid);
    }
  }
}, 30000);

function checkOperationRateLimit(userId: string, operation: string): { allowed: boolean } {
  const key = `${userId}:${operation}`;
  const now = Date.now();
  const timestamps = operationRateLimit.get(key) || [];
  const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (valid.length >= MAX_OPERATIONS_PER_WINDOW) {
    operationRateLimit.set(key, valid);
    return { allowed: false };
  }

  valid.push(now);
  operationRateLimit.set(key, valid);
  return { allowed: true };
}

function validateProductId(productId: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(productId) && productId.length <= 255;
}

function validateItemId(itemId: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(itemId) && itemId.length <= 255;
}

function validateQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_QUANTITY_PER_ITEM;
}

export async function getCartWithItems(userId: string): Promise<CartWithItems | null> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: { category: true },
          },
        },
      },
    },
  });
  return cart as CartWithItems | null;
}

export async function getCurrentCart(): Promise<CartWithItems | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;
    return getCartWithItems(userId);
  } catch (error) {
    console.error("Get cart error:", error);
    return null;
  }
}

export async function getCartSummary(): Promise<CartSummary> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { totalQuantity: 0, totalAmount: 0, itemCount: 0 };
    }

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    if (!cart || !cart.items.length) {
      return { totalQuantity: 0, totalAmount: 0, itemCount: 0 };
    }

    const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cart.items.reduce((sum, item) => sum + decimalToNumber(item.unitPrice) * item.quantity, 0);

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

export async function addToCart(productId: string, quantity: number = 1): Promise<CartActionResult> {
  try {
    if (!validateProductId(productId)) {
      return { success: false, message: "Invalid product ID" };
    }

    if (!validateQuantity(quantity)) {
      return { success: false, message: "Quantity must be a positive integer (1-999)" };
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, message: "Please login to add items to cart" };
    }

    const rateLimit = checkOperationRateLimit(userId, "addToCart");
    if (!rateLimit.allowed) {
      return { success: false, message: "Too many operations. Please wait a moment." };
    }

    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true },
    });

    if (!product) {
      return { success: false, message: "Product not found or unavailable" };
    }

    if (product.stock <= 0) {
      return { success: false, message: "Product is currently out of stock" };
    }

    if (quantity > product.stock) {
      return { success: false, message: `Only ${product.stock} items available in stock` };
    }

    return prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({ where: { userId } });

      if (!cart) {
        const newCart = await tx.cart.create({
          data: { userId },
        });

        await tx.cartItem.create({
          data: {
            cartId: newCart.id,
            productId,
            quantity,
            unitPrice: product.price,
            currency: product.currency,
          },
        });

        const updatedCart = await tx.cart.findUnique({
          where: { userId },
          include: {
            items: {
              include: { product: { include: { category: true } } },
            },
          },
        }) as CartWithItems;

        const totalAmount = updatedCart.items.reduce((sum, item) => {
          return sum + decimalToNumber(item.unitPrice) * item.quantity;
        }, 0);

        await tx.cart.update({
          where: { id: newCart.id },
          data: { totalAmount: totalAmount.toString() },
        });

        return {
          success: true,
          message: `Added ${quantity} item(s) to cart`,
          cart: updatedCart,
          totalQuantity: quantity,
          totalAmount,
        };
      }

      const itemCount = await tx.cartItem.count({ where: { cartId: cart.id } });
      const existingItem = await tx.cartItem.findUnique({
        where: { cartId_productId: { cartId: cart.id, productId } },
      });

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.stock) {
          return { success: false, message: `Only ${product.stock} items available in stock` };
        }
        if (newQuantity > MAX_QUANTITY_PER_ITEM) {
          return { success: false, message: `Maximum quantity per item is ${MAX_QUANTITY_PER_ITEM}` };
        }

        await tx.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: newQuantity },
        });
      } else {
        if (itemCount >= MAX_CART_ITEMS) {
          return { success: false, message: `Cart is full (maximum ${MAX_CART_ITEMS} items)` };
        }

        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity,
            unitPrice: product.price,
            currency: product.currency,
          },
        });
      }

      const updatedCart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: { product: { include: { category: true } } },
          },
        },
      }) as CartWithItems;

      const totalAmount = updatedCart.items.reduce((sum, item) => {
        return sum + decimalToNumber(item.unitPrice) * item.quantity;
      }, 0);

      await tx.cart.update({
        where: { id: cart.id },
        data: { totalAmount: totalAmount.toString() },
      });

      const totalQuantity = updatedCart.items.reduce((sum, item) => sum + item.quantity, 0);

      return {
        success: true,
        message: `Added ${quantity} item(s) to cart`,
        cart: updatedCart,
        totalQuantity,
        totalAmount,
      };
    }) as Promise<CartActionResult>;
  } catch (error) {
    console.error("Add to cart error:", error);
    return { success: false, message: "An error occurred while adding item to cart" };
  }
}

export async function updateCartItem(itemId: string, quantity: number): Promise<CartActionResult> {
  try {
    if (!validateItemId(itemId)) {
      return { success: false, message: "Invalid cart item ID" };
    }

    if (!validateQuantity(quantity)) {
      return { success: false, message: "Quantity must be a positive integer (1-999)" };
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, message: "Please login to update cart" };
    }

    const rateLimit = checkOperationRateLimit(userId, "updateCartItem");
    if (!rateLimit.allowed) {
      return { success: false, message: "Too many operations. Please wait a moment." };
    }

    return prisma.$transaction(async (tx) => {
      const cartItem = await tx.cartItem.findUnique({
        where: { id: itemId },
        include: { cart: true, product: true },
      });

      if (!cartItem) {
        return { success: false, message: "Cart item not found" };
      }

      if (cartItem.cart.userId !== userId) {
        return { success: false, message: "Unauthorized access to cart" };
      }

      if (!cartItem.product.isActive) {
        await tx.cartItem.delete({ where: { id: itemId } });
        return { success: false, message: "Product is no longer available, removed from cart" };
      }

      if (quantity > cartItem.product.stock) {
        return { success: false, message: `Only ${cartItem.product.stock} items available in stock` };
      }

      await tx.cartItem.update({
        where: { id: itemId },
        data: { quantity },
      });

      const updatedCart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: { product: { include: { category: true } } },
          },
        },
      }) as CartWithItems;

      const totalAmount = updatedCart?.items.reduce((sum, item) => {
        return sum + decimalToNumber(item.unitPrice) * item.quantity;
      }, 0) || 0;

      await tx.cart.update({
        where: { id: cartItem.cart.id },
        data: { totalAmount: totalAmount.toString() },
      });

      const totalQuantity = updatedCart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

      return {
        success: true,
        message: "Cart updated",
        cart: updatedCart,
        totalQuantity,
        totalAmount,
      };
    }) as Promise<CartActionResult>;
  } catch (error) {
    console.error("Update cart item error:", error);
    return { success: false, message: "An error occurred while updating cart" };
  }
}

export async function removeFromCart(itemId: string): Promise<CartActionResult> {
  try {
    if (!validateItemId(itemId)) {
      return { success: false, message: "Invalid cart item ID" };
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, message: "Please login to remove items from cart" };
    }

    const rateLimit = checkOperationRateLimit(userId, "removeFromCart");
    if (!rateLimit.allowed) {
      return { success: false, message: "Too many operations. Please wait a moment." };
    }

    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!cartItem) {
      return { success: false, message: "Cart item not found" };
    }

    if (cartItem.cart.userId !== userId) {
      return { success: false, message: "Unauthorized access to cart" };
    }

    return prisma.$transaction(async (tx) => {
      await tx.cartItem.delete({ where: { id: itemId } });

      const updatedCart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: { product: { include: { category: true } } },
          },
        },
      }) as CartWithItems | null;

      const totalAmount = updatedCart?.items.reduce((sum, item) => {
        return sum + decimalToNumber(item.unitPrice) * item.quantity;
      }, 0) || 0;

      await tx.cart.update({
        where: { id: cartItem.cart.id },
        data: { totalAmount: totalAmount.toString() },
      });

      const totalQuantity = updatedCart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

      return {
        success: true,
        message: "Item removed from cart",
        cart: updatedCart,
        totalQuantity,
        totalAmount,
      };
    }) as Promise<CartActionResult>;
  } catch (error) {
    console.error("Remove from cart error:", error);
    return { success: false, message: "An error occurred while removing item from cart" };
  }
}

export async function clearCart(): Promise<CartActionResult> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, message: "Please login to clear cart" };
    }

    const rateLimit = checkOperationRateLimit(userId, "clearCart");
    if (!rateLimit.allowed) {
      return { success: false, message: "Too many operations. Please wait a moment." };
    }

    return prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({ where: { userId } });
      if (!cart) {
        return { success: false, message: "Cart not found" };
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { totalAmount: "0" } });

      const updatedCart = await tx.cart.findUnique({
        where: { userId },
        include: { items: { include: { product: { include: { category: true } } } } },
      }) as CartWithItems;

      return {
        success: true,
        message: "Cart cleared",
        cart: updatedCart,
        totalQuantity: 0,
        totalAmount: 0,
      };
    }) as Promise<CartActionResult>;
  } catch (error) {
    console.error("Clear cart error:", error);
    return { success: false, message: "An error occurred while clearing cart" };
  }
}

export async function getCartItemCount(): Promise<number> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return 0;

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    return cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  } catch (error) {
    console.error("Get cart item count error:", error);
    return 0;
  }
}