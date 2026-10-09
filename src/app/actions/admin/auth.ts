"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { isHttpsRequest } from "@/lib/auth";

const ADMIN_COOKIE = "admin_session";
const ROLE_COOKIE = "user_role";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export interface AdminLoginResult {
  success: boolean;
  message: string;
  adminId?: string;
  email?: string;
  name?: string;
}

/**
 * 管理员登录 — Server Action
 * 与 auth-admin.ts 的 adminLogin 保持一致（SHA-256 校验），
 * 但作为 Server Action 可被弹窗直接调用。
 */
export async function adminLoginAction(formData: FormData): Promise<AdminLoginResult> {
  const rawEmail = (formData.get("email") as string)?.trim() || "";
  const rawPassword = (formData.get("password") as string) || "";

  if (!rawEmail || !rawPassword) {
    return { success: false, message: "Email and password are required." };
  }

  const email = rawEmail.toLowerCase();

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !admin.isActive) {
    return { success: false, message: "Invalid email or password." };
  }

  const crypto = await import("crypto");
  const hash = crypto.createHash("sha256").update(rawPassword).digest("hex");
  if (hash !== admin.passwordHash) {
    return { success: false, message: "Invalid email or password." };
  }

  const cookieStore = await cookies();
  const secureCookie = await isHttpsRequest();
  cookieStore.set({
    name: ADMIN_COOKIE,
    value: admin.adminId,
    httpOnly: true,
    secure: secureCookie,
    sameSite: "strict" as const,
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
  cookieStore.set({
    name: ROLE_COOKIE,
    value: "admin",
    httpOnly: true,
    secure: secureCookie,
    sameSite: "strict" as const,
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  await prisma.adminUser.update({
    where: { adminId: admin.adminId },
    data: { role: "admin" },
  });

  return {
    success: true,
    message: "Login successful.",
    adminId: admin.adminId,
    email: admin.email,
    name: admin.name ?? undefined,
  };
}

// ── Admin 自助注册（Create login） ──
export async function adminRegister(formData: FormData): Promise<{ success: boolean; message: string; adminId?: string }> {
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const password = (formData.get("password") as string) || "";
  const name = ((formData.get("name") as string) || "").trim();

  if (!email || !password || !name) {
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
  const [existing, usedByCustomer, usedBySupplier] = await Promise.all([
    prisma.adminUser.findUnique({ where: { email } }),
    prisma.customer.findUnique({ where: { email } }),
    prisma.supplier.findUnique({ where: { email } }),
  ]);
  if (existing) {
    return { success: false, message: "An account with this email already exists. Please log in." };
  }
  if (usedByCustomer || usedBySupplier) {
    return { success: false, message: "This email is already registered. Please use a different email or log in." };
  }

  try {
    const admin = await prisma.adminUser.create({
      data: {
        email,
        passwordHash,
        name,
        isActive: true,
        role: "admin",
      },
    });
    return { success: true, message: "Registration successful.", adminId: admin.adminId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Registration failed: ${msg}` };
  }
}
