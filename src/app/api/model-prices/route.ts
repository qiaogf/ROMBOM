import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { queryApiPrices, parseSeriesWhitelist } from "@/lib/api-pricing";

/**
 * GET /api/model-prices — 客户对外询价 API
 *
 * 鉴权：
 *   Header `x-api-key` 匹配 ApiAccount.apiKey；
 *   账户 isActive=true；若账户已绑定客户（customerId），该客户也必须 isActive=true，
 *   客户被管理员 Disable → 403。历史无主账户（customerId=null）仅校验账户自身。
 *
 * 查询参数（端到端单一契约）：
 *   ?model=xxx   型号模糊查询（精确匹配优先）；省略 = 全量
 *   ?limit=100   每页型号数，1–500，默认 100
 *   ?offset=0    型号偏移量，默认 0
 *
 * 响应（rows 内每行严格五项）：
 *   { success, total, limit, offset, rows: [{ brand, model, price, condition, leadTime }] }
 *   — 同型号不同货况/货期各一行；不带 model 可凭 total + limit/offset 翻页拉全入库
 *
 * CORS：允许任意来源携带 x-api-key 调用，支持 file:// 双击打开的 api-tester.html
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "x-api-key, Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return json({ success: false, error: "Missing API key. Pass it in the x-api-key header." }, 401);
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
  // 已绑定客户的账户：客户被禁用则密钥一并失效
  if (account.customer && !account.customer.isActive) {
    return json({ success: false, error: "Account is disabled. Please contact your account manager." }, 403);
  }

  const { searchParams } = new URL(req.url);
  const model = searchParams.get("model")?.trim() || null;
  const limit = Number.parseInt(searchParams.get("limit") ?? "100", 10);
  const offset = Number.parseInt(searchParams.get("offset") ?? "0", 10);

  const result = await queryApiPrices({
    seriesWhitelist: parseSeriesWhitelist(account.brandSeriesFilter),
    modelQuery: model,
    markupRatePercent: Number(account.markupRate),
    limit: Number.isFinite(limit) ? limit : 100,
    offset: Number.isFinite(offset) ? offset : 0,
  });

  // 记录最后使用时间（失败不影响查询结果）
  await prisma.apiAccount
    .update({ where: { apiAccountId: account.apiAccountId }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  return json({ success: true, ...result });
}
