// Pure cart-snapshot conversion: server CartWithItems → UI 精简行 + 汇总。
// Extracted from CartProvider.tsx (Phase 20) — pure move, zero behavior change.

import type { getCurrentCart } from "@/app/actions/cartActions";
import {
  toCartItemDisplayList,
  computeCartTotals,
  type CartItemRelationsInput,
} from "@/lib/cart-display";

/** UI 层使用的精简购物车行 */
export interface CartLine {
  itemId: string;
  productId: string;
  quoteId: string;
  /** 新业务路径：ModelPrice 引用（旧业务路径下为 ""） */
  modelPriceId: string;
  productName: string;
  model: string;
  unitPrice: number;
  quantity: number;
}

export interface CartSnapshot {
  items: CartLine[];
  totalItems: number;
  subtotal: number;
}

export type ServerCart = Awaited<ReturnType<typeof getCurrentCart>>;

/**
 * 将 server action 返回的 CartWithItems 转换为 UI 精简行
 * 委托给 @/lib/cart-display 共享 helper，双路径统一解析
 */
function toLines(cart: ServerCart): CartLine[] {
  if (!cart) return [];
  // CartItemWithProduct 关系字段都可选，与 CartItemRelationsInput 结构兼容
  const displays = toCartItemDisplayList(
    cart.items as unknown as CartItemRelationsInput[]
  );
  return displays.map((d) => ({
    itemId: d.itemId,
    productId: d.productId || "",
    quoteId: d.quoteId || "",
    modelPriceId: d.modelPriceId || "",
    productName: d.productName,
    model: d.model,
    unitPrice: d.unitPrice,
    quantity: d.quantity,
  }));
}

export function toSnapshot(cart: ServerCart): CartSnapshot {
  // 直接对原始 cart.items 用 helper 计算，避免与 CartLine 类型不兼容
  const displays = cart
    ? toCartItemDisplayList(cart.items as unknown as CartItemRelationsInput[])
    : [];
  const { totalItems, totalAmount } = computeCartTotals(displays);
  return { items: toLines(cart), totalItems, subtotal: totalAmount };
}
