"use client";

/**
 * 购物车全局 Context（单一事实来源）
 *
 * 登录用户：委托给 cartActions server action（Prisma Cart/CartItem 表）。
 * 游客（未登录）：sessionStorage 会话内临时购物车（guest-cart.ts），加购走服务端只读查价
 * 保证价格真实；登录成功后由 mergeGuestCart server action 合并入库并清空本地。
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  addToCart as serverAddToCart,
  addToCartByModelPrice as serverAddToCartByModelPrice,
  clearCart as serverClearCart,
  getCurrentCart,
  getModelPriceForGuest,
  getQuoteForGuest,
  mergeGuestCart as serverMergeGuestCart,
} from "@/app/actions/cartActions";
import { useRouter } from "next/navigation";
import { toSnapshot, type CartSnapshot } from "./cart-snapshot";
import { cartReducer, initialCartState, type CartState } from "./cart-reducer";
import {
  clearGuestStorage,
  computeGuestSnapshot,
  guestItemId,
  loadGuestItems,
  mergeGuestItem,
  saveGuestItems,
  toMergeInputs,
  type GuestCartItem,
} from "./guest-cart";
import { ToastViewport, type ToastKind, type ToastState } from "./ToastViewport";

export type { CartLine, CartSnapshot } from "./cart-snapshot";
export type { GuestCartItem } from "./guest-cart";

interface CartContextValue {
  state: CartState;
  /** 当前登录态（/api/me 异步探测；初始 false，水合后更新） */
  isLoggedIn: boolean;
  /** 游客购物车原始条目（登录用户恒为空数组） */
  guestItems: GuestCartItem[];
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
  /** 从服务端重新拉取购物车（登录成功后徽标即时同步）；登录态变化时同时切换游客/登录数据源 */
  rehydrate: () => Promise<void>;
  /** 游客：修改数量（1-999），本地持久化 */
  guestUpdateQty: (itemId: string, quantity: number) => void;
  /** 游客：移除条目，本地持久化 */
  guestRemove: (itemId: string) => void;
  /** 登录成功后调用：把游客本地车合并入库、清空本地、刷新徽标 */
  mergeGuestCartOnLogin: () => Promise<{ merged: number; failed: number }>;
  /** 子组件调用：显示一次性提示（用于加购成功/失败） */
  pushToast: (kind: ToastKind, message: string) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/** 游客伪条目数组 → UI 快照（与登录态购物车同一展示/汇总算法） */
function snapshotFromGuest(items: GuestCartItem[]): CartSnapshot {
  const { totalItems, subtotal } = computeGuestSnapshot(items);
  return { items: [], totalItems, subtotal };
}

