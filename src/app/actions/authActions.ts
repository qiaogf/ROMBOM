"use server";

import { prisma } from "@/lib/prisma";
import { generateSession, clearSession, getCurrentUserId as getCurrentUserIdFromAuth } from "@/lib/auth";
import {
  validateEmailFormat,
  hashPassword,
  verifyPassword,
  checkLoginRateLimit,
  recordLoginAttempt,
  validatePasswordStrength,
  sanitizeInput,
  sanitizeEmail
} from "@/lib/security";

export { getCurrentUserIdFromAuth as getCurrentUserId };

export interface AuthResult {
  success: boolean;
  message: string;
  userId?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  country?: string;
  phone?: string;
}

export async function register(data: RegisterData): Promise<AuthResult> {
  try {
    const rawEmail = data.email;
    const rawPassword = data.password;
    const rawName = data.name?.trim() ?? "";
    // 旧版 /auth/customer-register 页面仍会传入 country/phone；统一弹窗不传则留空
    const country = data.country?.trim() ? sanitizeInput(data.country.trim().toUpperCase(), 2) : null;
    const phone = data.phone?.trim() ? sanitizeInput(data.phone.trim(), 30) : null;

    // name / email / password 三项均为必填
    if (!rawEmail || !rawPassword || !rawName) {
      return { success: false, message: "Name, email, and password are required" };
    }

    const email = sanitizeEmail(rawEmail);
    if (!validateEmailFormat(email)) {
      return { success: false, message: "Please enter a valid email address" };
    }

    const passwordValidation = validatePasswordStrength(rawPassword);
    if (!passwordValidation.valid) {
      return { success: false, message: passwordValidation.message };
    }

    // 将单个 Name 拆分为 firstName / lastName 适配数据库模型
    const name = sanitizeInput(rawName, 100);
    if (!name) {
      return { success: false, message: "Name contains invalid characters" };
    }
    const parts = name.split(/\s+/);
    const firstName = parts[0] || name;
    const lastName = parts.slice(1).join(" ") || null;

    const existingCustomer = await prisma.customer.findUnique({ where: { email } });
    if (existingCustomer) {
      return { success: false, message: "Email already registered" };
    }

    const passwordHash = hashPassword(rawPassword);

    const customer = await prisma.customer.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        country,
        currency: "USD",
        phone,
        isActive: true,
      },
    });

    // 与 admin 一致：注册成功后不自动登录，由用户在登录视图手动登录
    return { success: true, message: "Registration successful", userId: customer.customerId };
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, message: "An unexpected error occurred. Please try again later." };
  }
}

export interface LoginData {
  email: string;
  password: string;
  clientIp?: string;
  /** 对应登录弹窗 "Stay logged in"：true（默认）→ 7 天持久化；false → 会话级 Cookie */
  stayLoggedIn?: boolean;
}

export async function login(data: LoginData): Promise<AuthResult> {
  try {
    const rawEmail = data.email;
    const rawPassword = data.password;
    const clientIp = data.clientIp || "unknown";
    const stayLoggedIn = data.stayLoggedIn ?? true;

    if (!rawEmail || !rawPassword) {
      return { success: false, message: "Email and password are required" };
    }

    const email = sanitizeEmail(rawEmail);
    if (!validateEmailFormat(email)) {
      return { success: false, message: "Please enter a valid email address" };
    }

    // 检查登录速率限制
    const rateLimitCheck = checkLoginRateLimit(email, clientIp);
    if (!rateLimitCheck.allowed) {
      const minutes = Math.ceil(rateLimitCheck.lockoutTime / 60);
      return {
        success: false,
        message: `Too many login attempts. Please try again in ${minutes} minute(s).`
      };
    }

    const customer = await prisma.customer.findUnique({ where: { email } });
    if (!customer) {
      // 记录失败尝试
      recordLoginAttempt(email, clientIp, false);
      return { success: false, message: "Invalid email or password" };
    }

    if (!customer.isActive) {
      return { success: false, message: "Account is not active. Please contact support." };
    }

    // 使用安全的密码验证
    const isPasswordValid = verifyPassword(rawPassword, customer.passwordHash);

    if (!isPasswordValid) {
      // 记录失败尝试
      recordLoginAttempt(email, clientIp, false);
      
      // 返回剩余尝试次数（不暴露太多信息）
      const remainingAttempts = rateLimitCheck.remainingAttempts - 1;
      if (remainingAttempts <= 0) {
        return {
          success: false,
          message: "Too many failed attempts. Account temporarily locked."
        };
      }
      return { success: false, message: "Invalid email or password" };
    }

    // 登录成功，清除失败记录
    recordLoginAttempt(email, clientIp, true);

    await prisma.customer.update({
      where: { customerId: customer.customerId },
      data: { lastLoginAt: new Date() },
    });

    await generateSession(customer.customerId, { persistent: stayLoggedIn });

    // 设置角色 cookie，middleware 据此放行 /customer/**
    const { setCustomerRoleCookie } = await import("@/lib/auth-admin");
    await setCustomerRoleCookie();

    return { success: true, message: "Login successful", userId: customer.customerId };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, message: "An unexpected error occurred. Please try again later." };
  }
}

export async function logout(): Promise<void> {
  try {
    await clearSession();
  } catch (error) {
    console.error("Logout error:", error);
  }
}