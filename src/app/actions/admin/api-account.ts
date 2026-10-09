"use server";

import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth-admin";

// ============ API 账户管理 ============
// Phase 3：强关联一客户一密钥
// - createApiAccount：必传 customerId；校验客户 isActive + 未绑定；customerName/email 由后端从 customer 读出
// - updateApiAccount：已绑定行的 customerName/email 不接受前端覆盖；brandSeriesFilter/markupRate/quotaPerMinute 可改
// - legacy 行（customerId=null）保留 customerName/email 文本编辑能力（向后兼容）

export async function createApiAccount(
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized." };
  const customerId = (formData.get("customerId") as string)?.trim();
  if (!customerId)
    return { success: false, message: "Customer is required." };
  const brandSeriesFilter =
    (formData.get("brandSeriesFilter") as string)?.trim() ?? "";
  const markupRateStr = (formData.get("markupRate") as string)?.trim() ?? "0";
  const quotaPerMinuteStr =
    (formData.get("quotaPerMinute") as string)?.trim() ?? "60";
  const markupRate = Number(markupRateStr);
  const quotaPerMinute = Number(quotaPerMinuteStr);
  if (isNaN(markupRate) || isNaN(quotaPerMinute))
    return { success: false, message: "Invalid number." };

  try {
    // 校验客户：存在 + isActive + 未绑定
    const customer = await prisma.customer.findUnique({
      where: { customerId },
      select: {
        customerId: true,
        firstName: true,
        lastName: true,
        companyName: true,
        email: true,
        isActive: true,
        apiAccount: { select: { apiAccountId: true } },
      },
    });
    if (!customer)
      return { success: false, message: "Customer not found." };
    if (!customer.isActive)
      return { success: false, message: "Customer is disabled." };
    if (customer.apiAccount)
      return {
        success: false,
        message: "Customer already bound to an API account.",
      };

    // 名称：firstName+lastName 优先，回退 companyName，再回退 email
    const full = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim();
    const customerName = full || customer.companyName || customer.email;

    await prisma.apiAccount.create({
      data: {
        customerId,
        customerName,
        email: customer.email,
        brandSeriesFilter,
        markupRate,
        quotaPerMinute,
      },
    });
    return { success: true, message: "API account created." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to create: ${msg}` };
  }
}

export async function updateApiAccount(
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized." };
  const apiAccountId = (formData.get("apiAccountId") as string)?.trim();
  if (!apiAccountId)
    return { success: false, message: "Account ID is required." };
  const brandSeriesFilter =
    (formData.get("brandSeriesFilter") as string)?.trim() ?? "";
  const markupRateStr = (formData.get("markupRate") as string)?.trim();
  const quotaPerMinuteStr = (formData.get("quotaPerMinute") as string)?.trim();

  try {
    const existing = await prisma.apiAccount.findUnique({
      where: { apiAccountId },
      select: { customerId: true },
    });
    if (!existing)
      return { success: false, message: "Account not found." };

    const data: Record<string, unknown> = { brandSeriesFilter };
    // 仅 legacy 行（无 customerId）允许改 customerName/email
    if (!existing.customerId) {
      const customerName = (formData.get("customerName") as string)?.trim();
      const email = (formData.get("email") as string)?.trim();
      if (customerName !== undefined) data.customerName = customerName;
      if (email !== undefined) data.email = email;
    }
    if (markupRateStr !== undefined && markupRateStr !== "") {
      const v = Number(markupRateStr);
      if (isNaN(v))
        return { success: false, message: "Invalid markup rate." };
      data.markupRate = v;
    }
    if (quotaPerMinuteStr !== undefined && quotaPerMinuteStr !== "") {
      const v = Number(quotaPerMinuteStr);
      if (isNaN(v)) return { success: false, message: "Invalid quota." };
      data.quotaPerMinute = v;
    }
    await prisma.apiAccount.update({ where: { apiAccountId }, data });
    return { success: true, message: "API account updated." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to update: ${msg}` };
  }
}

export async function toggleApiAccount(
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized." };
  const apiAccountId = (formData.get("apiAccountId") as string)?.trim();
  if (!apiAccountId)
    return { success: false, message: "Account ID is required." };
  try {
    const acc = await prisma.apiAccount.findUnique({
      where: { apiAccountId },
      select: { isActive: true },
    });
    if (!acc) return { success: false, message: "Account not found." };
    await prisma.apiAccount.update({
      where: { apiAccountId },
      data: { isActive: !acc.isActive },
    });
    return {
      success: true,
      message: `Account ${!acc.isActive ? "enabled" : "disabled"}.`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to toggle: ${msg}` };
  }
}

export async function deleteApiAccount(
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized." };
  const apiAccountId = (formData.get("apiAccountId") as string)?.trim();
  if (!apiAccountId)
    return { success: false, message: "Account ID is required." };
  try {
    await prisma.apiAccount.delete({ where: { apiAccountId } });
    return { success: true, message: "API account deleted." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to delete: ${msg}` };
  }
}
