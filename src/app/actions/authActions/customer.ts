"use server";

// 客户账号注册 / 传统单角色登录 action。

import { prisma } from "@/lib/prisma";
import {
  generateSession,
} from "@/lib/auth";
import {
  validateEmailFormat,
  hashPassword,
  verifyPassword,
  checkLoginRateLimit,
  recordLoginAttempt,
  validatePasswordStrength,
  sanitizeInput,
  sanitizeEmail,
} from "@/lib/security";
import type { AuthResult, RegisterData, LoginData } from "./shared";

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
        // 新注册默认停用：须 Super Admin 在 Admin → Customer Confirm 后才能登录
        isActive: false,
      },
    });

    // 注册成功后不自动登录；账号待 Super Admin 审核通过后方可登录
    return {
      success: true,
      message: "Registration successful. Your account is pending approval by the super admin — you can log in once it is confirmed.",
      userId: customer.customerId,
    };
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, message: "An unexpected error occurred. Please try again later." };
  }
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
      // 从未登录过的停用账号 = 待 Super Admin 审核；登录过的 = 被停用
      const pending = !customer.lastLoginAt;
      return {
        success: false,
        message: pending
          ? "Your account is pending approval by the super admin. You can log in once it is confirmed."
          : "Account is not active. Please contact support.",
      };
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
