// Cart shared helpers — pure functions used by queries.ts and mutations.ts.
// No "use server" directive: this module exports sync helpers, which are forbidden in
// server-action modules. The "use server" boundary lives in queries.ts / mutations.ts.

import { decimalToNumber } from "@/lib/price";
import { toCartItemDisplayList, computeCartTotals } from "@/lib/cart-display";
import { prisma } from "@/lib/prisma";
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

/** 通用可购性校验：Leadtime 统一字段语义，仅 "Out of Stock" 不可加购（SupplierQuote/ModelPrice 结构兼容） */
export function isInStock(item: { leadTime: string | null }): boolean {
  const t = item.leadTime?.trim().toLowerCase() ?? "";
  return !t.includes("out of stock");
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

/**
 * 解析单个 ModelPrice 的 Self 生效值（淡绿 = 可自助下单）。
 * 购物车行可能来自价格文件，而 Self 开关设在产品文件：
 *   行级 selfOrder OR 行所属批次 selfOrderAll
 *   OR 同品类+型号的产品属性行（quoteKey 以 base| 开头）selfOrder
 *   OR 产品属性行所属批次 selfOrderAll。
 */
export async function resolveSingleSelfOrder(
  modelPriceId: string
): Promise<boolean | null> {
  const mp = await prisma.modelPrice.findUnique({
    where: { modelPriceId },
    select: {
      selfOrder: true,
      categoryId: true,
      model: true,
      importBatch: { select: { selfOrderAll: true } },
    },
  });
  if (!mp) return null;
  if (mp.selfOrder) return true;
  if (mp.importBatch?.selfOrderAll) return true;

  const base = await prisma.modelPrice.findFirst({
    where: { quoteKey: { startsWith: "base|" }, categoryId: mp.categoryId, model: mp.model },
    select: {
      selfOrder: true,
      importBatch: { select: { selfOrderAll: true } },
    },
  });
  return !!(base?.selfOrder || base?.importBatch?.selfOrderAll);
}

/**
 * 解析购物车行的 Self 生效值（淡绿 = 可自助下单）。
 * 购物车行来自价格文件（price 批次），而 Self 开关设在产品文件（product_info 批次）：
 * 因此按「品类 + 型号」回查产品属性行（quoteKey 以 base| 开头），合并
 *   行级开关 OR 所属批次主开关 OR 产品属性行开关 OR 产品文件主开关。
 * 结果写回 item.modelPrice.selfOrder，供前端 toCartItemDisplay 直接使用。
 */
export async function resolveCartSelfOrder(items: CartItemWithProduct[]): Promise<void> {
  const targets = items
    .map((it) => it.modelPrice)
    .filter((mp): mp is NonNullable<CartItemWithProduct["modelPrice"]> => !!mp);
  if (targets.length === 0) return;

  const pairs = new Map<string, { categoryId: string; model: string }>();
  for (const mp of targets) pairs.set(`${mp.categoryId}|${mp.model}`, { categoryId: mp.categoryId, model: mp.model });
  if (pairs.size === 0) return;

  const all = [...pairs.values()];
  const baseRows = await prisma.modelPrice.findMany({
    where: {
      quoteKey: { startsWith: "base|" },
      categoryId: { in: [...new Set(all.map((p) => p.categoryId))] },
      model: { in: [...new Set(all.map((p) => p.model))] },
    },
    select: {
      categoryId: true,
      model: true,
      selfOrder: true,
      importBatch: { select: { selfOrderAll: true } },
    },
  });
  const baseMap = new Map(baseRows.map((r) => [`${r.categoryId}|${r.model}`, r]));

  for (const mp of targets) {
    const base = baseMap.get(`${mp.categoryId}|${mp.model}`);
    mp.selfOrder =
      mp.selfOrder === true ||
      mp.importBatch?.selfOrderAll === true ||
      base?.selfOrder === true ||
      base?.importBatch?.selfOrderAll === true;
  }
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
