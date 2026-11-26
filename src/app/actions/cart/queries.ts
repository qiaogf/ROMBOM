"use server";

// Cart read-only actions — getCartWithItems / getCurrentCart / getCartSummary / getCartItemCount.

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { withDbRetry } from "@/lib/db-retry";
import type { CartWithItems, CartItemWithProduct } from "./types";
import { serializeCartDecimals, resolveCartSelfOrder } from "./shared";

async function getCartWithItems(customerId: string): Promise<CartWithItems | null> {
  const cart = await prisma.cart.findFirst({
    where: { customerId },
    include: {
      items: {
        include: {
          product: {
            include: { category: true },
          },
          supplierQuote: true,
          modelPrice: { include: { importBatch: { select: { selfOrderAll: true } } } },
        },
      },
    },
  });
  if (cart) await resolveCartSelfOrder(cart.items as unknown as CartItemWithProduct[]);
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

/** 购物车查询结果：区分"确实为空"与"数据库暂时不可用" */
type CartLookup =
  | { status: "ok"; cart: CartWithItems | null }
  | { status: "unauthenticated" }
  | { status: "unavailable" };

/**
 * 购物车页专用：瞬时连接错误重试一次，仍失败返回 unavailable，
 * 避免把"取不到数据"渲染成"购物车为空"。
 */
export async function lookupCurrentCart(): Promise<CartLookup> {
  const customerId = await getCurrentUserId();
  if (!customerId) return { status: "unauthenticated" };

  try {
    const cart = await withDbRetry(() => getCartWithItems(customerId));
    return { status: "ok", cart };
  } catch (error) {
    console.error("Lookup cart error:", error);
    return { status: "unavailable" };
  }
}
