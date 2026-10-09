"use server";

import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth-admin";
import { round4, parseMarkupPercent } from "./shared";

// ── 管理员整批 Markup（加价）──
// 按每行 Cost Price 计算：sellPrice = costPrice × (1 + markup%)
// approved 批次：同步更新该文件的 ModelPrice 及关联 Product 的 SupplierQuote（前台价格表优先读报价）
// pending 批次：更新暂存 ImportBatchItem，确认上线时按已加价的 sellPrice 落地
export async function applyBatchMarkup(formData: FormData): Promise<{ success: boolean; message: string }> {
  const importBatchId = (formData.get("importBatchId") as string)?.trim();
  if (!importBatchId) return { success: false, message: "Import batch ID is required." };

  const markupPercent = parseMarkupPercent(formData);
  if (markupPercent === null) return { success: false, message: "Markup must be a number between 0 and 1000 (%)." };

  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };

  const factor = 1 + markupPercent / 100;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.importBatch.findUnique({
        where: { importBatchId },
        select: { fileName: true, approvalStatus: true },
      });
      if (!batch) throw new Error("Import batch not found.");

      if (batch.approvalStatus === "approved") {
        // 线上 ModelPrice 逐行按各自 costPrice 加价；报价仅同步该行供应商自己的 quote
        const prices = await tx.modelPrice.findMany({
          where: { importBatchId },
          select: { modelPriceId: true, model: true, costPrice: true, supplierId: true },
        });
        let quoteCount = 0;
        for (const p of prices) {
          await tx.modelPrice.update({
            where: { modelPriceId: p.modelPriceId },
            data: { sellPrice: round4(Number(p.costPrice) * factor), markup: markupPercent },
          });
          // 同步前台报价：SupplierQuote 无 markup 字段，按其自身 costPrice 加价保持一致
          const product = await tx.product.findFirst({ where: { model: p.model }, select: { productId: true } });
          if (!product || !p.supplierId) continue;
          const quote = await tx.supplierQuote.findFirst({
            where: { productId: product.productId, supplierId: p.supplierId, isValid: true },
            orderBy: { sellPrice: "asc" },
            select: { quoteId: true, costPrice: true },
          });
          if (quote) {
            await tx.supplierQuote.update({
              where: { quoteId: quote.quoteId },
              data: { sellPrice: round4(Number(quote.costPrice) * factor) },
            });
            quoteCount++;
          }
        }
        return { fileName: batch.fileName, count: prices.length, quotes: quoteCount };
      }

      // pending 批次：更新暂存行
      const items = await tx.importBatchItem.findMany({
        where: { importBatchId },
        select: { itemId: true, costPrice: true },
      });
      for (const it of items) {
        await tx.importBatchItem.update({
          where: { itemId: it.itemId },
          data: { sellPrice: round4(Number(it.costPrice) * factor), markup: markupPercent },
        });
      }
      return { fileName: batch.fileName, count: items.length, quotes: 0 };
    });
    const quoteNote = result.quotes > 0 ? ` and ${result.quotes} quote(s)` : "";
    return {
      success: true,
      message: `Markup ${markupPercent}% applied to ${result.count} price row(s)${quoteNote} in "${result.fileName}".`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to apply markup: ${msg}` };
  }
}

// ── 管理员单型号 Markup（加价）──
// 线上 ModelPrice 单行：sellPrice = costPrice × (1 + markup%)，并同步该供应商自己的报价
export async function applyModelMarkup(formData: FormData): Promise<{ success: boolean; message: string }> {
  const modelPriceId = (formData.get("modelPriceId") as string)?.trim();
  if (!modelPriceId) return { success: false, message: "Model price ID is required." };

  const markupPercent = parseMarkupPercent(formData);
  if (markupPercent === null) return { success: false, message: "Markup must be a number between 0 and 1000 (%)." };

  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };

  const factor = 1 + markupPercent / 100;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const mp = await tx.modelPrice.findUnique({
        where: { modelPriceId },
        select: { model: true, costPrice: true, supplierId: true },
      });
      if (!mp) throw new Error("Model price not found.");

      await tx.modelPrice.update({
        where: { modelPriceId },
        data: { sellPrice: round4(Number(mp.costPrice) * factor), markup: markupPercent },
      });

      // 同步前台报价（该型号 + 该供应商，取 sellPrice 最低一条，与前台展示口径一致）
      const product = await tx.product.findFirst({ where: { model: mp.model }, select: { productId: true } });
      if (product && mp.supplierId) {
        const quote = await tx.supplierQuote.findFirst({
          where: { productId: product.productId, supplierId: mp.supplierId, isValid: true },
          orderBy: { sellPrice: "asc" },
          select: { quoteId: true, costPrice: true },
        });
        if (quote) {
          await tx.supplierQuote.update({
            where: { quoteId: quote.quoteId },
            data: { sellPrice: round4(Number(quote.costPrice) * factor) },
          });
        }
      }
      return mp.model;
    });
    return { success: true, message: `Markup ${markupPercent}% applied to model ${result}.` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to apply markup: ${msg}` };
  }
}

