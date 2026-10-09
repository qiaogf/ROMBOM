"use client";

/**
 * Supplier 登录弹窗 — 统一 AuthModal 的 supplier 配置
 * 登录成功后跳转 /supplier/import-price
 */
import { useRouter } from "next/navigation";
import { AuthModal, authInputToFormData } from "./AuthModal";
import { supplierLoginAction, supplierRegister } from "@/app/actions/supplierActions";

export function SupplierLoginModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  return (
    <AuthModal
      idPrefix="supplier"
      login={(input) => supplierLoginAction(authInputToFormData(input))}
      register={(input) => supplierRegister(authInputToFormData(input))}
      onLoginSuccess={() => {
        onClose();
        router.refresh();
        router.push("/supplier/import-price");
      }}
      onClose={onClose}
    />
  );
}
