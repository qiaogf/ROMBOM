"use server";

// Delete an entire import batch (file) and all its staged/live data.
// pending batches only have ImportBatchItem rows (onDelete: Cascade cleans them);
// approved batches already wrote ModelPrice/Product/SupplierQuote — those are rolled back too.

import { prisma } from "@/lib/prisma";
import { revalidatePublicQuotePages } from "./revalidate-helpers";

// ── 删除整个导入批次（文件）及其所有型号价格 / 产品 ──
// pending 批次仅含 ImportBatchItem 暂存行（onDelete: Cascade 自动清理）；
// approved 批次已写入 ModelPrice/Product/SupplierQuote，需一并清理。
export async function deleteImportBatch(formData: FormData): Promise<{ success: boolean; message: string }> {
  const importBatchId = (formData.get("importBatchId") as string)?.trim();
  if (!importBatchId) return { success: false, message: "Import batch ID is required." };

  try {
    await prisma.$transaction(async (tx) => {
      const batch = await tx.importBatch.findUnique({
        where: { importBatchId },
        select: { importBatchId: true, fileName: true, approvalStatus: true },
      });
      if (!batch) throw new Error("Import batch not found.");

      // 已上线批次需要回滚线上数据
      if (batch.approvalStatus === "approved") {
        // 1. 删除批次内 Product 的 SupplierQuote（SupplierQuote.productId 为 RESTRICT，
        //    直接按 Product 归属定位，避免型号名不匹配时漏删）
        await tx.supplierQuote.deleteMany({
          where: { product: { importBatchId } },
        });
        // 2. 删除批次内 Product（CartItem/SalesOrderItem 引用为可选，SET NULL；订单快照保留）
        await tx.product.deleteMany({ where: { importBatchId } });
        // 3. 删除批次内 ModelPrice
        await tx.modelPrice.deleteMany({ where: { importBatchId } });
      }

      // 4. 删除批次本身（ImportBatchItem 由 onDelete: Cascade 自动清理）
      await tx.importBatch.delete({ where: { importBatchId } });
    });
    return { success: true, message: "Import file and all its model prices deleted." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to delete import file: ${msg}` };
  } finally {
    // 删除已上线批次会使公开页数据消失，需刷新缓存
    await revalidatePublicQuotePages();
  }
}
