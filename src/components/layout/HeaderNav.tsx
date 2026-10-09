"use client";

/**
 * 页顶右侧四选项 — 参照 mcmaster.com，一行排列
 * Email Us(#666666 12px) / Log in(#333333 12px) / Cart(#336633 16px 粗体+徽标) / Order(#336633 16px 粗体)
 * Email Us、Log in 为弹窗；Cart、Order 为页面跳转
 */
import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { logout } from "@/app/actions/authActions";
import { useCart } from "@/components/cart/CartProvider";
import { EmailUsModal } from "./EmailUsModal";
import { LoginModal } from "./LoginModal";

const arialFont = { fontFamily: "Arial, Helvetica, sans-serif" } as const;

interface HeaderNavProps {
  /** 已登录用户名（未登录为 null），由服务端 Header 传入 */
  userName: string | null;
}

export function HeaderNav({ userName }: HeaderNavProps) {
  const [showEmail, setShowEmail] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const { state, rehydrate } = useCart();
  const router = useRouter();
  const loggedIn = Boolean(userName);

  const handleLoggedIn = useCallback(() => {
    setShowLogin(false);
    // 登录后立即同步购物车徽标 + 刷新服务端渲染区域
    void rehydrate();
    router.refresh();
  }, [rehydrate, router]);

  const handleLogout = useCallback(async () => {
    await logout();
    // 登出后直接返回主页
    router.push("/");
    router.refresh();
  }, [router]);

  return (
    <div className="flex items-center gap-4 sm:gap-8 shrink-0" style={arialFont}>
      {/* (1) Email Us → 弹窗（移动端只显信封图标节省首行空间，sm+ 显文字） */}
      <button
        type="button"
        onClick={() => setShowEmail(true)}
        aria-label="Email Us"
        title="Email Us"
        className="text-[#666666] hover:opacity-80 whitespace-nowrap inline-flex items-center"
      >
        <Mail className="w-4 h-4 sm:hidden" />
        <span className="hidden sm:inline text-[12px]">Email Us</span>
      </button>

      {/* (2) Log in → 弹窗；已登录则显示问候 + Log out */}
      {loggedIn ? (
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/account"
            className="text-[#333333] text-[12px] hover:underline whitespace-nowrap"
            title="My Account"
          >
            Hi, {userName}
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="text-[#333333] text-[12px] hover:underline whitespace-nowrap"
          >
            Log out
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowLogin(true)}
          className="text-[#333333] text-[12px] hover:underline whitespace-nowrap"
        >
          Log in
        </button>
      )}

      {/* (3) Cart → 购物车完整页面 */}
      <Link
        href="/cart"
        className="relative text-[#336633] text-[16px] font-bold tracking-tight hover:underline whitespace-nowrap"
      >
        Cart
        {loggedIn && state.totalItems > 0 && (
          <span className="absolute -top-2 -right-5 bg-amber-400 text-amber-950 text-[10px] font-bold rounded-full h-4 min-w-4 px-1 inline-flex items-center justify-center shadow-sm">
            {state.totalItems}
          </span>
        )}
      </Link>

      {/* (4) Order → 订单页面 */}
      <Link
        href="/orders"
        className="text-[#336633] text-[16px] font-bold tracking-tight hover:underline whitespace-nowrap"
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
