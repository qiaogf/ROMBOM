"use client";

// Cart-page state machine: local cart mirror + qty inputs + loading/submitting flags
// + all server-action handlers. Extracted from CartContent.tsx (Phase 20).
// 2026-10-20: guest (not-logged-in) branches — local cart mutations via CartProvider;
// Submit Order opens login modal, after login merges guest cart then auto-creates order.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateCartItem,
  removeFromCart,
  clearCart,
} from "@/app/actions/cartActions";
import { createOrderFromCart } from "@/app/actions/orderActions";
import { toCartItemDisplayList, computeCartTotals } from "@/lib/cart-display";
import { useCart } from "@/components/cart/CartProvider";
import type { CartWithItems } from "@/app/actions/cartActions";

export interface CartPageActions {
  cartState: CartWithItems | null;
  error: string;
  loadingItemId: string | null;
  qtyInputs: Record<string, string>;
  setQtyInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isSubmitting: boolean;
  showLogin: boolean;
  setShowLogin: (v: boolean) => void;
  totalItems: number;
  totalAmount: number;
  handleUpdateQuantity: (itemId: string, quantity: number) => Promise<void>;
  handleRemoveItem: (itemId: string) => Promise<void>;
  handleClearCart: () => Promise<void>;
  handleSubmitOrder: () => Promise<void>;
  /** 游客：记录"提交订单"意图并打开登录弹窗 */
  startSubmitFlow: () => void;
  commitQty: (itemId: string, raw: string, current: number) => void;
  handleLoggedIn: () => void;
}

export function useCartPageActions(cart: CartWithItems | null): CartPageActions {
  const [cartState, setCartState] = useState(cart);
  const [error, setError] = useState("");
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  /** 数量输入框的临时值（key: itemId），提交成功后清除回落到服务端数据 */
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});
  const [showLogin, setShowLogin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** 游客点击 Submit Order 的意图标记：登录成功后自动创建订单并进 checkout */
  const pendingSubmitRef = useRef(false);
  const { rehydrate, isLoggedIn, guestUpdateQty, guestRemove, mergeGuestCartOnLogin } = useCart();
  const router = useRouter();

  // 登录/登出触发 router.refresh() 后，服务端 cart props 更新 → 同步本地状态；
  // 游客路径下 cart 参数随 provider.guestItems 变化（CartContent 组装伪 CartWithItems）
  useEffect(() => {
    setCartState(cart);
  }, [cart]);

  const items = cartState?.items ?? [];
  // 用 helper 双路径计算总数与总额，替代直接读 item.supplierQuote
  const { totalItems, totalAmount } = computeCartTotals(toCartItemDisplayList(items));

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    setError("");
    // 游客：本地修改（localStorage + provider 状态），cart 参数变化后自动同步
    if (!isLoggedIn) {
      guestUpdateQty(itemId, quantity);
      setQtyInputs((m) => {
        const next = { ...m };
        delete next[itemId];
        return next;
      });
      return;
    }

    setLoadingItemId(itemId);

    try {
      const result = await updateCartItem(itemId, quantity);
      if (result.success) {
        setCartState(result.cart ?? null);
        setQtyInputs((m) => {
          const next = { ...m };
          delete next[itemId];
          return next;
        });
        void rehydrate();
      } else {
        setError(result.message);
        // 校验失败（如低于 MOQ）→ 恢复为服务端当前数量
        setQtyInputs((m) => {
          const next = { ...m };
          delete next[itemId];
          return next;
        });
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setError("");
    if (!isLoggedIn) {
      guestRemove(itemId);
      return;
    }

    setLoadingItemId(itemId);

    try {
      const result = await removeFromCart(itemId);
      if (result.success) {
        setCartState(result.cart ?? null);
        void rehydrate();
      } else {
        setError(result.message);
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleClearCart = async () => {
    if (!confirm("Are you sure you want to clear your cart?")) return;
    setError("");

    if (!isLoggedIn) {
      await clearCart();
      return;
    }

    try {
      const result = await clearCart();
      if (result.success) {
        setCartState(result.cart ?? null);
        void rehydrate();
      } else {
        setError(result.message);
      }
    } catch {
      setError("An error occurred. Please try again.");
    }
  };

  /** 从购物车创建订单（状态 ordered），成功后跳转 checkout */
  const handleSubmitOrder = async () => {
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      const res = await createOrderFromCart();
      if (res.success && res.order) {
        void rehydrate();
        router.push(`/checkout?orderId=${res.order.orderId}`);
      } else {
        setError(res.message || "Failed to create order");
        setIsSubmitting(false);
      }
    } catch {
      setError("An error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  /** 游客点击 Submit Order：记录意图 → 弹登录窗（登录成功后自动继续下单） */
  const startSubmitFlow = () => {
    pendingSubmitRef.current = true;
    setShowLogin(true);
  };

  /** 数量输入框失焦 / 回车提交 */
  const commitQty = (itemId: string, raw: string, current: number) => {
    const q = Number.parseInt(raw, 10);
    if (!Number.isFinite(q) || q < 1 || String(q) !== raw.trim()) {
      setQtyInputs((m) => ({ ...m, [itemId]: String(current) }));
      setError("Quantity must be a positive whole number.");
      return;
    }
    if (q === current) {
      setQtyInputs((m) => {
        const next = { ...m };
        delete next[itemId];
        return next;
      });
      return;
    }
    void handleUpdateQuantity(itemId, q);
  };

  // 弹窗登录成功 → 合并游客车 → （若来自 Submit Order）自动创建订单进 checkout；
  // 否则刷新服务端渲染区
  const handleLoggedIn = () => {
    setShowLogin(false);
    void (async () => {
      await mergeGuestCartOnLogin();
      if (pendingSubmitRef.current) {
        pendingSubmitRef.current = false;
        await handleSubmitOrder();
      } else {
        router.refresh();
      }
    })();
  };

  return {
    cartState,
    error,
    loadingItemId,
    qtyInputs,
    setQtyInputs,
    isSubmitting,
    showLogin,
    setShowLogin,
    totalItems,
    totalAmount,
    handleUpdateQuantity,
    handleRemoveItem,
    handleClearCart,
    handleSubmitOrder,
    startSubmitFlow,
    commitQty,
    handleLoggedIn,
  };
}