// ── 管理员系列级 Markup（批量应用到该系列所有型号）──
export async function applySeriesMarkup(formData: FormData): Promise<{ success: boolean; message: string }> {
  const seriesId = (formData.get("seriesId") as string)?.trim();
  if (!seriesId) return { success: false, message: "Series ID is required." };

  const markupPercent = parseMarkupPercent(formData);
  if (markupPercent === null) return { success: false, message: "Markup must be a number between 0 and 1000 (%)." };

  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };

  const factor = 1 + markupPercent / 100;

  try {
    await prisma.$transaction(async (tx) => {
      const mps = await tx.modelPrice.findMany({
        where: { seriesId },
        select: { modelPriceId: true, model: true, costPrice: true, supplierId: true },
      });
      for (const mp of mps) {
        await tx.modelPrice.update({
          where: { modelPriceId: mp.modelPriceId },
          data: { sellPrice: round4(Number(mp.costPrice) * factor), markup: markupPercent },
        });
        const product = await tx.product.findFirst({ where: { model: mp.model }, select: { productId: true } });
        if (product && mp.supplierId) {
          const quote = await tx.supplierQuote.findFirst({
            where: { productId: product.productId, supplierId: mp.supplierId, isValid: true },
            orderBy: { sellPrice: "asc" },
            select: { quoteId: true, costPrice: true },
          });
          if (quote) {
            await tx.supplierQuote.update({
              where: { quoteId: quote.quoteId },
              data: { sellPrice: round4(Number(quote.costPrice) * factor) },
            });
          }
        }
      }
    });
    return { success: true, message: `Markup ${markupPercent}% applied to series.` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to apply series markup: ${msg}` };
  }
}

// ── 管理员暂存行单型号 Markup（加价，仅 pending 批次）──
export async function applyItemMarkup(formData: FormData): Promise<{ success: boolean; message: string }> {
  const itemId = (formData.get("itemId") as string)?.trim();
  if (!itemId) return { success: false, message: "Item ID is required." };

  const markupPercent = parseMarkupPercent(formData);
  if (markupPercent === null) return { success: false, message: "Markup must be a number between 0 and 1000 (%)." };

  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };

  try {
    const item = await prisma.importBatchItem.findUnique({
      where: { itemId },
      select: { model: true, costPrice: true, importBatch: { select: { approvalStatus: true } } },
    });
    if (!item) return { success: false, message: "Staged item not found." };
    if (item.importBatch.approvalStatus !== "pending") {
      return { success: false, message: "This batch is already approved. Edit the live model price instead." };
    }
    const sellPrice = round4(Number(item.costPrice) * (1 + markupPercent / 100));
    await prisma.importBatchItem.update({
      where: { itemId },
      data: { sellPrice, markup: markupPercent },
    });
    return { success: true, message: `Markup ${markupPercent}% applied to staged model ${item.model}.` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to apply markup: ${msg}` };
  }
}
