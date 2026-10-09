"use client";

/**
 * /account/register — 与 admin 一致的弹窗注册方式
 * 直接渲染全局统一的 LoginModal（register 视图），不再使用独立全屏表单
 * 注册成功后弹窗内自动切回 login 视图（与 admin 行为一致）
 */
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { LoginModal } from "@/components/layout/LoginModal";
import { useCart } from "@/components/cart/CartProvider";

export default function RegisterModalPage() {
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
      initialView="register"
      onClose={handleClose}
      onLoggedIn={handleLoggedIn}
    />
  );
}
