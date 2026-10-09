"use client";

/**
 * /account/login — 与 admin 一致的弹窗登录方式
 * 直接渲染全局统一的 LoginModal（login 视图），不再使用独立全屏表单
 */
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { LoginModal } from "@/components/layout/LoginModal";
import { useCart } from "@/components/cart/CartProvider";

export default function LoginModalPage() {
  const router = useRouter();
  const { rehydrate } = useCart();

  const handleClose = useCallback(() => {
    router.push("/");
  }, [router]);

  const handleLoggedIn = useCallback(() => {
    void rehydrate();
    router.push("/");
    router.refresh();
  }, [rehydrate, router]);

  return (
    <LoginModal
      initialView="login"
      onClose={handleClose}
      onLoggedIn={handleLoggedIn}
    />
  );
}
