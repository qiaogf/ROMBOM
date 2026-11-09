"use server";

// Self 开关 — 控制型号是否允许客户在购物车自助下单结算。
// 语义：淡绿 = 可自助下单；灰色 = 需人工确认后下单。
//   - 文件级（ImportBatch.selfOrderAll）：对本文件全部型号生效（绿色时覆盖所有行）
//   - 行级（ImportBatchItem.selfOrder / ModelPrice.selfOrder）：只对本型号生效
// 购物车侧的最终判定 = selfOrderAll || 行级 selfOrder。

import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth-admin";

export async function toggleBatchSelfOrder(formData: FormData): Promise<{ success: boolean; message: string }> {
  const importBatchId = (formData.get("importBatchId") as string)?.trim();
  if (!importBatchId) return { success: false, message: "Import batch ID is required." };

  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };

  const next = formData.get("selfOrderAll") === "true";

  try {
    await prisma.importBatch.update({
      where: { importBatchId },
      data: { selfOrderAll: next },
    });
    return {
      success: true,
      message: next
        ? "Self-checkout enabled for all models in this file."
        : "Self-checkout now follows each model's own switch.",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to update Self: ${msg}` };
  }
}

export async function toggleRowSelfOrder(formData: FormData): Promise<{ success: boolean; message: string }> {
  const itemId = (formData.get("itemId") as string)?.trim();
  const modelPriceId = (formData.get("modelPriceId") as string)?.trim();
  if (!itemId && !modelPriceId) return { success: false, message: "Row ID is required." };

  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };

  const next = formData.get("selfOrder") === "true";

  try {
    if (itemId) {
      await prisma.importBatchItem.update({ where: { itemId }, data: { selfOrder: next } });
    } else {
      await prisma.modelPrice.update({ where: { modelPriceId: modelPriceId! }, data: { selfOrder: next } });
    }
    return {
      success: true,
      message: next ? "Self-checkout enabled for this model." : "This model now requires manual confirmation.",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to update Self: ${msg}` };
  }
}
