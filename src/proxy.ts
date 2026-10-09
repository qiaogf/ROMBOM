import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 角色权限代理 — 路由级拦截
 *
 * 策略: 读取 httpOnly cookie `user_role` (由登录 server action 设置)
 *   - /admin/**    → 只允许 "admin"
 *   - /supplier/** → 只允许 "supplier"
 *   - /customer/** → 只允许 "customer"
 *   - 其他路由     → 公开放行
 *
 * 注意: proxy 运行在 Edge Runtime, 不能访问 Prisma/DB。
 *       实际 session 有效性由各页面 server-side 二次校验。
 */

const ROLE_COOKIE = "user_role";

// 不需要重定向的公开路径前缀
const PUBLIC_PREFIXES = ["/auth/", "/api/"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 确定需要校验的角色
  let requiredRole: string | null = null;
  let loginPath = "";

  if (pathname.startsWith("/admin")) {
    requiredRole = "admin";
    loginPath = "/auth/admin-login";
  } else if (pathname.startsWith("/supplier")) {
    requiredRole = "supplier";
    loginPath = "/auth/supplier-login";
  } else if (pathname.startsWith("/customer")) {
    requiredRole = "customer";
    loginPath = "/auth/customer-login";
  }

  // 公开路由或无角色要求 → 放行
  if (!requiredRole || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const role = request.cookies.get(ROLE_COOKIE)?.value;

  // 无角色 cookie → 跳转对应登录页
  if (!role) {
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // 角色不匹配 → 跳转对应登录页
  if (role !== requiredRole) {
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/supplier/:path*", "/customer/:path*"],
};