async function detectLoggedIn(): Promise<boolean> {
  try {
    const res = await fetch("/api/me", { cache: "no-store" });
    const data = (await res.json()) as { firstName?: string | null };
    return Boolean(data.firstName);
  } catch {
    return false;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [guestItems, setGuestItems] = useState<GuestCartItem[]>([]);
  /** /api/me 是否已返回 + 最新登录态（避免加购时把登录用户误判成游客） */
  const loginCheckedRef = useRef(false);
  const isLoggedInRef = useRef(false);

  const pushToast = useCallback((kind: ToastKind, message: string) => {
    setToasts((prev) => {
      const id = Date.now() + Math.floor(Math.random() * 10000);
      return [...prev, { id, kind, message }];
    });
  }, []);

  /** 登录态确认后：把水合前误入游客车的条目合并入库，再拉服务端购物车 */
  const router = useRouter();
  const mergePendingGuestItems = useCallback(async () => {
    const pending = loadGuestItems();
    let mergedAnything = false;
    if (pending.length > 0) {
      await serverMergeGuestCart(toMergeInputs(pending));
      clearGuestStorage();
      setGuestItems([]);
      mergedAnything = true;
    }
    const cart = await getCurrentCart();
    dispatch({ type: "HYDRATE", cart: toSnapshot(cart) });
    // 服务端渲染的购物车页数据是旧的 → 刷新一次让列表与徽标一致
    if (mergedAnything) router.refresh();
  }, [router]);

  /** 加购前确保登录态已知：首屏 /api/me 未返回时不能按游客处理 */
  const ensureLoggedIn = useCallback(async () => {
    if (loginCheckedRef.current) return isLoggedInRef.current;
    const loggedIn = await detectLoggedIn();
    loginCheckedRef.current = true;
    isLoggedInRef.current = loggedIn;
    setIsLoggedIn(loggedIn);
    if (loggedIn) await mergePendingGuestItems();
    return loggedIn;
  }, [mergePendingGuestItems]);

  // 自动 dismiss toast（3s）
  useEffect(() => {
    if (toasts.length === 0) return;
    const oldestId = toasts[0].id;
    const t = window.setTimeout(() => {
      setToasts((p) => p.filter((t) => t.id !== oldestId));
    }, 3000);
    return () => window.clearTimeout(t);
  }, [toasts]);

  // 初始化：登录 → 服务端购物车；游客 → sessionStorage 本地购物车
  useEffect(() => {
    let alive = true;
    (async () => {
      const loggedIn = await detectLoggedIn();
      loginCheckedRef.current = true;
      isLoggedInRef.current = loggedIn;
      setIsLoggedIn(loggedIn);
      if (loggedIn) {
        // 水合前可能已把条目加进游客车 → 先合并入库再拉服务端车
        await mergePendingGuestItems();
      } else {
        const items = loadGuestItems();
        setGuestItems(items);
        if (alive) dispatch({ type: "HYDRATE", cart: snapshotFromGuest(items) });
      }
    })();
    return () => {
      alive = false;
    };
  }, [mergePendingGuestItems]);

  // 登录态变化后由外部触发（如登录弹窗成功回调），重新拉取购物车并刷新登录态
  const rehydrate = useCallback(async () => {
    const loggedIn = await detectLoggedIn();
    loginCheckedRef.current = true;
    isLoggedInRef.current = loggedIn;
    setIsLoggedIn(loggedIn);
    if (loggedIn) {
      await mergePendingGuestItems();
    } else {
      const items = loadGuestItems();
      setGuestItems(items);
      dispatch({ type: "HYDRATE", cart: snapshotFromGuest(items) });
    }
  }, [mergePendingGuestItems]);

  // 游客加购（ModelPrice 路径）：服务端只读查价 → 本地构造伪条目合并
  const guestAddByModelPrice = useCallback(
    async (modelPriceId: string, quantity: number) => {
      const res = await getModelPriceForGuest(modelPriceId);
      if (!res.success || !res.data) {
        return { ok: false as const, error: res.message };
      }
      const d = res.data;
      setGuestItems((prev) => {
        const { items: next, merged } = mergeGuestItem(prev, {
          itemId: guestItemId(),
          quantity,
          productId: null,
          quoteId: null,
          modelPriceId,
          modelPrice: {
            productName: d.productName,
            model: d.model,
            unit: d.unit,
            sellPrice: d.sellPrice,
            moq: d.moq,
            condition: d.condition,
            leadTime: d.leadTime,
            thumbnail: d.thumbnail,
            selfOrder: d.selfOrder,
          },
        });
        saveGuestItems(next);
        dispatch({ type: "ADD_DONE", productId: modelPriceId, cart: snapshotFromGuest(next) });
        pushToast("info", merged ? `Quantity updated (${d.model})` : `Added ${quantity} item(s) to cart`);
        return next;
      });
      return { ok: true as const };
    },
    [pushToast]
  );

  // 游客加购（SupplierQuote 路径）：同上
  const guestAddByQuote = useCallback(
    async (productId: string, quoteId: string, quantity: number) => {
      const res = await getQuoteForGuest(productId, quoteId);
      if (!res.success || !res.data) {
        return { ok: false as const, error: res.message };
      }
      const d = res.data;
      setGuestItems((prev) => {
        const { items: next, merged } = mergeGuestItem(prev, {
          itemId: guestItemId(),
          quantity,
          productId,
          quoteId,
          modelPriceId: null,
          product: d.product,
          supplierQuote: d.quote,
        });
        saveGuestItems(next);
        dispatch({ type: "ADD_DONE", productId, cart: snapshotFromGuest(next) });
        pushToast("info", merged ? "Quantity updated" : `Added ${quantity} item(s) to cart`);
        return next;
      });
      return { ok: true as const };
    },
    [pushToast]
  );

  const addToCart = useCallback(
    async (productId: string, quoteId: string, quantity: number) => {
      if (!quoteId) {
        pushToast("error", "This product has no available quote");
        return { ok: false, error: "No available quote" };
      }
      dispatch({ type: "ADD_START", productId });
      const loggedIn = isLoggedIn || (await ensureLoggedIn());
      if (!loggedIn) {
        const res = await guestAddByQuote(productId, quoteId, quantity);
        if (!res.ok) dispatch({ type: "ADD_FAIL", productId });
        return res;
      }
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
    [isLoggedIn, guestAddByQuote, pushToast, ensureLoggedIn]
  );

  const addToCartByModelPrice = useCallback(
    async (modelPriceId: string, quantity: number) => {
      if (!modelPriceId) {
        pushToast("error", "Invalid model price");
        return { ok: false, error: "Invalid model price" };
      }
      dispatch({ type: "ADD_START", productId: modelPriceId });
      const loggedIn = isLoggedIn || (await ensureLoggedIn());
      if (!loggedIn) {
        const res = await guestAddByModelPrice(modelPriceId, quantity);
        if (!res.ok) dispatch({ type: "ADD_FAIL", productId: modelPriceId });
        return res;
      }
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
    [isLoggedIn, guestAddByModelPrice, pushToast, ensureLoggedIn]
  );

  const clearCart = useCallback(async () => {
    if (!isLoggedIn) {
      clearGuestStorage();
      setGuestItems([]);
      dispatch({
        type: "SET_CART",
        cart: { items: [], totalItems: 0, subtotal: 0 } satisfies CartSnapshot,
      });
      pushToast("info", "Cart cleared");
      return;
    }
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
  }, [isLoggedIn, pushToast]);

  // 游客：本地数量修改（上限与登录路径一致 1-999）
  const guestUpdateQty = useCallback((itemId: string, quantity: number) => {
    const q = Math.min(Math.max(Math.round(quantity), 1), 999);
    setGuestItems((prev) => {
      const next = prev.map((it) => (it.itemId === itemId ? { ...it, quantity: q } : it));
      saveGuestItems(next);
      dispatch({ type: "SET_CART", cart: snapshotFromGuest(next) });
      return next;
    });
  }, []);

  // 游客：本地移除
  const guestRemove = useCallback((itemId: string) => {
    setGuestItems((prev) => {
      const next = prev.filter((it) => it.itemId !== itemId);
      saveGuestItems(next);
      dispatch({ type: "SET_CART", cart: snapshotFromGuest(next) });
      return next;
    });
  }, []);

  // 登录成功：合并游客本地车入库（服务端逐行校验），清空本地，刷新徽标
  const mergeGuestCartOnLogin = useCallback(async () => {
    if (guestItems.length === 0) {
      // 无本地行也要刷新一次服务端车（幂等）
      const cart = await getCurrentCart();
      dispatch({ type: "HYDRATE", cart: toSnapshot(cart) });
      return { merged: 0, failed: 0 };
    }
    const res = await serverMergeGuestCart(toMergeInputs(guestItems));
    clearGuestStorage();
    setGuestItems([]);
    const cart = await getCurrentCart();
    dispatch({ type: "HYDRATE", cart: toSnapshot(cart) });
    if (res.failed > 0) pushToast("info", res.message);
    return { merged: res.merged, failed: res.failed };
  }, [guestItems, pushToast]);

  const value = useMemo<CartContextValue>(
    () => ({
      state,
      isLoggedIn,
      guestItems,
      addToCart,
      addToCartByModelPrice,
      clearCart,
      rehydrate,
      guestUpdateQty,
      guestRemove,
      mergeGuestCartOnLogin,
      pushToast,
    }),
    [
      state,
      isLoggedIn,
      guestItems,
      addToCart,
      addToCartByModelPrice,
      clearCart,
      rehydrate,
      guestUpdateQty,
      guestRemove,
      mergeGuestCartOnLogin,
      pushToast,
    ]
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
