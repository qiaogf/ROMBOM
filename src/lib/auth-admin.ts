import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { isHttpsRequest } from "./auth";
import {
  hashPassword,
  verifyPasswordLegacyCompatible,
  signSessionToken,
  verifySessionToken,
} from "./security";

/**
 * 管理员 / 供应商认证模块
 *
 * 与客户认证 (auth.ts) 分离，使用独立 cookie:
 *   - admin_session     → AdminUser 会话 token
 *   - supplier_session  → SupplierUser 会话 token
 *   - user_role         → 当前登录角色 (admin/supplier/customer)
 *
 * middleware.ts 读取 user_role cookie 做路由拦截，
 * 各页面通过 getAdminSession / getSupplierSession 做数据库二次校验。
 */

const ADMIN_COOKIE = "admin_session";
const SUPPLIER_COOKIE = "supplier_session";
const ROLE_COOKIE = "user_role";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7天

/**
 * 最高管理者邮箱 — 仅此账号对其他管理员拥有审核权
 * （Confirm 启用 / Reject 停用 / Delete 删除）。
 * 该账号本身不可被停用或删除。
 */
export const SUPER_ADMIN_EMAIL = "406756076@qq.com";

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

// ── Admin ──

export async function adminLogin(email: string, password: string) {
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !admin.isActive) return null;

  // 密码验证：兼容旧 SHA-256，成功后自动升级为 scrypt+salt
  const { valid, needsUpgrade } = verifyPasswordLegacyCompatible(password, admin.passwordHash);
  if (!valid) return null;
  if (needsUpgrade) {
    await prisma.adminUser.update({
      where: { adminId: admin.adminId },
      data: { passwordHash: hashPassword(password) },
    });
  }

  // Session cookie 用 HMAC 签名 token，防止伪造 adminId
  const cookieStore = await cookies();
  const secureCookie = await isHttpsRequest();

  cookieStore.set({
    name: ADMIN_COOKIE,
    value: signSessionToken(admin.adminId),
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

  return { adminId: admin.adminId, email: admin.email, name: admin.name };
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(ADMIN_COOKIE)?.value;
  const role = cookieStore.get(ROLE_COOKIE)?.value;

  if (!adminToken || role !== "admin") return null;

  // 验证签名 token，防止伪造
  const adminId = verifySessionToken(adminToken);
  if (!adminId) return null;

  const admin = await prisma.adminUser.findUnique({
    where: { adminId },
    select: { adminId: true, email: true, name: true, role: true, isActive: true },
  });

  if (!admin || !admin.isActive) {
    return null;
  }

  return admin;
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete({ name: ADMIN_COOKIE, path: "/" });
  cookieStore.delete({ name: ROLE_COOKIE, path: "/" });
}

// ── Supplier ──

export async function supplierLogin(email: string, password: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { email },
    include: { brands: true },
  });
  if (!supplier || !supplier.isActive) return null;

  // 密码验证：兼容旧 SHA-256，成功后自动升级为 scrypt+salt
  const { valid, needsUpgrade } = verifyPasswordLegacyCompatible(password, supplier.passwordHash);
  if (!valid) return null;
  if (needsUpgrade) {
    await prisma.supplier.update({
      where: { supplierId: supplier.supplierId },
      data: { passwordHash: hashPassword(password) },
    });
  }

  const cookieStore = await cookies();
  const secureCookie = await isHttpsRequest();

  cookieStore.set({
    name: SUPPLIER_COOKIE,
    value: signSessionToken(supplier.supplierId),
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
    supplierId: supplier.supplierId,
    email: supplier.email,
    name: supplier.name,
    supplierName: supplier.supplierName,
    brandIds: supplier.brands.map((b) => b.brandId),
  };
}

export async function getSupplierSession() {
  const cookieStore = await cookies();
  const supplierToken = cookieStore.get(SUPPLIER_COOKIE)?.value;
  const role = cookieStore.get(ROLE_COOKIE)?.value;

  if (!supplierToken || role !== "supplier") return null;

  // 验证签名 token，防止伪造
  const supplierId = verifySessionToken(supplierToken);
  if (!supplierId) return null;

  const supplier = await prisma.supplier.findUnique({
    where: { supplierId },
    include: {
      brands: { select: { brandId: true, brandName: true, slug: true } },
    },
  });

  if (!supplier || !supplier.isActive) {
    return null;
  }

  return {
    supplierId: supplier.supplierId,
    email: supplier.email,
    name: supplier.name,
    supplierName: supplier.supplierName,
    brandIds: supplier.brands.map((b) => b.brandId),
    brands: supplier.brands,
  };
}

export async function clearSupplierSession() {
  const cookieStore = await cookies();
  cookieStore.delete({ name: SUPPLIER_COOKIE, path: "/" });
  cookieStore.delete({ name: ROLE_COOKIE, path: "/" });
}

// ── Customer role cookie (与现有 auth.ts 互补) ──

export async function setCustomerRoleCookie() {
  const cookieStore = await cookies();
  const secureCookie = await isHttpsRequest();
  cookieStore.set({
    name: ROLE_COOKIE,
    value: "customer",
    httpOnly: true,
    secure: secureCookie,
    sameSite: "strict" as const,
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function clearRoleCookie() {
  const cookieStore = await cookies();
  cookieStore.delete({ name: ROLE_COOKIE, path: "/" });
}
