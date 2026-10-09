"use client";

/**
 * 布局客户端包装器
 *
 * 为什么需要单独拆文件？
 *   RootLayout 是 Server Component 不能用 'use client'。
 *   但我们需要在 body 级挂 Client Provider（CartProvider）——
 *   因为购物车徽标在 Header、加购操作在 Main，两者都必须能读到同一个 CartContext。
 *
 * 本组件承担：
 *   1) 全局唯一的 CartProvider（购物车状态跨路由不丢失 ✅）
 *   2) 透传 children（页面内容 = SSC 渲染产物，CC 接受完全无问题）
 */

import type { ReactNode } from "react";
import { CartProvider } from "@/components/cart/CartProvider";

export function LayoutClientShell({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
