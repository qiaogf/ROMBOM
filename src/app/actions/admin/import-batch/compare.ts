"use server";

// 比价任务手动触发入口（Admin Panel 价格模块 "Run Compare" 按钮）
// 自动触发见 lifecycle/confirm.ts 与 markup.ts（价格批次上线/改加价后自动执行）

import { getAdminSession } from "@/lib/auth-admin";
import { runPriceComparison } from "@/lib/price-compare";

export async function runPriceCompareAction(): Promise<{ success: boolean; message: string }> {
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  const result = await runPriceComparison();
  return { success: true, message: result.summary };
}
