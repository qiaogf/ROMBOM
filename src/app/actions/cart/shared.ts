// Cart shared helpers — pure functions used by queries.ts and mutations.ts.
// No "use server" directive: this module exports sync helpers, which are forbidden in
// server-action modules. The "use server" boundary lives in queries.ts / mutations.ts.

import { decimalToNumber } from "@/lib/price";
import { toCartItemDisplayList, computeCartTotals } from "@/lib/cart-display";
import type { CartItemWithProduct } from "./types";
import type { SupplierQuote } from "@/../prisma/generated/client";

export const MAX_QUANTITY_PER_ITEM = 999;
export const MAX_CART_ITEMS = 100;

export function validateItemId(itemId: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(itemId) && itemId.length <= 255;
}

export function validateQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_QUANTITY_PER_ITEM;
}

export function getSellPrice(quote: SupplierQuote): number {
  return typeof quote.sellPrice === "number"
    ? quote.sellPrice
    : parseFloat(String(quote.sellPrice));
}

/** 通用库存校验：SupplierQuote 和 ModelPrice 都有 stockStatus 字段，结构类型兼容 */
export function isInStock(item: { stockStatus: "in_stock" | "lead_time" | "out_of_stock" }): boolean {
  return item.stockStatus === "in_stock" || item.stockStatus === "lead_time";
}

/** 从 CartItem 关系对象计算单价（双路径：SupplierQuote > ModelPrice > 0） */
export function getItemUnitPrice(item: CartItemWithProduct): number {
  if (item.supplierQuote) return getSellPrice(item.supplierQuote);
  if (item.modelPrice) return decimalToNumber(item.modelPrice.sellPrice);
  return 0;
}

/** 从 CartItem 关系对象计算 MOQ（双路径：SupplierQuote > ModelPrice > 1） */
export function getItemMoq(item: CartItemWithProduct): number {
  if (item.supplierQuote) return item.supplierQuote.moq;
  if (item.modelPrice) return item.modelPrice.moq;
  return 1;
}

/** 计算 cart items 的总数与总金额（双路径） */
export function calcTotals(items: CartItemWithProduct[]): { totalQuantity: number; totalAmount: number } {
  const { totalItems, totalAmount } = computeCartTotals(toCartItemDisplayList(items));
  return { totalQuantity: totalItems, totalAmount };
}

/** 递归将 Prisma Decimal 转为 number，避免服务端→客户端序列化报错 */
export function serializeCartDecimals<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj;
  const objAny = obj as unknown as { toNumber?: () => number };
  if (typeof objAny.toNumber === "function") {
    return objAny.toNumber() as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => serializeCartDecimals(item)) as unknown as T;
  }
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as unknown as Record<string, unknown>)) {
      result[key] = serializeCartDecimals(value);
    }
    return result as T;
  }
  return obj;
}
