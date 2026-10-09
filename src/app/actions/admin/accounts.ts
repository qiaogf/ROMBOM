"use server";

import { prisma } from "@/lib/prisma";
import { getAdminSession, isSuperAdminEmail } from "@/lib/auth-admin";

// ── 删除客户 ──
export async function deleteCustomer(formData: FormData): Promise<{ success: boolean; message: string }> {
  const customerId = (formData.get("customerId") as string)?.trim();
  if (!customerId) return { success: false, message: "Customer ID is required." };

  try {
    await prisma.$transaction(async (tx) => {
      // SalesOrder 外键为 RESTRICT：客户名下有订单会阻止删除，先删除订单
      // （SalesOrderItem.orderId 为 CASCADE，删订单时明细自动一并删除）
      await tx.salesOrder.deleteMany({ where: { customerId } });
      // Session / Cart 由 onDelete: Cascade 自动级联删除
      await tx.customer.delete({ where: { customerId } });
    });
    return { success: true, message: "Customer deleted." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to delete customer: ${msg}` };
  }
}

// ── 删除供应商 ──
export async function deleteSupplier(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supplierId = (formData.get("supplierId") as string)?.trim();
  if (!supplierId) return { success: false, message: "Supplier ID is required." };

  try {
    await prisma.$transaction(async (tx) => {
      // 该供应商名下品牌
      const brands = await tx.brand.findMany({
        where: { supplierId },
        select: { brandId: true },
      });
      const brandIds = brands.map((b) => b.brandId);

      // 1. 报价（解除 SupplierQuote.supplierId RESTRICT；购物车/订单项引用为 SET NULL）
      await tx.supplierQuote.deleteMany({ where: { supplierId } });
      // 2. 型号价格（解除 ModelPrice.supplierId RESTRICT）
      await tx.modelPrice.deleteMany({ where: { supplierId } });

      if (brandIds.length > 0) {
        // 3. 旧 Product 表数据（Product.brandId 为 RESTRICT，报价已先删）
        await tx.product.deleteMany({ where: { brandId: { in: brandIds } } });
        // 4. 品类-品牌多对多关联
        await tx.categoryBrand.deleteMany({ where: { brandId: { in: brandIds } } });
        // 5. 系列（型号价格已删）
        await tx.series.deleteMany({ where: { brandId: { in: brandIds } } });
      }

      // 6. 品牌（解除 Brand.supplierId RESTRICT）
      await tx.brand.deleteMany({ where: { supplierId } });
      // 7. 供应商本身
      await tx.supplier.delete({ where: { supplierId } });
    });
    return { success: true, message: "Supplier deleted." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to delete supplier: ${msg}` };
  }
}

// ── 删除管理者 ──
// 权限守卫：仅最高管理者可审核其他管理员，且最高管理者账号本身受保护
async function ensureSuperAdminOperator(targetAdminId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const current = await getAdminSession();
  if (!current || !isSuperAdminEmail(current.email)) {
    return { ok: false, message: "Only the super admin can review admin accounts." };
  }
  const target = await prisma.adminUser.findUnique({
    where: { adminId: targetAdminId },
    select: { email: true },
  });
  if (!target) {
    return { ok: false, message: "Admin account not found." };
  }
  if (isSuperAdminEmail(target.email)) {
    return { ok: false, message: "The super admin account is protected and cannot be modified." };
  }
  return { ok: true };
}

export async function deleteAdmin(formData: FormData): Promise<{ success: boolean; message: string }> {
  const adminId = (formData.get("adminId") as string)?.trim();
  if (!adminId) return { success: false, message: "Admin ID is required." };

  const guard = await ensureSuperAdminOperator(adminId);
  if (!guard.ok) return { success: false, message: guard.message };

  try {
    await prisma.$transaction(async (tx) => {
      // 保护：系统至少保留一名管理者
      const adminCount = await tx.adminUser.count();
      if (adminCount <= 1) {
        throw new Error("At least one admin account must remain.");
      }
      await tx.adminUser.delete({ where: { adminId } });
    });
    return { success: true, message: "Admin deleted." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to delete admin: ${msg}` };
  }
}

// ── 账号启用/停用（Confirm = 启用，Reject = 停用）──
// 客户
export async function confirmCustomer(formData: FormData): Promise<{ success: boolean; message: string }> {
  const customerId = (formData.get("customerId") as string)?.trim();
  if (!customerId) return { success: false, message: "Customer ID is required." };
  try {
    await prisma.customer.update({ where: { customerId }, data: { isActive: true } });
    return { success: true, message: "Customer activated." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to activate customer: ${msg}` };
  }
}

