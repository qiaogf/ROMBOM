// Auth 相关共享类型（纯类型模块，不得再导出任何依赖 next/headers 的运行时值，
// 否则会被客户端页面（如 /auth/customer-register）经 barrel 拉入浏览器包）。

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

export interface LoginData {
  email: string;
  password: string;
  clientIp?: string;
  /** 对应登录弹窗 "Stay logged in"：true（默认）→ 7 天持久化；false → 会话级 Cookie */
  stayLoggedIn?: boolean;
}

export type AccountRole = "customer" | "supplier" | "admin";

export interface UnifiedLoginResult {
  success: boolean;
  message: string;
  /** 登录成功后命中的实际角色 */
  role?: AccountRole;
  userId?: string;
}

export interface UnifiedRegisterData {
  email: string;
  password: string;
  /** Buyer → customer / Supplier → supplier / Engineer → admin */
  accountRole: AccountRole;
}
