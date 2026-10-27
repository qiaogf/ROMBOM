import { cookies, headers } from "next/headers";
import crypto from "crypto";
import { PrismaClient } from "@/../prisma/generated/client";

const SESSION_COOKIE_NAME = "session";
const CSRF_COOKIE_NAME = "csrf_token";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/**
 * 根据实际请求协议判断是否标记 secure。
 * 不能用 NODE_ENV：局域网 next start（HTTP）下 secure cookie 会被浏览器丢弃，
 * 导致登录态无法保持。Vercel/HTTPS 部署时 x-forwarded-proto 为 https → secure=true。
 */
export async function isHttpsRequest(): Promise<boolean> {
  try {
    const h = await headers();
    const proto = (h.get("x-forwarded-proto") || "").split(",")[0].trim();
    return proto === "https";
  } catch {
    return false;
  }
}

async function getPrisma(): Promise<PrismaClient> {
  const { prisma } = await import("./prisma");
  return prisma as unknown as PrismaClient;
}

export async function generateSession(
  customerId: string,
  options?: { persistent?: boolean }
): Promise<void> {
  // persistent=false 时为会话级 Cookie（浏览器关闭即失效），对应"Stay logged in"未勾选
  const persistent = options?.persistent ?? true;
  const prisma = await getPrisma();
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const csrfToken = crypto.randomBytes(32).toString("hex");

  await prisma.session.deleteMany({
    where: { customerId, expiresAt: { lt: new Date() } },
  });

  await prisma.session.create({
    data: {
      sessionToken,
      customerId,
      csrfToken,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000),
    },
  });

  const cookieStore = await cookies();
  const secureCookie = await isHttpsRequest();

  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    secure: secureCookie,
    sameSite: "strict" as const,
    ...(persistent ? { maxAge: SESSION_MAX_AGE } : {}),
    path: "/",
  });

  cookieStore.set({
    name: CSRF_COOKIE_NAME,
    value: csrfToken,
    httpOnly: false,
    secure: secureCookie,
    sameSite: "lax" as const,
    ...(persistent ? { maxAge: SESSION_MAX_AGE } : {}),
    path: "/",
  });
}

export async function validateCSRFToken(formToken?: string): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!formToken || !cookieToken || !sessionToken) {
    return false;
  }

  const prisma = await getPrisma();
  const session = await prisma.session.findUnique({
    where: { sessionToken },
    select: { csrfToken: true, expiresAt: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return false;
  }

  if (formToken !== cookieToken || cookieToken !== session.csrfToken) {
    return false;
  }

  return true;
}

export async function getSession(): Promise<Session> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return {
      userId: "",
      user: null,
      isAuthenticated: false,
    };
  }

  const prisma = await getPrisma();

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    select: {
      customerId: true,
      expiresAt: true,
      customer: {
        select: {
          customerId: true,
          email: true,
          firstName: true,
          lastName: true,
          country: true,
          isActive: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await clearSession();
    }
    return {
      userId: "",
      user: null,
      isAuthenticated: false,
    };
  }

  if (!session.customer || !session.customer.isActive) {
    await clearSession();
    return {
      userId: "",
      user: null,
      isAuthenticated: false,
    };
  }

  return {
    userId: session.customerId,
    user: {
      id: session.customer.customerId,
      email: session.customer.email,
      firstName: session.customer.firstName,
      lastName: session.customer.lastName,
      country: session.customer.country,
      isActive: session.customer.isActive,
    },
    isAuthenticated: true,
  };
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session.isAuthenticated ? session.userId : null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session.user;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    const prisma = await getPrisma();
    await prisma.session.deleteMany({
      where: { sessionToken },
    });
  }

  cookieStore.delete({ name: SESSION_COOKIE_NAME, path: "/" });
  cookieStore.delete({ name: CSRF_COOKIE_NAME, path: "/" });
}

export function isAuthenticated(): Promise<boolean> {
  return getSession().then((session) => session.isAuthenticated);
}

export function sanitizeInput(input: string, maxLength: number): string {
  let sanitized = input.replace(/[<>]/g, "");
  sanitized = sanitized.replace(/javascript:/gi, "");
  sanitized = sanitized.replace(/on\w+\s*=/gi, "");
  sanitized = sanitized.trim();
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  return sanitized;
}

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface SessionUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  country: string | null;
  isActive: boolean;
}

export interface Session {
  userId: string;
  user: SessionUser | null;
  isAuthenticated: boolean;
}