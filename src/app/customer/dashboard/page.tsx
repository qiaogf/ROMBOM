import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * /customer/dashboard — 问候式 dashboard 已按需求移除（2026-10-20）：
 * 登录后直达购物车，本路由统一跳转 /cart。
 */
export default async function CustomerDashboardPage() {
  redirect("/cart");
}
