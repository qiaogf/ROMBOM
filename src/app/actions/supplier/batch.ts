"use server";

// Supplier batch actions — delete / view / update-purchase-order.
// All require an authenticated supplier session; ownership is checked against session.supplierId.

import { prisma } from "@/lib/prisma";
import { getSupplierSession } from "@/lib/auth-admin";

// ── 供应商删除自己上传的导入批次 ──
// 权限：仅可删除 supplierId === session.supplierId 的批次；pending 批次清暂存行；
// approved 批次同步回滚线上 ModelPrice/Product/SupplierQuote（仅限该批次）。
// 不允许删除其他供应商或 admin 的批次（权限隔离）。
export async function deleteSupplierImportBatch(formData: FormData): Promise<{ success: boolean; message: string }> {
  const importBatchId = (formData.get("importBatchId") as string)?.trim();
  if (!importBatchId) return { success: false, message: "Import batch ID is required." };

  const session = await getSupplierSession();
  if (!session) return { success: false, message: "Unauthorized. Supplier login required." };

  try {
    await prisma.$transaction(async (tx) => {
      const batch = await tx.importBatch.findUnique({
        where: { importBatchId },
        select: { importBatchId: true, fileName: true, supplierId: true, approvalStatus: true },
      });
      if (!batch) throw new Error("Import batch not found.");
      if (batch.supplierId !== session.supplierId) {
        throw new Error("You can only delete your own uploaded files.");
      }

      // 已上线批次需要回滚线上数据
      if (batch.approvalStatus === "approved") {
        // 1. 删除批次内 Product 的 SupplierQuote（SupplierQuote.productId 为 RESTRICT）
        await tx.supplierQuote.deleteMany({
          where: { product: { importBatchId } },
        });
        // 2. 删除批次内 Product（CartItem/SalesOrderItem 引用为可选，SET NULL）
        await tx.product.deleteMany({ where: { importBatchId } });
        // 3. 删除批次内 ModelPrice
        await tx.modelPrice.deleteMany({ where: { importBatchId } });
      }

      // 4. 删除批次本身（ImportBatchItem 由 onDelete: Cascade 自动清理）
      await tx.importBatch.delete({ where: { importBatchId } });
    });
    return { success: true, message: "Your file and all its prices have been deleted." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to delete file: ${msg}` };
  }
}

// ── 供应商删除自己上传的导入批次 ──
