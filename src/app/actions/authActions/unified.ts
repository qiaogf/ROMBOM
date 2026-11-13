"use server";

// 统一登录 / 注册（customer / supplier / admin 共用同一弹窗）。

import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { generateSession, isHttpsRequest } from "@/lib/auth";
import {
  validateEmailFormat,
  verifyPassword,
  checkLoginRateLimit,
  recordLoginAttempt,
  getClientIP,
  sanitizeEmail,
} from "@/lib/security";
import { supplierRegister } from "@/app/actions/supplier/auth";
import { adminRegister } from "@/app/actions/admin/auth";
import { register } from "./customer";
import type {
  AuthResult,
  LoginData,
  UnifiedLoginResult,
  UnifiedRegisterData,
} from "./shared";

const SUPPLIER_COOKIE = "supplier_session";
const ADMIN_COOKIE = "admin_session";
const ROLE_COOKIE = "user_role";
const ROLE_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const sha256Hex = (value: string): string =>
  crypto.createHash("sha256").update(value).digest("hex");

/**
 * 按邮箱自动识别角色：customer（scrypt）/ supplier、admin（SHA-256）
 * 三种账号邮箱互斥，命中即返回对应角色并写入各自的会话 Cookie
 */
export async function loginUnified(data: LoginData): Promise<UnifiedLoginResult> {
  try {
    const rawEmail = data.email;
    const rawPassword = data.password;
    const stayLoggedIn = data.stayLoggedIn ?? true;

    if (!rawEmail || !rawPassword) {
      return { success: false, message: "Email and password are required" };
    }

    const email = sanitizeEmail(rawEmail);
    if (!validateEmailFormat(email)) {
      return { success: false, message: "Please enter a valid email address" };
    }

    const [customer, supplier, admin] = await Promise.all([
      prisma.customer.findUnique({ where: { email } }),
      prisma.supplier.findUnique({ where: { email } }),
      prisma.adminUser.findUnique({ where: { email } }),
    ]);

    // ── Customer：沿用原有速率限制 + scrypt 校验 ──
    if (customer) {
      const clientIp = getClientIP(await headers());
      const rateLimitCheck = checkLoginRateLimit(email, clientIp);
      if (!rateLimitCheck.allowed) {
        const minutes = Math.ceil(rateLimitCheck.lockoutTime / 60);
        return {
          success: false,
          message: `Too many login attempts. Please try again in ${minutes} minute(s).`,
        };
      }
      if (!customer.isActive) {
        // 从未登录过的停用账号 = 待 Super Admin 审核；登录过的 = 被停用
        const pending = !customer.lastLoginAt;
        return {
          success: false,
          message: pending
            ? "Your account is pending approval by the super admin. You can log in once it is confirmed."
            : "Account is not active. Please contact support.",
        };
      }
      if (!verifyPassword(rawPassword, customer.passwordHash)) {
        recordLoginAttempt(email, clientIp, false);
        return { success: false, message: "Invalid email or password" };
      }

      recordLoginAttempt(email, clientIp, true);
      await prisma.customer.update({
        where: { customerId: customer.customerId },
        data: { lastLoginAt: new Date() },
      });
      await generateSession(customer.customerId, { persistent: stayLoggedIn });

      const { setCustomerRoleCookie } = await import("@/lib/auth-admin");
      await setCustomerRoleCookie();

      return {
        success: true,
        message: "Login successful",
        role: "customer",
        userId: customer.customerId,
      };
    }

    const cookieStore = await cookies();
    const secureCookie = await isHttpsRequest();

    // ── Supplier ──
    if (supplier && !supplier.isActive) {
      // 从未登录过的停用账号 = 待 Super Admin 审核；登录过的 = 被停用
      const pending = !supplier.lastLoginAt;
      return {
        success: false,
        message: pending
          ? "Your account is pending approval by the super admin. You can log in once it is confirmed."
          : "Account is not active. Please contact support.",
      };
    }
    if (supplier && supplier.isActive && sha256Hex(rawPassword) === supplier.passwordHash) {
      cookieStore.set({
        name: SUPPLIER_COOKIE,
        value: supplier.supplierId,
        httpOnly: true,
        secure: secureCookie,
        sameSite: "strict" as const,
        maxAge: ROLE_SESSION_MAX_AGE,
        path: "/",
      });
      cookieStore.set({
        name: ROLE_COOKIE,
        value: "supplier",
        httpOnly: true,
        secure: secureCookie,
        sameSite: "strict" as const,
        maxAge: ROLE_SESSION_MAX_AGE,
        path: "/",
      });

      await prisma.supplier.update({
        where: { supplierId: supplier.supplierId },
        data: { lastLoginAt: new Date() },
      });

      return {
        success: true,
        message: "Login successful",
        role: "supplier",
        userId: supplier.supplierId,
      };
    }

    // ── Admin ──
    if (admin && !admin.isActive) {
      // AdminUser 无 lastLoginAt，无法区分"待审"与"被停用"，统一提示
      return {
        success: false,
        message: "Account is not active. It is either pending super-admin approval or has been deactivated.",
      };
    }
    if (admin && admin.isActive && sha256Hex(rawPassword) === admin.passwordHash) {
      cookieStore.set({
        name: ADMIN_COOKIE,
        value: admin.adminId,
        httpOnly: true,
        secure: secureCookie,
        sameSite: "strict" as const,
        maxAge: ROLE_SESSION_MAX_AGE,
        path: "/",
      });
      cookieStore.set({
        name: ROLE_COOKIE,
        value: "admin",
        httpOnly: true,
        secure: secureCookie,
        sameSite: "strict" as const,
        maxAge: ROLE_SESSION_MAX_AGE,
        path: "/",
      });

      await prisma.adminUser.update({
        where: { adminId: admin.adminId },
        data: { role: "admin" },
      });

      return {
        success: true,
        message: "Login successful",
        role: "admin",
        userId: admin.adminId,
      };
    }

    return { success: false, message: "Invalid email or password" };
  } catch (error) {
    console.error("Unified login error:", error);
    return { success: false, message: "An unexpected error occurred. Please try again later." };
  }
}

/**
 * 统一注册入口：按 Account Type 分发到 customer / supplier / admin 注册逻辑。
 * 注册弹窗已用 Account Type 替代 Name，展示名取邮箱前缀。
 */
export async function registerUnified(data: UnifiedRegisterData): Promise<AuthResult> {
  const derivedName = data.email.trim().split("@")[0]?.trim() || "Member";

  if (data.accountRole === "supplier") {
    const fd = new FormData();
    fd.set("email", data.email);
    fd.set("password", data.password);
    fd.set("name", derivedName);
    const res = await supplierRegister(fd);
    return { success: res.success, message: res.message };
  }

  if (data.accountRole === "admin") {
    const fd = new FormData();
    fd.set("email", data.email);
    fd.set("password", data.password);
    fd.set("name", derivedName);
    const res = await adminRegister(fd);
    return { success: res.success, message: res.message };
  }

  return register({ email: data.email, password: data.password, name: derivedName });
}
