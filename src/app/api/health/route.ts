import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** 健康检查：真实查一次数据库，供 watchdog 与部署验证使用。
 *  不暴露错误详情，避免信息泄露。 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch {
    // 不返回 error message，防止数据库错误信息泄露
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
