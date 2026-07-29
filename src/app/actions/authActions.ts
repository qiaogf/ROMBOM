"use server";

import { prisma } from "@/lib/prisma";
import { generateSession, clearSession, getCurrentUserId as getCurrentUserIdFromAuth, checkRateLimit, sanitizeInput, sanitizeEmail } from "@/lib/auth";
import crypto from "crypto";

export { getCurrentUserIdFromAuth as getCurrentUserId };

export interface AuthResult {
  success: boolean;
  message: string;
  userId?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  country?: string;
  phone?: string;
}

const RATE_LIMIT_WINDOW_MS = 60000;
const MAX_LOGIN_ATTEMPTS = 5;
const loginAttempts = new Map<string, { count: number; lockUntil: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of loginAttempts.entries()) {
    if (now > value.lockUntil && value.count === 0) {
      loginAttempts.delete(key);
    }
  }
}, 30000);

function validateEmailFormat(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

function validatePasswordStrength(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" };
  }
  if (password.length > 128) {
    return { valid: false, message: "Password is too long" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" };
  }
  return { valid: true, message: "" };
}

function checkLoginRateLimit(email: string): { allowed: boolean; message: string } {
  const now = Date.now();
  const record = loginAttempts.get(email);

  if (record) {
    if (now < record.lockUntil) {
      const waitMinutes = Math.ceil((record.lockUntil - now) / 60000);
      return {
        allowed: false,
        message: `Too many login attempts. Please try again in ${waitMinutes} minute(s).`,
      };
    }
    if (record.count >= MAX_LOGIN_ATTEMPTS) {
      loginAttempts.set(email, { count: 0, lockUntil: now + RATE_LIMIT_WINDOW_MS });
      return {
        allowed: false,
        message: `Too many login attempts. Please try again in 1 minute.`,
      };
    }
  }

  return { allowed: true, message: "" };
}

function recordLoginAttempt(email: string, success: boolean): void {
  const now = Date.now();
  const record = loginAttempts.get(email) || { count: 0, lockUntil: 0 };

  if (success) {
    loginAttempts.delete(email);
    return;
  }

  record.count += 1;
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    record.lockUntil = now + RATE_LIMIT_WINDOW_MS;
    record.count = 0;
  }
  loginAttempts.set(email, record);
}

export async function register(data: RegisterData): Promise<AuthResult> {
  try {
    const rawEmail = data.email;
    const rawPassword = data.password;
    const rawFirstName = data.firstName;
    const rawLastName = data.lastName;
    const rawCountry = data.country;
    const rawPhone = data.phone;

    if (!rawEmail || !rawPassword || !rawFirstName || !rawLastName) {
      return { success: false, message: "All required fields must be filled" };
    }

    const email = sanitizeEmail(rawEmail);
    if (!validateEmailFormat(email)) {
      return { success: false, message: "Please enter a valid email address" };
    }

    const passwordValidation = validatePasswordStrength(rawPassword);
    if (!passwordValidation.valid) {
      return { success: false, message: passwordValidation.message };
    }

    const firstName = sanitizeInput(rawFirstName, 50);
    const lastName = sanitizeInput(rawLastName, 50);
    const country = rawCountry ? sanitizeInput(rawCountry.toUpperCase(), 2) : "US";
    const phone = rawPhone ? sanitizeInput(rawPhone, 30) : undefined;

    if (!firstName || !lastName) {
      return { success: false, message: "Name fields contain invalid characters" };
    }

    const rateLimit = checkRateLimit(`register:${email}`);
    if (!rateLimit.allowed) {
      return { success: false, message: "Too many registration attempts. Please try again later." };
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return { success: false, message: "Email already registered" };
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = crypto.scryptSync(rawPassword, salt, 64).toString("hex") + ":" + salt;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        country,
        currency: "USD",
        phone,
        isActive: true,
        role: "CUSTOMER",
      },
    });

    await generateSession(user.id);

    return { success: true, message: "Registration successful", userId: user.id };
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, message: "An unexpected error occurred. Please try again later." };
  }
}

export interface LoginData {
  email: string;
  password: string;
}

export async function login(data: LoginData): Promise<AuthResult> {
  try {
    const rawEmail = data.email;
    const rawPassword = data.password;

    if (!rawEmail || !rawPassword) {
      return { success: false, message: "Email and password are required" };
    }

    const email = sanitizeEmail(rawEmail);
    if (!validateEmailFormat(email)) {
      return { success: false, message: "Please enter a valid email address" };
    }

    const rateLimit = checkRateLimit(`login:${email}`);
    if (!rateLimit.allowed) {
      return { success: false, message: "Too many login attempts. Please try again later." };
    }

    const loginRateLimit = checkLoginRateLimit(email);
    if (!loginRateLimit.allowed) {
      return { success: false, message: loginRateLimit.message };
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      recordLoginAttempt(email, false);
      return { success: false, message: "Invalid email or password" };
    }

    if (!user.isActive) {
      return { success: false, message: "Account is not active. Please contact support." };
    }

    const [hash, salt] = user.passwordHash.split(":");
    if (!hash || !salt) {
      return { success: false, message: "Invalid account data" };
    }

    const computedHash = crypto.scryptSync(rawPassword, salt, 64).toString("hex");
    const isPasswordValid = hash === computedHash;

    if (!isPasswordValid) {
      recordLoginAttempt(email, false);
      return { success: false, message: "Invalid email or password" };
    }

    recordLoginAttempt(email, true);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await generateSession(user.id);

    return { success: true, message: "Login successful", userId: user.id };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, message: "An unexpected error occurred. Please try again later." };
  }
}

export async function logout(): Promise<AuthResult> {
  try {
    await clearSession();
    return { success: true, message: "Logout successful" };
  } catch (error) {
    console.error("Logout error:", error);
    return { success: false, message: "An unexpected error occurred during logout." };
  }
}