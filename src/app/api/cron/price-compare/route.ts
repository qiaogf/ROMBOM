import { NextRequest, NextResponse } from "next/server";
import { runPriceComparison } from "@/lib/price-compare";
import { releaseExpiredOrders } from "@/lib/order-lock";

/**
 * GET /api/cron/price-compare — 定时任务入口（每日 05:00 / 13:00 由 Windows 计划任务调用）
 *
 * 鉴权：?secret=xxx 或 Header x-cron-secret，需匹配环境变量 CRON_SECRET
 * 动作：① 比价择优（含过期报价失效）② 逾期未支付订单取消并释放库存
 */
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const provided =
    req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");

  if (!secret || provided !== secret) {
    return json({ success: false, error: "Unauthorized." }, 401);
  }

  const compare = await runPriceComparison();
  const released = await releaseExpiredOrders();

  return json({ success: true, compare, released });
}
