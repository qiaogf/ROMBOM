"use client";

/**
 * Cart 页内容 — 参照 mcmaster.com 购物车双栏布局
 * 左侧大区：明细表（型号 / 单价 / 数量可编辑 / 小计 / 删除）+ 底部总金额
 * 右侧小区：Specifications 规格表
 * Phase 20: 状态机移至 useCartPageActions，左右面板拆分为子组件。
 * 2026-10-20: 游客（未登录）购物车 — 渲染 provider 的 localStorage 条目，
 * 界面与登录用户完全一致；Submit Order 走登录弹窗。
 */
import { useMemo } from "react";
import Link from "next/link";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { LoginModal } from "@/components/layout/LoginModal";
import type { CartWithItems } from "@/app/actions/cartActions";
import { useCart } from "@/components/cart/CartProvider";
import { useCartPageActions } from "./_components/useCartPageActions";
import { CartItemsPanel } from "./_components/CartItemsPanel";
import { CartSpecsPanel } from "./_components/CartSpecsPanel";

interface CartContentProps {
  cart: CartWithItems | null;
  isLoggedIn: boolean;
}

export function CartContent({ cart, isLoggedIn }: CartContentProps) {
  const { guestItems } = useCart();

  // 游客：把 provider 的本地伪条目组装成 CartWithItems 鸭子类型，
  // 渲染与操作链路（CartItemsPanel/CartSpecsPanel/toCartItemDisplay）零改动复用
  const effectiveCart = useMemo<CartWithItems | null>(() => {
    if (isLoggedIn) return cart;
    if (guestItems.length === 0) return null;
    return {
      cartId: "guest-cart",
      customerId: "guest",
      items: guestItems,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as CartWithItems;
  }, [cart, guestItems, isLoggedIn]);

  const actions = useCartPageActions(effectiveCart);
  const { cartState, error, showLogin, setShowLogin, handleLoggedIn } = actions;

  const items = cartState?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="flex-1 min-h-0 overflow-y-scroll main-scrollbar">
        <div className="h-0.5 bg-amber-400 shrink-0"></div>
        <div className="px-4 sm:px-6 py-16 text-center">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-12 h-12 text-slate-300" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Your cart is empty
          </h1>
          <p className="text-sm text-slate-500 mb-8">
            Add items from the model price tables to place an order.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded bg-[#336633] text-white text-sm font-bold hover:bg-[#2d5a2d] transition-colors"
          >
            Browse Catalog
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-scroll main-scrollbar">
      <div className="h-0.5 bg-amber-400 shrink-0"></div>
      <div className="px-1.5 sm:px-2 pt-1.5 pb-3">
        <div className="mb-1.5">
          <h1 className="text-sm font-bold text-slate-900">Shopping Cart</h1>
        </div>

        {error && (
          <div
            className="mb-4 px-4 py-2.5 rounded border border-rose-200 bg-rose-50 text-sm text-rose-700"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {/* ===== 左侧：明细表 ===== */}
          <CartItemsPanel items={items} isLoggedIn={isLoggedIn} actions={actions} />

          {/* ===== 右侧：规格参数表 ===== */}
          <div className="lg:col-span-1">
            <CartSpecsPanel items={items} />
          </div>
        </div>
      </div>

      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onLoggedIn={handleLoggedIn} />
      )}
    </div>
  );
}
