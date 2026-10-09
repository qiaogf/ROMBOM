"use client";

/**
 * Customer 登录弹窗 — 统一 AuthModal 的 customer 配置
 * 登录成功后交由父组件处理（刷新购物车、跳转）
 */
import { AuthModal, type AuthView, type AuthSubmitResult } from "./AuthModal";
import { login, register } from "@/app/actions/authActions";

interface LoginModalProps {
  onClose: () => void;
  /** 登录成功回调（父组件负责刷新页面与购物车） */
  onLoggedIn: () => void;
  /** 初始视图，用于 /account/login、/account/register 直接以弹窗形式呈现 */
  initialView?: AuthView;
}

export function LoginModal({ onClose, onLoggedIn, initialView }: LoginModalProps) {
  return (
    <AuthModal
      idPrefix="customer"
      initialView={initialView}
      login={async (input): Promise<AuthSubmitResult> =>
        login({ email: input.email, password: input.password, stayLoggedIn: input.stayLoggedIn })
      }
      register={async (input): Promise<AuthSubmitResult> =>
        register({ email: input.email, password: input.password, name: input.name })
      }
      onLoginSuccess={onLoggedIn}
      onClose={onClose}
    />
  );
}
