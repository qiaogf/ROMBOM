"use client";

/**
 * 购物车全局 Context（单一事实来源）
 *
 * 数据层：委托给 cartActions server action（Prisma Cart/CartItem 表）。
 * 不再使用 localStorage mock，确保加购与下单链路一致。
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import {
  addToCart as serverAddToCart,
  addToCartByModelPrice as serverAddToCartByModelPrice,
  clearCart as serverClearCart,
  getCurrentCart,
} from "@/app/actions/cartActions";
import { toSnapshot, type CartSnapshot } from "./cart-snapshot";
import { cartReducer, initialCartState, type CartState } from "./cart-reducer";
import { ToastViewport, type ToastKind, type ToastState } from "./ToastViewport";

export type { CartLine, CartSnapshot } from "./cart-snapshot";

interface CartContextValue {
  state: CartState;
  addToCart: (
    productId: string,
    quoteId: string,
    quantity: number
  ) => Promise<{ ok: boolean; error?: string }>;
  /**
   * 按 ModelPrice 加购（新业务路径）
   * 与 addToCart 对称，但入参只需 modelPriceId + quantity
   * loading 状态复用 state.addingProductIds，key 用 modelPriceId
   */
  addToCartByModelPrice: (
    modelPriceId: string,
    quantity: number
  ) => Promise<{ ok: boolean; error?: string }>;
  clearCart: () => Promise<void>;
  /** 从服务端重新拉取购物车（登录成功后徽标即时同步） */
  rehydrate: () => Promise<void>;
  /** 子组件调用：显示一次性提示（用于加购成功/失败） */
  pushToast: (kind: ToastKind, message: string) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const pushToast = useCallback((kind: ToastKind, message: string) => {
    setToasts((prev) => {
      const id = Date.now() + Math.floor(Math.random() * 10000);
      return [...prev, { id, kind, message }];
    });
  }, []);

  // 自动 dismiss toast（3s）
  useEffect(() => {
    if (toasts.length === 0) return;
    const oldestId = toasts[0].id;
    const t = window.setTimeout(() => {
      setToasts((p) => p.filter((t) => t.id !== oldestId));
    }, 3000);
    return () => window.clearTimeout(t);
  }, [toasts]);

  // 初始化：从服务端拉取购物车
  useEffect(() => {
    let alive = true;
    (async () => {
      const cart = await getCurrentCart();
      if (alive) dispatch({ type: "HYDRATE", cart: toSnapshot(cart) });
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 登录态变化后由外部触发（如登录弹窗成功回调），重新拉取服务端购物车
  const rehydrate = useCallback(async () => {
    const cart = await getCurrentCart();
    dispatch({ type: "HYDRATE", cart: toSnapshot(cart) });
  }, []);

  const addToCart = useCallback(
    async (productId: string, quoteId: string, quantity: number) => {
      if (!quoteId) {
        pushToast("error", "This product has no available quote");
        return { ok: false, error: "No available quote" };
      }
      dispatch({ type: "ADD_START", productId });
      const result = await serverAddToCart(productId, quoteId, quantity);
      if (!result.success || !result.cart) {
        dispatch({ type: "ADD_FAIL", productId });
        pushToast("error", result.message || "Failed to add to cart");
        return { ok: false, error: result.message };
      }
      const snap = toSnapshot(result.cart);
      dispatch({ type: "ADD_DONE", productId, cart: snap });
      return { ok: true as const };
    },
    [pushToast]
  );

  /**
   * 按 ModelPrice 加购客户端包装 — 与 addToCart 对称
   * loading key 复用 addingProductIds，但 key 是 modelPriceId
   * （productId 与 modelPriceId 都是 cuid，不会碰撞）
   */
  const addToCartByModelPrice = useCallback(
    async (modelPriceId: string, quantity: number) => {
      if (!modelPriceId) {
        pushToast("error", "Invalid model price");
        return { ok: false, error: "Invalid model price" };
      }
      dispatch({ type: "ADD_START", productId: modelPriceId });
      const result = await serverAddToCartByModelPrice(modelPriceId, quantity);
      if (!result.success || !result.cart) {
        dispatch({ type: "ADD_FAIL", productId: modelPriceId });
        pushToast("error", result.message || "Failed to add to cart");
        return { ok: false, error: result.message };
      }
      const snap = toSnapshot(result.cart);
      dispatch({ type: "ADD_DONE", productId: modelPriceId, cart: snap });
      return { ok: true as const };
    },
    [pushToast]
  );

  const clearCart = useCallback(async () => {
    const result = await serverClearCart();
    if (result.success) {
      dispatch({
        type: "SET_CART",
        cart: { items: [], totalItems: 0, subtotal: 0 } satisfies CartSnapshot,
      });
      pushToast("info", "Cart cleared");
    } else {
      pushToast("error", result.message || "Failed to clear cart");
    }
  }, [pushToast]);

  const value = useMemo<CartContextValue>(
    () => ({ state, addToCart, addToCartByModelPrice, clearCart, rehydrate, pushToast }),
    [state, addToCart, addToCartByModelPrice, clearCart, rehydrate, pushToast]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      {/* 全局 Toast 层 */}
      <ToastViewport
        toasts={toasts}
        onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))}
      />
    </CartContext.Provider>
  );
}

/** 确保 consumer 一定在 Provider 内部（否则抛错，便于早期发现） */
export function useCart(): CartContextValue {
  const v = useContext(CartContext);
  if (!v) throw new Error("useCart() must be used inside <CartProvider>");
  return v;
}
