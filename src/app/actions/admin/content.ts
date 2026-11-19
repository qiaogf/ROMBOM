"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdminSession, isSuperAdminEmail } from "@/lib/auth-admin";
import { isContentKey } from "@/lib/content";

/**
 * Save About / Terms copy (super admin only)
 */
export async function savePage(
  formData: FormData
): Promise<{ ok: boolean; message: string; updatedAt?: string }> {
  const session = await getAdminSession();
  if (!session || !isSuperAdminEmail(session.email)) {
    return { ok: false, message: "Permission denied" };
  }

  const key = String(formData.get("key") ?? "");
  const value = String(formData.get("value") ?? "");

  if (!isContentKey(key)) return { ok: false, message: "Invalid page" };
  if (!value.trim()) return { ok: false, message: "Content cannot be empty" };

  try {
    const row = await prisma.siteContent.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    revalidatePath(`/${key}`);
    // Next 16 requires a cacheLife profile; "max" expires immediately
    revalidateTag(`page-${key}`, "max");
    return { ok: true, message: "Saved", updatedAt: row.updatedAt.toISOString() };
  } catch {
    return { ok: false, message: "Save failed, please try again" };
  }
}
