"use server";

// Run Compare — 全局持久切换开关（Admin Panel 价格模块）
// 点击切换：OFF → ON 置位并立即执行一次比价；ON → OFF 停止比价，前台回退产品表 Unit Price。
// 开关状态持久化于 SystemSetting（见 lib/price-compare.ts）。
// 自动触发（价格批次 Confirm 上线 / approved 批次改 Markup / cron）在 OFF 时短路跳过。

import { getAdminSession } from "@/lib/auth-admin";
import { isPriceCompareEnabled, runPriceComparison, setPriceCompareEnabled } from "@/lib/price-compare";

export interface PriceCompareToggleResult {
  success: boolean;
  enabled: boolean;
  message: string;
}

export async function togglePriceCompareAction(): Promise<PriceCompareToggleResult> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, enabled: false, message: "Unauthorized. Admin login required." };
  }

  const current = await isPriceCompareEnabled();

  if (current) {
    // ON → OFF：停止比价，前台所有型号回退产品表 Unit Price
    await setPriceCompareEnabled(false);
    return {
      success: true,
      enabled: false,
      message: "Run Compare stopped. Storefront now shows product sheet Unit Price only.",
    };
  }

  // OFF → ON：置位并立即执行一次比价，刷新优胜标记
  await setPriceCompareEnabled(true);
  const result = await runPriceComparison();
  return { success: true, enabled: true, message: result.summary };
}
