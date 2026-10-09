"use client";

/**
 * Admin 登录弹窗 — 统一 AuthModal 的 admin 配置
 * 登录成功后跳转 /admin/import-price
 */
import { useRouter } from "next/navigation";
import { AuthModal, authInputToFormData } from "./AuthModal";
import { adminLoginAction, adminRegister } from "@/app/actions/adminActions";

export function AdminLoginModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  return (
    <AuthModal
      idPrefix="admin"
      login={(input) => adminLoginAction(authInputToFormData(input))}
      register={(input) => adminRegister(authInputToFormData(input))}
      onLoginSuccess={() => {
        onClose();
        router.refresh();
        router.push("/admin/import-price");
      }}
      onClose={onClose}
    />
  );
}
