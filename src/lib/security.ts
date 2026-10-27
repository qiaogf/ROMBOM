import crypto from "crypto";

// 登录失败记录接口
interface LoginAttempt {
  timestamp: number;
  ip: string;
}

interface RateLimitRecord {
  attempts: LoginAttempt[];
  lockedUntil: number;
}

// 内存存储 - 用于开发环境
const loginAttempts = new Map<string, RateLimitRecord>();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15分钟锁定
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5分钟内的尝试计数

// 清理过期记录
function cleanupExpiredRecords(): void {
  const now = Date.now();
  for (const [key, record] of loginAttempts.entries()) {
    // 如果锁定已过期，清理记录
    if (record.lockedUntil > 0 && record.lockedUntil < now) {
      loginAttempts.delete(key);
      continue;
    }
    
    // 清理过期的尝试记录
    record.attempts = record.attempts.filter(
      attempt => now - attempt.timestamp < ATTEMPT_WINDOW_MS
    );
    
    if (record.attempts.length === 0 && record.lockedUntil === 0) {
      loginAttempts.delete(key);
    }
  }
}

// 每10分钟清理一次
setInterval(cleanupExpiredRecords, 10 * 60 * 1000);

// 生成唯一幂等键
export function generateIdempotencyKey(...parts: string[]): string {
  const data = parts.join(":");
  return crypto.createHash("sha256").update(data).digest("hex");
}

// 验证密码强度
export function validatePasswordStrength(password: string): { valid: boolean; message: string } {
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

// 哈希密码
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${hash}:${salt}`;
}

// 验证密码
export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 2) {
    return false;
  }
  
  const [hash, salt] = parts;
  if (!hash || !salt) {
    return false;
  }
  
  const computedHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(computedHash, "hex"),
    Buffer.from(hash, "hex")
  );
}

// 检查登录速率限制
export function checkLoginRateLimit(email: string, ip?: string): { allowed: boolean; remainingAttempts: number; lockoutTime: number } {
  const key = `${email.toLowerCase()}:${ip || "default"}`;
  const now = Date.now();
  
  cleanupExpiredRecords();
  
  let record = loginAttempts.get(key);
  
  // 如果记录不存在，创建新记录
  if (!record) {
    record = { attempts: [], lockedUntil: 0 };
    loginAttempts.set(key, record);
  }
  
  // 检查是否被锁定
  if (record.lockedUntil > now) {
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutTime: Math.ceil((record.lockedUntil - now) / 1000),
    };
  }
  
  // 清理过期的尝试记录
  record.attempts = record.attempts.filter(
    attempt => now - attempt.timestamp < ATTEMPT_WINDOW_MS
  );
  
  // 检查尝试次数
  if (record.attempts.length >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutTime: Math.ceil(LOCKOUT_DURATION_MS / 1000),
    };
  }
  
  return {
    allowed: true,
    remainingAttempts: MAX_LOGIN_ATTEMPTS - record.attempts.length,
    lockoutTime: 0,
  };
}

// 记录登录尝试
export function recordLoginAttempt(email: string, ip: string, success: boolean): void {
  const key = `${email.toLowerCase()}:${ip}`;
  const now = Date.now();
  
  let record = loginAttempts.get(key);
  
  if (!record) {
    record = { attempts: [], lockedUntil: 0 };
    loginAttempts.set(key, record);
  }
  
  if (success) {
    // 登录成功，清除记录
    loginAttempts.delete(key);
    return;
  }
  
  // 添加失败尝试
  record.attempts.push({ timestamp: now, ip });
  
  // 检查是否达到锁定阈值
  if (record.attempts.length >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
  }
}

// 验证邮箱格式
export function validateEmailFormat(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

// 消毒输入
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

// 消毒邮箱
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// 验证ID格式
export function isValidIdFormat(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 255;
}