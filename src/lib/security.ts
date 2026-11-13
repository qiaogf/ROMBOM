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

// 生成安全的随机字符串
export function generateSecureRandom(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

// 生成安全的订单号
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomBytes = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `ORD-${timestamp}-${randomBytes}`;
}

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

/**
 * 兼容验证：旧密码用 SHA-256（无盐，64位hex），新密码用 scrypt+salt（hash:salt 格式）。
 * 验证成功且是旧格式时，返回 upgraded=true 供调用方重新哈希存库。
 */
export function verifyPasswordLegacyCompatible(
  password: string,
  storedHash: string
): { valid: boolean; needsUpgrade: boolean } {
  // 新格式：hash:salt（含冒号）
  if (storedHash.includes(":")) {
    return { valid: verifyPassword(password, storedHash), needsUpgrade: false };
  }
  // 旧格式：纯 SHA-256 hex（64 字符）
  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
    const sha256Hex = crypto.createHash("sha256").update(password).digest("hex");
    const valid = crypto.timingSafeEqual(
      Buffer.from(sha256Hex, "hex"),
      Buffer.from(storedHash, "hex")
    );
    return { valid, needsUpgrade: valid };
  }
  return { valid: false, needsUpgrade: false };
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

// 获取客户端IP
export function getClientIP(headers?: Headers): string {
  if (!headers) return "unknown";
  
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  const realIP = headers.get("x-real-ip");
  if (realIP) {
    return realIP.trim();
  }
  
  return "unknown";
}

// ── API 限流：防止价格数据被批量爬取 ──
// 按 (apiKey | ip) 维度计数，窗口 1 分钟，超出返回 429。
// 用内存 Map（单实例够用；多实例需换 Redis，但当前 Docker 单实例部署 OK）。

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const apiRateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 分钟窗口
const RATE_LIMIT_AUTHED = 60;   // 有 API key：60 次/分钟
const RATE_LIMIT_UNAUTHED = 10; // 无 key（探测）：10 次/分钟

/**
 * 检查 API 限流。返回 { allowed, retryAfterSec }。
 * identifier 通常是 apiKey 或 client IP。
 */
export function checkApiRateLimit(
  identifier: string,
  authed: boolean
): { allowed: boolean; retryAfterSec: number; limit: number; remaining: number } {
  const now = Date.now();
  const key = `${authed ? "k:" : "ip:"}${identifier}`;
  const limit = authed ? RATE_LIMIT_AUTHED : RATE_LIMIT_UNAUTHED;

  let entry = apiRateLimitStore.get(key);
  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    entry = { count: 0, windowStart: now };
    apiRateLimitStore.set(key, entry);
  }

  entry.count++;
  const remaining = Math.max(0, limit - entry.count);

  if (entry.count > limit) {
    const retryAfterSec = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 1000);
    return { allowed: false, retryAfterSec, limit, remaining: 0 };
  }

  return { allowed: true, retryAfterSec: 0, limit, remaining };
}

// 每 5 分钟清理过期的限流记录，防止内存增长
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of apiRateLimitStore.entries()) {
    if (now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
      apiRateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref?.();

// ── Session 签名：防止直接把 ID 存 cookie 被伪造 ──
// cookie 值 = `${id}.${hmacSha256(id, SECRET)}`
// 验证时重新计算 HMAC 比对，不知道 SECRET 无法伪造。

function getSessionSecret(): string {
  return process.env.SESSION_SECRET || "rombom-session-secret-change-me-please-2026";
}

export function signSessionToken(id: string): string {
  const sig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(id)
    .digest("hex");
  return `${id}.${sig}`;
}

export function verifySessionToken(token: string): string | null {
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const id = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto
    .createHmac("sha256", getSessionSecret())
    .update(id)
    .digest("hex");
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return id;
}