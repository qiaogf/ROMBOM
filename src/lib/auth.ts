import { cookies } from "next/headers";
import crypto from "crypto";
import { PrismaClient } from "@/../prisma/generated/client";

const SESSION_COOKIE_NAME = "session";
const USER_ID_COOKIE_NAME = "userId";
const CSRF_COOKIE_NAME = "csrf_token";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function isValidIdFormat(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 255;
}

async function getPrisma(): Promise<PrismaClient> {
  const { prisma } = await import("./prisma");
  return prisma as unknown as PrismaClient;
}

export async function generateSession(userId: string): Promise<void> {
  const prisma = await getPrisma();
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const csrfToken = crypto.randomBytes(32).toString("hex");

  await prisma.session.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  });

  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      csrfToken,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000),
    },
  });

  const cookieStore = await cookies();

  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  cookieStore.set({
    name: USER_ID_COOKIE_NAME,
    value: userId,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  cookieStore.set({
    name: CSRF_COOKIE_NAME,
    value: csrfToken,
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_MAX_AGE,
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
      userId: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
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

  if (!session.user || !session.user.isActive) {
    await clearSession();
    return {
      userId: "",
      user: null,
      isAuthenticated: false,
    };
  }

  return {
    userId: session.userId,
    user: session.user,
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
  cookieStore.delete({ name: USER_ID_COOKIE_NAME, path: "/" });
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
  firstName: string;
  lastName: string;
  country: string | null;
  isActive: boolean;
}

export interface Session {
  userId: string;
  user: SessionUser | null;
  isAuthenticated: boolean;
}