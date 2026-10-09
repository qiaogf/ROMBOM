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

// ── 供应商查看自己上传批次的明细 ──
// pending 批次返回 ImportBatchItem 暂存行；approved 批次返回 ModelPrice 线上行
export async function getSupplierBatchDetail(importBatchId: string): Promise<{
  success: boolean;
  message?: string;
  batch?: { fileName: string; approvalStatus: string; seriesName: string | null };
  items?: Array<{
    rowNumber?: number;
    model: string;
    productName: string;
    costPrice: string;
    sellPrice: string;
    moq: number;
    stockStatus: string;
    condition: string | null;
    leadTime: string | null;
  }>;
}> {
  const session = await getSupplierSession();
  if (!session) return { success: false, message: "Unauthorized." };

  const batch = await prisma.importBatch.findUnique({
    where: { importBatchId },
    select: { fileName: true, approvalStatus: true, supplierId: true, series: { select: { seriesName: true } } },
  });
  if (!batch) return { success: false, message: "File not found." };
  if (batch.supplierId !== session.supplierId) return { success: false, message: "Not your file." };

  if (batch.approvalStatus === "pending") {
    const items = await prisma.importBatchItem.findMany({
      where: { importBatchId },
      orderBy: { rowNumber: "asc" },
      select: { rowNumber: true, model: true, productName: true, costPrice: true, sellPrice: true, moq: true, stockStatus: true, condition: true, leadTime: true },
    });
    return {
      success: true,
      batch: { fileName: batch.fileName, approvalStatus: batch.approvalStatus, seriesName: batch.series?.seriesName ?? null },
      items: items.map((it) => ({ ...it, costPrice: it.costPrice.toString(), sellPrice: it.sellPrice.toString() })),
    };
  }

  const items = await prisma.modelPrice.findMany({
    where: { importBatchId },
    orderBy: { model: "asc" },
    select: { model: true, productName: true, costPrice: true, sellPrice: true, moq: true, stockStatus: true, condition: true, leadTime: true },
  });
  return {
    success: true,
    batch: { fileName: batch.fileName, approvalStatus: batch.approvalStatus, seriesName: batch.series?.seriesName ?? null },
    items: items.map((it) => ({ ...it, costPrice: it.costPrice.toString(), sellPrice: it.sellPrice.toString() })),
  };
}

// ── 供应商调整采购单（客户购物车中属于自己的意向型号）的数量与单价 ──
// 权限校验：该购物车条目引用的 ModelPrice 或 SupplierQuote 必须归属当前供应商
export async function updatePurchaseOrderItem(formData: FormData): Promise<{ success: boolean; message: string }> {
  const session = await getSupplierSession();
  if (!session) return { success: false, message: "Unauthorized." };

  const cartItemId = (formData.get("cartItemId") as string)?.trim();
  const quantityRaw = (formData.get("quantity") as string)?.trim();
  const unitPriceRaw = (formData.get("unitPrice") as string)?.trim();
  if (!cartItemId) return { success: false, message: "Item ID required." };

  const quantity = quantityRaw ? parseInt(quantityRaw, 10) : null;
  const unitPrice = unitPriceRaw ? parseFloat(unitPriceRaw) : null;
  if (quantity !== null && (!Number.isInteger(quantity) || quantity < 1)) {
    return { success: false, message: "Quantity must be a positive integer." };
  }
  if (unitPrice !== null && (!Number.isFinite(unitPrice) || unitPrice < 0)) {
    return { success: false, message: "Unit price must be a non-negative number." };
  }

  try {
    const item = await prisma.cartItem.findUnique({
      where: { itemId: cartItemId },
      select: {
        modelPriceId: true,
        quoteId: true,
        modelPrice: { select: { supplierId: true } },
        supplierQuote: { select: { supplierId: true } },
      },
    });
    if (!item) return { success: false, message: "Item not found." };

    const owner = item.modelPrice?.supplierId ?? item.supplierQuote?.supplierId;
    if (owner !== session.supplierId) return { success: false, message: "Not your item." };

    await prisma.$transaction(async (tx) => {
      if (quantity !== null) {
        await tx.cartItem.update({ where: { itemId: cartItemId }, data: { quantity } });
      }
      if (unitPrice !== null) {
        if (item.modelPriceId) {
          await tx.modelPrice.update({
            where: { modelPriceId: item.modelPriceId },
            data: { sellPrice: unitPrice },
          });
        } else if (item.quoteId) {
          await tx.supplierQuote.update({
            where: { quoteId: item.quoteId },
            data: { sellPrice: unitPrice },
          });
        }
      }
    });
    return { success: true, message: "Updated." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to update: ${msg}` };
  }
}
