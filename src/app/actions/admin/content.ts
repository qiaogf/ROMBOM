"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdminSession, isSuperAdminEmail } from "@/lib/auth-admin";
import { isContentKey } from "@/lib/content";

/**
 * 保存 About / Terms 文案（仅超级管理员）
 */
export async function savePage(
  formData: FormData
): Promise<{ ok: boolean; message: string; updatedAt?: string }> {
  const session = await getAdminSession();
  if (!session || !isSuperAdminEmail(session.email)) {
    return { ok: false, message: "无权限" };
  }

  const key = String(formData.get("key") ?? "");
  const value = String(formData.get("value") ?? "");

  if (!isContentKey(key)) return { ok: false, message: "无效的页面" };
  if (!value.trim()) return { ok: false, message: "内容不能为空" };

  try {
    const row = await prisma.siteContent.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    revalidatePath(`/${key}`);
    // Next 16 的 revalidateTag 需要 cacheLife profile，"max" 表示立即失效
    revalidateTag(`page-${key}`, "max");
    return { ok: true, message: "已保存", updatedAt: row.updatedAt.toISOString() };
  } catch {
    return { ok: false, message: "保存失败，请稍后重试" };
  }
}
