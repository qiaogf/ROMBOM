"use client";

/**
 * 页顶右侧四选项 — 参照 mcmaster.com，一行排列
 * Email Us(#666666 12px) / Log in(#333333 12px) / Cart(#336633 16px 粗体+徽标) / Order(#336633 16px 粗体)
 * Email Us、Log in 为弹窗；Cart、Order 为页面跳转
 */
import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { logout } from "@/app/actions/authActions";
import { useCart } from "@/components/cart/CartProvider";
import { EmailUsModal } from "./EmailUsModal";
import { LoginModal } from "./LoginModal";

const arialFont = { fontFamily: "Arial, Helvetica, sans-serif" } as const;

export function HeaderNav() {
  const [showEmail, setShowEmail] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const { state, rehydrate } = useCart();
  const router = useRouter();
  const loggedIn = Boolean(userName);

  // 页面为静态渲染，登录态异步补充（/api/me 轻量查询）
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      const data = (await res.json()) as { firstName?: string | null };
      setUserName(data.firstName ?? null);
    } catch {
      // 网络异常保持未登录展示
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const handleLoggedIn = useCallback(() => {
    setShowLogin(false);
    // 登录后立即同步购物车徽标 + 刷新登录态，并按需求直接进入购物车页
    void rehydrate();
    void refreshUser();
    router.push("/cart");
  }, [rehydrate, refreshUser, router]);

  const handleLogout = useCallback(async () => {
    await logout();
    setUserName(null);
    void rehydrate();
    // 登出后直接返回主页
    router.push("/");
  }, [rehydrate, router]);

  return (
    <div className="flex items-center gap-1 sm:gap-4 shrink-0" style={arialFont}>
      {/* (1) Email Us → 弹窗（移动端只显信封图标节省首行空间，sm+ 显文字） */}
      <button
        type="button"
        onClick={() => setShowEmail(true)}
        aria-label="Email Us"
        title="Email Us"
        className="min-h-[44px] min-w-[44px] sm:min-w-0 -mx-2 px-2 text-[#666666] hover:opacity-80 whitespace-nowrap inline-flex items-center justify-center"
      >
        <Mail className="w-5 h-5 sm:w-4 sm:h-4 sm:hidden" />
        <span className="hidden sm:inline text-[12px]">Email Us</span>
      </button>

      {/* (2) Log in → 弹窗；已登录仅显示 Log out（My Account 页已删除，登录直达购物车） */}
      {loggedIn ? (
        <div className="flex items-center gap-1 sm:gap-3">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="min-h-[44px] -mx-2 px-2 inline-flex items-center text-[#333333] text-[13px] sm:text-[12px] hover:underline whitespace-nowrap"
          >
            Log out
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowLogin(true)}
          className="min-h-[44px] -mx-2 px-2 inline-flex items-center text-[#333333] text-[13px] sm:text-[12px] hover:underline whitespace-nowrap"
        >
          Log in
        </button>
      )}

      {/* (3) Cart → 购物车完整页面 */}
      <Link
        href="/cart"
        className="min-h-[44px] -mx-2 px-2 inline-flex items-center relative text-[#336633] text-[16px] font-bold tracking-tight hover:underline whitespace-nowrap"
      >
        Cart
        {state.totalItems > 0 && (
          <span className="absolute top-1 right-0 sm:-top-2 sm:-right-5 bg-amber-400 text-amber-950 text-[10px] font-bold rounded-full h-4 min-w-4 px-1 inline-flex items-center justify-center shadow-sm">
            {state.totalItems}
          </span>
        )}
      </Link>

      {/* (4) Order → 订单页面 */}
      <Link
        href="/orders"
        className="min-h-[44px] -mx-2 px-2 inline-flex items-center text-[#336633] text-[16px] font-bold tracking-tight hover:underline whitespace-nowrap"
      >
        Order
      </Link>

      {showEmail && <EmailUsModal onClose={() => setShowEmail(false)} />}
      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onLoggedIn={handleLoggedIn} />
      )}
    </div>
  );
}
