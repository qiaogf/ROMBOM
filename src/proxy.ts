import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy（Next.js 16：原 middleware，已更名为 proxy）
 *
 * 两块职责，按路径分流：
 *   A. 角色权限代理 — /admin /supplier /customer 路由级拦截（原有）
 *      读取 httpOnly cookie `user_role`（由登录 server action 设置），
 *      实际 session 有效性由各页面 server-side 二次校验。
 *   B. 价格防爬 — 公开报价页 Bot 识别 + IP 限流（新增）
 *      产品页保持 SEO 可索引（主流搜索引擎 UA 白名单 + 宽松限流）；
 *      比价爬虫 / 采集工具 UA 直接 403；正常访客浏览频率远低于阈值，不受影响。
 *
 * 价格摘要防护由页面层 data-nosnippet 负责（ProductPriceTable / ProductDetailContent）。
 * /api/model-prices 已有 API key 鉴权 + 限流（route.ts），不在此重复处理。
 */

// ── A. 角色权限 ──

const ROLE_COOKIE = "user_role";

// 不需要重定向的公开路径前缀
const PUBLIC_PREFIXES = ["/auth/", "/api/"];

function roleGuard(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // 确定需要校验的角色
  let requiredRole: string | null = null;
  let loginPath = "";

  if (pathname.startsWith("/admin")) {
    requiredRole = "admin";
    loginPath = "/auth/admin-login";
  } else if (pathname.startsWith("/supplier")) {
    requiredRole = "supplier";
    loginPath = "/auth/supplier-login";
  } else if (pathname.startsWith("/customer")) {
    requiredRole = "customer";
    loginPath = "/auth/customer-login";
  }

  // 公开路由或无角色要求 → 放行
  if (!requiredRole || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const role = request.cookies.get(ROLE_COOKIE)?.value;

  // 无角色 cookie 或角色不匹配 → 跳转对应登录页
  if (!role || role !== requiredRole) {
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// ── B. 价格防爬 ──

/** 主流搜索引擎 UA：保障 SEO 收录（仍走高阈值限流，防伪装 UA 批量抓取） */
const SEARCH_ENGINE_UA =
  /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex(bot)?|sogou|360spider/i;

/** 比价 / 采集爬虫与自动化工具 UA：直接拒绝 */
const BLOCKED_UA =
  /semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|bytespider|gptbot|ccbot|claudebot|anthropic|scrapy|python-requests|python-urllib|httpclient|okhttp|curl\/|wget\/|httrack|headlesschrome|phantomjs|puppeteer|playwright/i;

const WINDOW_MS = 60_000;
const LIMIT_BROWSER = 120; // 正常访客：120 次/分钟（含 RSC 导航；预取请求不计数）
const LIMIT_SEARCH = 120; // 搜索引擎：120 次/分钟（收录抓取）
const LIMIT_NO_UA = 5; // 无 UA：5 次/分钟（非浏览器特征，严格限制）

interface Entry {
  count: number;
  windowStart: number;
}
const store = new Map<string, Entry>();

function rateLimit(key: string, limit: number): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  // 惰性清理过期窗口，防内存膨胀（单实例 Docker 部署够用）
  if (store.size > 10_000) {
    for (const [k, v] of store) {
      if (now - v.windowStart >= WINDOW_MS) store.delete(k);
    }
  }
  let e = store.get(key);
  if (!e || now - e.windowStart >= WINDOW_MS) {
    e = { count: 0, windowStart: now };
    store.set(key, e);
  }
  e.count++;
  if (e.count > limit) {
    return {
      allowed: false,
      retryAfter: Math.ceil((WINDOW_MS - (now - e.windowStart)) / 1000),
    };
  }
  return { allowed: true, retryAfter: 0 };
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function priceAntiScraping(request: NextRequest): NextResponse {
  const ua = request.headers.get("user-agent") || "";

  // 1) 已知比价 / 采集爬虫、自动化工具：直接 403
  if (BLOCKED_UA.test(ua)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // 2) Next.js 链接预取 / 浏览器预加载：不计入限流
  //    首页与品牌页会同时预取数十个系列链接，计入会让正常浏览误触 429
  const isPrefetch =
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("sec-purpose")?.includes("prefetch") === true;
  if (isPrefetch) {
    return NextResponse.next();
  }

  // 3) 搜索引擎白名单：宽松限流放行；普通访客标准限流；无 UA 严格限流
  const isSearchEngine = SEARCH_ENGINE_UA.test(ua);
  const limit = isSearchEngine ? LIMIT_SEARCH : ua ? LIMIT_BROWSER : LIMIT_NO_UA;

  const rl = rateLimit(`${isSearchEngine ? "se" : "ip"}:${clientIp(request)}`, limit);
  if (!rl.allowed) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfter) },
    });
  }

  return NextResponse.next();
}

// ── 入口：按路径分流 ──

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/supplier") ||
    pathname.startsWith("/customer")
  ) {
    return roleGuard(request);
  }

  return priceAntiScraping(request);
}

export const config = {
  matcher: [
    // 角色权限（原有）
    "/admin/:path*",
    "/supplier/:path*",
    "/customer/:path*",
    // 公开报价页价格防爬（新增）；auth / api / 静态资源不经过此 Proxy
    "/",
    "/category/:path*",
    "/catalog/:path*",
    "/brand/:path*",
    "/products/:path*",
    "/search",
  ],
};
