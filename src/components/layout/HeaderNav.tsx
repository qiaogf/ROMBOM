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
import type { AccountRole } from "./AuthModal";

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

  const handleLoggedIn = useCallback(
    (role?: AccountRole) => {
      setShowLogin(false);
      void rehydrate();
      void refreshUser();
      // 统一登录：按角色进入各自入口
      if (role === "admin") {
        router.push("/admin/import-price");
      } else if (role === "supplier") {
        router.push("/supplier/import-price");
      } else {
        // 客户登录后立即同步购物车徽标并按需求直接进入购物车页
        router.push("/cart");
      }
    },
    [rehydrate, refreshUser, router]
  );

  const handleLogout = useCallback(async () => {
    await logout();
    setUserName(null);
    void rehydrate();
    // 登出后直接返回主页
    router.push("/");
  }, [rehydrate, router]);

  return (
    <div className="flex items-center gap-1 sm:gap-4 shrink-0" style={arialFont}>
      {/* (0) WhatsApp Business → 新窗口（移动端只显图标，sm+ 显文字） */}
      <a
        href="https://wa.me/message/SKKBNNB4X4JYK1"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp Business"
        title="WhatsApp Business"
        className="min-h-[44px] w-9 sm:w-auto -mx-1 sm:-mx-2 px-1 sm:px-2 text-[#666666] hover:opacity-80 whitespace-nowrap inline-flex items-center justify-center gap-1"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="w-5 h-5 sm:w-4 sm:h-4">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <span className="hidden sm:inline text-[12px]">WhatsApp</span>
      </a>

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