// ── 停用客户（Reject）──
// 联动停用该客户绑定的 API 密钥（ApiAccount.isActive=false）：
// 被停用的客户其集成查询必须立即失效，防止已离职/被封禁客户继续拉取价格。
// 注意：confirmCustomer（重新启用）不会自动恢复 API 密钥——
// 管理员必须在 /admin/api 页手动重新 Enable 密钥，确保「显式授权」而非隐式恢复。
export async function rejectCustomer(formData: FormData): Promise<{ success: boolean; message: string }> {
  const customerId = (formData.get("customerId") as string)?.trim();
  if (!customerId) return { success: false, message: "Customer ID is required." };
  try {
    await prisma.$transaction(async (tx) => {
      // 1. 停用客户登录账号
      await tx.customer.update({ where: { customerId }, data: { isActive: false } });
      // 2. 联动停用其绑定的 API 密钥（updateMany：无绑定行时 0 影响，不抛错）
      await tx.apiAccount.updateMany({
        where: { customerId },
        data: { isActive: false },
      });
    });
    return { success: true, message: "Customer deactivated. Bound API key (if any) disabled." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to deactivate customer: ${msg}` };
  }
}

// 供应商
export async function confirmSupplier(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supplierId = (formData.get("supplierId") as string)?.trim();
  if (!supplierId) return { success: false, message: "Supplier ID is required." };
  try {
    await prisma.supplier.update({ where: { supplierId }, data: { isActive: true } });
    return { success: true, message: "Supplier activated." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to activate supplier: ${msg}` };
  }
}

export async function rejectSupplier(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supplierId = (formData.get("supplierId") as string)?.trim();
  if (!supplierId) return { success: false, message: "Supplier ID is required." };
  try {
    await prisma.supplier.update({ where: { supplierId }, data: { isActive: false } });
    return { success: true, message: "Supplier deactivated." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to deactivate supplier: ${msg}` };
  }
}

// 更新供应商资质等级 (0-5)
export async function updateSupplierQualificationLevel(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supplierId = (formData.get("supplierId") as string)?.trim();
  const levelStr = (formData.get("level") as string)?.trim();
  if (!supplierId) return { success: false, message: "Supplier ID is required." };
  const level = Number(levelStr);
  if (isNaN(level) || level < 0 || level > 5) return { success: false, message: "Level must be 0-5." };
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized." };
  try {
    await prisma.supplier.update({ where: { supplierId }, data: { qualificationLevel: level } });
    return { success: true, message: `Qualification level set to ${level}.` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to update level: ${msg}` };
  }
}

// 管理员（仅最高管理者可操作；最高管理者账号受保护）
export async function confirmAdmin(formData: FormData): Promise<{ success: boolean; message: string }> {
  const adminId = (formData.get("adminId") as string)?.trim();
  if (!adminId) return { success: false, message: "Admin ID is required." };

  const guard = await ensureSuperAdminOperator(adminId);
  if (!guard.ok) return { success: false, message: guard.message };

  try {
    await prisma.adminUser.update({ where: { adminId }, data: { isActive: true } });
    return { success: true, message: "Admin activated." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to activate admin: ${msg}` };
  }
}

export async function rejectAdmin(formData: FormData): Promise<{ success: boolean; message: string }> {
  const adminId = (formData.get("adminId") as string)?.trim();
  if (!adminId) return { success: false, message: "Admin ID is required." };

  const guard = await ensureSuperAdminOperator(adminId);
  if (!guard.ok) return { success: false, message: guard.message };

  try {
    await prisma.$transaction(async (tx) => {
      const activeCount = await tx.adminUser.count({ where: { isActive: true } });
      if (activeCount <= 1) {
        throw new Error("At least one active admin account must remain.");
      }
      await tx.adminUser.update({ where: { adminId }, data: { isActive: false } });
    });
    return { success: true, message: "Admin deactivated." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to deactivate admin: ${msg}` };
  }
}
