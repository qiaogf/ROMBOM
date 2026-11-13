// 游客（未登录）购物车 — sessionStorage 会话内临时存储 + 服务端伪条目形态
//
// 设计：游客加购时由 server action（cart/guest.ts）返回真实价格行，本地构造与
// CartItemRelationsInput 鸭子兼容的伪条目。CartItemsPanel / CartSpecsPanel /
// computeCartTotals / toCartItemDisplay 全部零改动复用。
// 游客购物车只保留在当前标签页会话中，关闭标签/浏览器后不保留。
// 登录成功后 mergeGuestCart server action 把本地行合并进数据库购物车并清空本地。

import type { CartItemRelationsInput } from "@/lib/cart-display";
import { computeCartTotals, toCartItemDisplayList } from "@/lib/cart-display";

const STORAGE_KEY = "guest-cart-v1";
const MAX_GUEST_ITEMS = 100;

/** 游客购物车条目：与 CartItemRelationsInput 结构兼容 + 必有本地 itemId */
export type GuestCartItem = CartItemRelationsInput;

/** 服务端合并入参：只传定位与数量，价格以数据库为准重新校验 */
export interface GuestMergeInput {
  productId?: string | null;
  quoteId?: string | null;
  modelPriceId?: string | null;
  quantity: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function guestItemId(): string {
  return `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadGuestItems(): GuestCartItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (it): it is GuestCartItem =>
          typeof it === "object" &&
          it !== null &&
          typeof (it as GuestCartItem).itemId === "string" &&
          typeof (it as GuestCartItem).quantity === "number"
      )
      .slice(0, MAX_GUEST_ITEMS);
  } catch {
    return [];
  }
}

export function saveGuestItems(items: GuestCartItem[]): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_GUEST_ITEMS)));
  } catch {
    // 存储满/隐私模式：静默失败，购物车仍在当前会话内存中可用
  }
}

export function clearGuestStorage(): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** 汇总计算（总数/总金额），与登录态购物车同一算法 */
export function computeGuestSnapshot(items: GuestCartItem[]): {
  displayItems: ReturnType<typeof toCartItemDisplayList>;
  totalItems: number;
  subtotal: number;
} {
  const displayItems = toCartItemDisplayList(items);
  const { totalItems, totalAmount } = computeCartTotals(displayItems);
  return { displayItems, totalItems, subtotal: totalAmount };
}

/**
 * 本地合并加购：同 quoteId / modelPriceId 数量累加（上限 999），
 * 返回合并后的完整数组（不落盘，由调用方 save）。
 */
export function mergeGuestItem(
  items: GuestCartItem[],
  incoming: GuestCartItem
): { items: GuestCartItem[]; merged: boolean } {
  const keyOf = (it: GuestCartItem) =>
    it.modelPriceId ? `mp:${it.modelPriceId}` : it.quoteId ? `q:${it.quoteId}` : `p:${it.productId}`;

  const key = keyOf(incoming);
  const existing = items.find((it) => keyOf(it) === key);
  if (existing) {
    const nextQty = Math.min(existing.quantity + incoming.quantity, 999);
    return {
      items: items.map((it) => (keyOf(it) === key ? { ...it, quantity: nextQty } : it)),
      merged: true,
    };
  }
  return { items: [...items, incoming], merged: false };
}

/** 转换为服务端合并入参 */
export function toMergeInputs(items: GuestCartItem[]): GuestMergeInput[] {
  return items.map((it) => ({
    productId: it.productId,
    quoteId: it.quoteId,
    modelPriceId: it.modelPriceId,
    quantity: it.quantity,
  }));
}
