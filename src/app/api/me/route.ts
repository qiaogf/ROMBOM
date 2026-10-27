import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * 轻量登录态接口 — 供 HeaderNav 客户端组件在静态页面上获取当前用户。
 * Header 不再在服务端读 session（那会把全站公开页拖成 no-store 动态渲染，
 * 每次访问都要跨境查 Neon）。公开页面静态化后，登录态由本接口异步补充。
 */
export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json(
    { firstName: user?.firstName ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
