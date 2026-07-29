import { cookies } from "next/headers";
import crypto from "crypto";

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

const SESSION_COOKIE_NAME = "session";
const USER_ID_COOKIE_NAME = "userId";
const CSRF_COOKIE_NAME = "csrf_token";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const sessionStore = new Map<string, { userId: string; createdAt: number }>();
const csrfTokenStore = new Map<string, Set<string>>();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX_ATTEMPTS = 10;
const rateLimitStore = new Map<string, number[]>();

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitStore.entries()) {
    const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
    if (valid.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, valid);
    }
  }
  for (const [key, { createdAt }] of sessionStore.entries()) {
    if (now - createdAt > SESSION_MAX_AGE * 1000) {
      sessionStore.delete(key);
      csrfTokenStore.delete(key);
    }
  }
}, 60000);

export function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = rateLimitStore.get(key) || [];
  const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);

  if (valid.length >= RATE_LIMIT_MAX_ATTEMPTS) {
    rateLimitStore.set(key, valid);
    return { allowed: false, remaining: 0 };
  }

  valid.push(now);
  rateLimitStore.set(key, valid);
  return { allowed: true, remaining: RATE_LIMIT_MAX_ATTEMPTS - valid.length };
}

function isValidIdFormat(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 255;
}

export async function generateSession(userId: string): Promise<void> {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const csrfToken = crypto.randomBytes(32).toString("hex");

  sessionStore.set(sessionToken, { userId, createdAt: Date.now() });
  if (!csrfTokenStore.has(sessionToken)) {
    csrfTokenStore.set(sessionToken, new Set());
  }
  csrfTokenStore.get(sessionToken)!.add(csrfToken);

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

  const validTokens = csrfTokenStore.get(sessionToken);
  if (!validTokens || !validTokens.has(cookieToken)) {
    return false;
  }

  if (formToken !== cookieToken) {
    return false;
  }

  validTokens.delete(cookieToken);
  return true;
}

export async function getSession(): Promise<Session> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(USER_ID_COOKIE_NAME)?.value;
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!userId || !sessionToken) {
    return {
      userId: "",
      user: null,
      isAuthenticated: false,
    };
  }

  if (!isValidIdFormat(userId)) {
    await clearSession();
    return {
      userId: "",
      user: null,
      isAuthenticated: false,
    };
  }

  const storedSession = sessionStore.get(sessionToken);
  if (!storedSession || storedSession.userId !== userId) {
    await clearSession();
    return {
      userId: "",
      user: null,
      isAuthenticated: false,
    };
  }

  if (Date.now() - storedSession.createdAt > SESSION_MAX_AGE * 1000) {
    await clearSession();
    return {
      userId: "",
      user: null,
      isAuthenticated: false,
    };
  }

  const { prisma } = await import("./prisma");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      country: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    await clearSession();
    return {
      userId: "",
      user: null,
      isAuthenticated: false,
    };
  }

  return {
    userId,
    user,
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
    sessionStore.delete(sessionToken);
    csrfTokenStore.delete(sessionToken);
  }

  cookieStore.delete({
    name: SESSION_COOKIE_NAME,
    path: "/",
  });

  cookieStore.delete({
    name: USER_ID_COOKIE_NAME,
    path: "/",
  });

  cookieStore.delete({
    name: CSRF_COOKIE_NAME,
    path: "/",
  });
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