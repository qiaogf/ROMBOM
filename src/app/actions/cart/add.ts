"use server";

// Cart add actions — addToCart (SupplierQuote path) + addToCartByModelPrice (ModelPrice path).
// Both share the same cart-backfill + merge + validate-and-return shape.

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { isValidIdFormat } from "@/lib/security";
import type { CartActionResult, CartWithItems } from "./types";
import {
  MAX_QUANTITY_PER_ITEM,
  MAX_CART_ITEMS,
  validateQuantity,
  isInStock,
  calcTotals,
  serializeCartDecimals,
} from "./shared";

export async function addToCart(productId: string, quoteId: string, quantity: number = 1): Promise<CartActionResult> {
  try {
    if (!isValidIdFormat(productId)) {
      return { success: false, message: "Invalid product ID" };
    }

    if (!isValidIdFormat(quoteId)) {
      return { success: false, message: "Invalid quote ID" };
    }

    if (!validateQuantity(quantity)) {
      return { success: false, message: "Quantity must be a positive integer (1-999)" };
    }

    const customerId = await getCurrentUserId();
    if (!customerId) {
      return { success: false, message: "Please login to add items to cart" };
    }

    const quote = await prisma.supplierQuote.findUnique({
      where: { quoteId },
      include: { product: true },
    });

    if (!quote || !quote.isValid) {
      return { success: false, message: "Product quote not found or unavailable" };
    }

    if (quote.productId !== productId) {
      return { success: false, message: "Invalid product-quote combination" };
    }

    if (quote.product.status !== "on_sale") {
      return { success: false, message: "Product is not on sale" };
    }

    if (!isInStock(quote)) {
      return { success: false, message: "Product is currently out of stock" };
    }

    if (quote.moq > 1 && quantity < quote.moq) {
      return { success: false, message: `Minimum order quantity is ${quote.moq}` };
    }

    return prisma.$transaction(async (tx) => {
      let cart = await tx.cart.findFirst({ where: { customerId } });

      if (!cart) {
        cart = await tx.cart.create({
          data: { customerId },
        });
      }

      const existingItem = await tx.cartItem.findUnique({
        where: { cartId_quoteId: { cartId: cart.cartId, quoteId } },
      });

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > MAX_QUANTITY_PER_ITEM) {
          return { success: false, message: `Maximum quantity per item is ${MAX_QUANTITY_PER_ITEM}` };
        }

        await tx.cartItem.update({
          where: { itemId: existingItem.itemId },
          data: { quantity: newQuantity },
        });
      } else {
        const itemCount = await tx.cartItem.count({ where: { cartId: cart.cartId } });
        if (itemCount >= MAX_CART_ITEMS) {
          return { success: false, message: `Cart is full (maximum ${MAX_CART_ITEMS} items)` };
        }

        await tx.cartItem.create({
          data: {
            cartId: cart.cartId,
            quoteId,
            productId,
            quantity,
          },
        });
      }

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

      const { totalQuantity, totalAmount } = calcTotals(updatedCart!.items);

      return {
        success: true,
        message: `Added ${quantity} item(s) to cart`,
        cart: serializeCartDecimals(updatedCart!),
        totalQuantity,
        totalAmount,
      };
    }) as Promise<CartActionResult>;
  } catch (error) {
    console.error("Add to cart error:", error);
    return { success: false, message: "An error occurred while adding item to cart" };
  }
}

/**
 * 按 ModelPrice 加购（新业务路径）
 *
 * 与 addToCart 的差异：
 *   - 入参只需 modelPriceId，无需 productId/quoteId
 *   - 唯一约束走 @@unique([cartId, modelPriceId])
 *   - 价格与 MOQ 直接从 ModelPrice 表读取
 *
 * 与 addToCart 的共同点：
 *   - 同样校验 customerId / quantity / 库存 / MOQ
 *   - 同样合并相同型号条目
 *   - 同样返回完整 CartWithItems
 */
export async function addToCartByModelPrice(
  modelPriceId: string,
  quantity: number = 1
): Promise<CartActionResult> {
  try {
    if (!isValidIdFormat(modelPriceId)) {
      return { success: false, message: "Invalid model price ID" };
    }

    if (!validateQuantity(quantity)) {
      return { success: false, message: "Quantity must be a positive integer (1-999)" };
    }

    const customerId = await getCurrentUserId();
    if (!customerId) {
      return { success: false, message: "Please login to add items to cart" };
    }

    const modelPrice = await prisma.modelPrice.findUnique({
      where: { modelPriceId },
    });

    if (!modelPrice || !modelPrice.isActive) {
      return { success: false, message: "Model price not found or unavailable" };
    }

    if (modelPrice.status !== "on_sale") {
      return { success: false, message: "Product is not on sale" };
    }

    if (!isInStock(modelPrice)) {
      return { success: false, message: "Product is currently out of stock" };
    }

    if (modelPrice.moq > 1 && quantity < modelPrice.moq) {
      return { success: false, message: `Minimum order quantity is ${modelPrice.moq}` };
    }

    return prisma.$transaction(async (tx) => {
      let cart = await tx.cart.findFirst({ where: { customerId } });

      if (!cart) {
        cart = await tx.cart.create({
          data: { customerId },
        });
      }

      // 唯一约束 @@unique([cartId, modelPriceId]) — 同一型号不重复
      const existingItem = await tx.cartItem.findUnique({
        where: { cartId_modelPriceId: { cartId: cart.cartId, modelPriceId } },
      });

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > MAX_QUANTITY_PER_ITEM) {
          return { success: false, message: `Maximum quantity per item is ${MAX_QUANTITY_PER_ITEM}` };
        }

        await tx.cartItem.update({
          where: { itemId: existingItem.itemId },
          data: { quantity: newQuantity },
        });
      } else {
        const itemCount = await tx.cartItem.count({ where: { cartId: cart.cartId } });
        if (itemCount >= MAX_CART_ITEMS) {
          return { success: false, message: `Cart is full (maximum ${MAX_CART_ITEMS} items)` };
        }

        await tx.cartItem.create({
          data: {
            cartId: cart.cartId,
            modelPriceId,
            quantity,
          },
        });
      }

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

      const { totalQuantity, totalAmount } = calcTotals(updatedCart!.items);

      return {
        success: true,
        message: `Added ${quantity} item(s) to cart`,
        cart: serializeCartDecimals(updatedCart!),
        totalQuantity,
        totalAmount,
      };
    }) as Promise<CartActionResult>;
  } catch (error) {
    console.error("Add to cart by model price error:", error);
    return { success: false, message: "An error occurred while adding item to cart" };
  }
}
