"use server";

// Supplier auth actions — login + self-register.
// Cookie/session consts live here (auth-scoped); batch.ts uses getSupplierSession for authorization.

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { isHttpsRequest } from "@/lib/auth";

const SUPPLIER_COOKIE = "supplier_session";
const ROLE_COOKIE = "user_role";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export interface SupplierLoginResult {
  success: boolean;
  message: string;
  supplierId?: string;
  supplierName?: string;
}

/**
 * 供应商登录 — Server Action
 * 调用 auth-admin.ts 的 supplierLogin 会抛错（cookies() 只能在 Server Action 中安全调用），
 * 因此在此独立实现，逻辑与 auth-admin.ts 保持一致。
 */
export async function supplierLoginAction(formData: FormData): Promise<SupplierLoginResult> {
  const rawEmail = (formData.get("email") as string)?.trim() || "";
  const rawPassword = (formData.get("password") as string) || "";

  if (!rawEmail || !rawPassword) {
    return { success: false, message: "Email and password are required." };
  }

  const email = rawEmail.toLowerCase();

  const supplier = await prisma.supplier.findUnique({
    where: { email },
  });
  if (!supplier) {
    return { success: false, message: "Invalid email or password." };
  }
  if (!supplier.isActive) {
    // 从未登录过的停用账号 = 待 Super Admin 审核；登录过的 = 被停用
    const pending = !supplier.lastLoginAt;
    return {
      success: false,
      message: pending
        ? "Your account is pending approval by the super admin. You can log in once it is confirmed."
        : "Account is not active. Please contact support.",
    };
  }

  // SHA-256 校验（与 auth-admin.ts 中 supplierLogin 保持一致）
  const crypto = await import("crypto");
  const hash = crypto.createHash("sha256").update(rawPassword).digest("hex");
  if (hash !== supplier.passwordHash) {
    return { success: false, message: "Invalid email or password." };
  }

  const cookieStore = await cookies();
  const secureCookie = await isHttpsRequest();
  cookieStore.set({
    name: SUPPLIER_COOKIE,
    value: supplier.supplierId,
    httpOnly: true,
    secure: secureCookie,
    sameSite: "strict" as const,
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
  cookieStore.set({
    name: ROLE_COOKIE,
    value: "supplier",
    httpOnly: true,
    secure: secureCookie,
    sameSite: "strict" as const,
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  await prisma.supplier.update({
    where: { supplierId: supplier.supplierId },
    data: { lastLoginAt: new Date() },
  });

  return {
    success: true,
    message: "Login successful.",
    supplierId: supplier.supplierId,
    supplierName: supplier.supplierName,
  };
}

// ── Supplier 自助注册（Create login） ──
export interface SupplierRegisterResult {
  success: boolean;
  message: string;
  supplierId?: string;
}

export async function supplierRegister(formData: FormData): Promise<SupplierRegisterResult> {
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const password = (formData.get("password") as string) || "";
  // name / email / password 三项均为必填；supplierName 直接取 name
  const supplierName = ((formData.get("name") as string) || "").trim();

  if (!email || !password || !supplierName) {
    return { success: false, message: "Name, email, and password are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: "Please enter a valid email address." };
  }
  if (password.length < 8) {
    return { success: false, message: "Password must be at least 8 characters." };
  }

  const crypto = await import("crypto");
  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");

  // 邮箱唯一（三表联合校验，并行查询）
  const [usedByAdmin, usedByCustomer, usedBySupplier] = await Promise.all([
    prisma.adminUser.findUnique({ where: { email } }),
    prisma.customer.findUnique({ where: { email } }),
    prisma.supplier.findUnique({ where: { email } }),
  ]);
  if (usedByAdmin || usedByCustomer || usedBySupplier) {
    return { success: false, message: "This email is already registered. Please use a different email or log in." };
  }

  try {
    const supplier = await prisma.supplier.create({
      // 新注册默认停用：须 Super Admin 在 Admin → Supplier Confirm 后才能登录
      data: { supplierName, email, passwordHash, name: supplierName, isActive: false },
    });

    return {
      success: true,
      message: "Registration successful. Your account is pending approval by the super admin — you can log in once it is confirmed.",
      supplierId: supplier.supplierId,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Registration failed: ${msg}` };
  }
}
