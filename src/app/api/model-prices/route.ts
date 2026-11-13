import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { queryApiPrices, parseSeriesWhitelist } from "@/lib/api-pricing";
import { checkApiRateLimit, getClientIP } from "@/lib/security";

/**
 * GET /api/model-prices — 客户对外询价 API
 *
 * 鉴权：
 *   Header `x-api-key` 匹配 ApiAccount.apiKey；
 *   账户 isActive=true；若账户已绑定客户（customerId），该客户也必须 isActive=true，
 *   客户被管理员 Disable → 403。历史无主账户（customerId=null）仅校验账户自身。
 *
 * 安全：
 *   - 仅接受 Header 传 key（禁止 URL ?key= ，防止 Referer/日志泄露）
 *   - 限流：有 key 60次/分钟，无 key 10次/分钟（防爬）
 *   - CORS 收紧：不返回 Access-Control-Allow-Origin，浏览器跨域调用会被阻止
 *
 * 查询参数：
 *   ?model=a,b  型号查询，逗号分隔多个；省略 = 全量
 *   ?limit=100   每页型号数，1–500，默认 100
 *   ?offset=0    型号偏移量，默认 0
 */

export const dynamic = "force-dynamic";

function json(body: unknown, status = 200, extraHeaders?: Record<string, string>): NextResponse {
  return NextResponse.json(body, { status, headers: extraHeaders });
}

export async function OPTIONS(): Promise<NextResponse> {
  // 不返回 CORS 头 → 浏览器跨域预检失败，阻止跨域调用
  return new NextResponse(null, { status: 204 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const clientIp = getClientIP(req.headers);

  // ⚠️ 仅接受 Header 传 key，禁止 URL ?key= （防止 Referer/access log 泄露密钥）
  const apiKey = req.headers.get("x-api-key");

  // 无 key 探测：严格限流
  if (!apiKey) {
    const rl = checkApiRateLimit(clientIp, false);
    if (!rl.allowed) {
      return json({ success: false, error: "Too many requests. Slow down." }, 429, {
        "Retry-After": String(rl.retryAfterSec),
      });
    }
    return json(
      { success: false, error: "Missing API key. Pass it in the x-api-key header." },
      401
    );
  }

  // 有 key：按 key 限流
  const rl = checkApiRateLimit(apiKey, true);
  if (!rl.allowed) {
    return json({ success: false, error: `Rate limit exceeded (${rl.limit}/min). Try again later.` }, 429, {
      "Retry-After": String(rl.retryAfterSec),
    });
  }

  const account = await prisma.apiAccount.findUnique({
    where: { apiKey },
    select: {
      apiAccountId: true,
      brandSeriesFilter: true,
      markupRate: true,
      isActive: true,
      customer: { select: { isActive: true } },
    },
  });

  if (!account || !account.isActive) {
    return json({ success: false, error: "Invalid or disabled API key." }, 403);
  }
  if (account.customer && !account.customer.isActive) {
    return json({ success: false, error: "Account is disabled. Please contact your account manager." }, 403);
  }

  const model = searchParams.get("model")?.trim() || null;
  const limit = Number.parseInt(searchParams.get("limit") ?? "100", 10);
  const offset = Number.parseInt(searchParams.get("offset") ?? "0", 10);

  const result = await queryApiPrices({
    seriesWhitelist: parseSeriesWhitelist(account.brandSeriesFilter),
    modelQuery: model,
    markupRatePercent: Number(account.markupRate),
    limit: Number.isFinite(limit) ? Math.min(limit, 500) : 100,
    offset: Number.isFinite(offset) ? offset : 0,
  });

  // 记录最后使用时间（失败不影响查询结果）
  await prisma.apiAccount
    .update({ where: { apiAccountId: account.apiAccountId }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  return json(
    { success: true, ...result },
    200,
    { "X-RateLimit-Limit": String(rl.limit), "X-RateLimit-Remaining": String(rl.remaining) }
  );
}
