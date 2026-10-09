// Pure cart reducer + state types.
// Extracted from CartProvider.tsx (Phase 20) — pure move, zero behavior change.

import type { CartSnapshot } from "./cart-snapshot";

export interface CartState extends CartSnapshot {
  /** 初始化完成标志，避免 SSR / 首次水合闪烁 */
  hydrated: boolean;
  /** 正在执行加购的 productId 集合（Loading 反馈） */
  addingProductIds: Record<string, boolean>;
}

export type CartAction =
  | { type: "HYDRATE"; cart: CartSnapshot }
  | { type: "ADD_START"; productId: string }
  | { type: "ADD_DONE"; productId: string; cart: CartSnapshot }
  | { type: "ADD_FAIL"; productId: string }
  | { type: "SET_CART"; cart: CartSnapshot };

export const initialCartState: CartState = {
  hydrated: false,
  items: [],
  totalItems: 0,
  subtotal: 0,
  addingProductIds: {},
};

export function cartReducer(state: CartState, a: CartAction): CartState {
  switch (a.type) {
    case "HYDRATE":
      return {
        ...state,
        hydrated: true,
        items: a.cart.items,
        totalItems: a.cart.totalItems,
        subtotal: a.cart.subtotal,
      };
    case "ADD_START":
      return {
        ...state,
        addingProductIds: { ...state.addingProductIds, [a.productId]: true },
      };
    case "ADD_DONE":
      return {
        ...state,
        addingProductIds: { ...state.addingProductIds, [a.productId]: false },
        items: a.cart.items,
        totalItems: a.cart.totalItems,
        subtotal: a.cart.subtotal,
      };
    case "ADD_FAIL":
      return {
        ...state,
        addingProductIds: { ...state.addingProductIds, [a.productId]: false },
      };
    case "SET_CART":
      return {
        ...state,
        items: a.cart.items,
        totalItems: a.cart.totalItems,
        subtotal: a.cart.subtotal,
      };
    default:
      return state;
  }
}
