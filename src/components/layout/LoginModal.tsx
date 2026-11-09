"use client";

/**
 * 统一登录弹窗 — customer / supplier / admin 共用
 * 登录成功后按返回的角色由父组件决定跳转目标
 */
import { AuthModal, type AccountRole, type AuthView, type AuthSubmitResult } from "./AuthModal";
import { loginUnified, registerUnified } from "@/app/actions/authActions";

interface LoginModalProps {
  onClose: () => void;
  /** 登录成功回调（role 用于区分 customer / supplier / admin 的跳转） */
  onLoggedIn: (role?: AccountRole) => void;
  /** 初始视图（login/register），用于页面内直接以指定视图打开弹窗 */
  initialView?: AuthView;
}

export function LoginModal({ onClose, onLoggedIn, initialView }: LoginModalProps) {
  return (
    <AuthModal
      idPrefix="account"
      initialView={initialView}
      login={async (input): Promise<AuthSubmitResult> =>
        loginUnified({ email: input.email, password: input.password, stayLoggedIn: input.stayLoggedIn })
      }
      register={async (input): Promise<AuthSubmitResult> =>
        registerUnified({
          email: input.email,
          password: input.password,
          accountRole: input.accountRole ?? "customer",
        })
      }
      onLoginSuccess={onLoggedIn}
      onClose={onClose}
    />
  );
}
