"use server";

// Confirm (publish) a pending import batch live.
// Reads staged ImportBatchItem rows and replays them to ModelPrice / Product / SupplierQuote
// in a single transaction. Two branch types: product_info (attributes only) vs price (price only).
// Idempotent: confirming an already-approved batch returns success without re-writing.

import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth-admin";

// ── 管理员确认批次上线 ──
// 读 ImportBatchItem 暂存行 → 回放到 ModelPrice / Product / SupplierQuote（事务）
// 仅 pending 批次可确认；幂等：重复确认返回已确认提示
export async function confirmImportBatch(formData: FormData): Promise<{ success: boolean; message: string }> {
  const importBatchId = (formData.get("importBatchId") as string)?.trim();
  if (!importBatchId) return { success: false, message: "Import batch ID is required." };

  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };

  try {
    await prisma.$transaction(async (tx) => {
      const batch = await tx.importBatch.findUnique({
        where: { importBatchId },
        include: {
          series: {
            select: {
              seriesId: true,
              seriesName: true,
              categoryId: true,
              brand: { select: { brandId: true, brandName: true, supplierId: true } },
            },
          },
          items: { orderBy: { rowNumber: "asc" } },
        },
      });
      if (!batch) throw new Error("Import batch not found.");
      if (batch.approvalStatus === "approved") return; // 幂等
      const batchType = batch.batchType; // product_info | price

      // 每行可能归属不同系列（CSV Series 列逐行解析）；行未填时回退 batch.series
      const itemSeriesIds = Array.from(
        new Set(batch.items.map((i) => i.seriesId).filter((id): id is string => !!id)),
      );
      const itemSeriesList = itemSeriesIds.length > 0
        ? await tx.series.findMany({
            where: { seriesId: { in: itemSeriesIds } },
            select: {
              seriesId: true,
              seriesName: true,
              categoryId: true,
              brand: { select: { brandId: true, brandName: true, supplierId: true } },
            },
          })
        : [];
      const itemSeriesMap = new Map(itemSeriesList.map((s) => [s.seriesId, s]));

      for (const item of batch.items) {
        const itemSeries = (item.seriesId ? itemSeriesMap.get(item.seriesId) : undefined) ?? batch.series;
        if (!itemSeries) {
          throw new Error(`Row ${item.rowNumber} (model=${item.model}) has no resolvable series. Cannot publish.`);
        }

        const seriesCtx = {
          seriesId: itemSeries.seriesId,
          seriesName: itemSeries.seriesName,
          categoryId: itemSeries.categoryId,
          brandId: itemSeries.brand.brandId,
          brandName: itemSeries.brand.brandName,
          // 供应商上传：用品牌归属供应商；管理员上传：保留批次原始 supplierId（可能为 null）
          supplierId: batch.supplierId ?? itemSeries.brand.supplierId,
        };

        const sellPriceRaw = Number(item.sellPrice);
        const costPrice = Number(item.costPrice);
        const markup = item.markup !== null ? Number(item.markup) : null;

        // markup 优先：若设置了 markup 且 sellPrice 为 0，则自动计算售价
        let sellPrice = sellPriceRaw;
        if (markup !== null && markup > 0 && sellPrice === 0 && costPrice > 0) {
          sellPrice = Number((costPrice * (1 + markup / 100)).toFixed(2));
        }
        const hasPrice = sellPrice > 0 || costPrice > 0;

        if (batchType === "product_info") {
          // ── 产品属性批次：只写属性，不碰价格 ──
          // ModelPrice upsert（create 时价格字段默认 0；update 时不改价格）
          await tx.modelPrice.upsert({
            where: { slug: item.slug },
            create: {
              productName: item.productName,
              model: item.model,
              slug: item.slug,
              description: item.description,
              origin: item.origin,
              certification: item.certification,
              length: item.length,
              width: item.width,
              height: item.height,
              diameter: item.diameter,
              dimensionUnit: item.dimensionUnit,
              weight: item.weight,
              packingWeight: item.packingWeight,
              weightUnit: item.weightUnit,
              batteryAttributes: item.batteryAttributes,
              datasheetLink: item.datasheetLink,
              brandName: item.brandName,
              unit: item.unit,
              costPrice: 0,
              sellPrice: 0,
              moq: 1,
              stockStatus: item.stockStatus,
              status: "off_sale",
              seriesId: seriesCtx.seriesId,
              supplierId: seriesCtx.supplierId,
              importBatchId: batch.importBatchId,
            },
            update: {
              productName: item.productName,
              description: item.description,
              origin: item.origin,
              certification: item.certification,
              length: item.length,
              width: item.width,
              height: item.height,
              diameter: item.diameter,
              dimensionUnit: item.dimensionUnit,
              weight: item.weight,
              packingWeight: item.packingWeight,
              weightUnit: item.weightUnit,
              batteryAttributes: item.batteryAttributes,
              datasheetLink: item.datasheetLink,
              brandName: item.brandName,
              unit: item.unit,
              importBatchId: batch.importBatchId,
            },
          });

          // Product upsert（属性）
          const existingProduct = await tx.product.findFirst({ where: { model: item.model } });
          if (!existingProduct) {
            await tx.product.create({
              data: {
                categoryId: seriesCtx.categoryId,
                brandId: seriesCtx.brandId,
                productName: item.productName,
                model: item.model,
                series: seriesCtx.seriesName,
                description: item.description ?? undefined,
                unit: item.unit,
                status: "on_sale",
                importBatchId: batch.importBatchId,
              },
            });
          } else {
            await tx.product.update({
              where: { productId: existingProduct.productId },
              data: {
                productName: item.productName,
                description: item.description,
                unit: item.unit,
                series: seriesCtx.seriesName,
                importBatchId: batch.importBatchId,
              },
            });
          }
        } else {
          // ── 价格批次：只写价格，不碰属性 ──
          // ModelPrice upsert（价格字段；create 时属性字段留空）
          if (hasPrice) {
            await tx.modelPrice.upsert({
              where: { slug: item.slug },
              create: {
                productName: item.productName,
                model: item.model,
                slug: item.slug,
                unit: item.unit,
                costPrice,
                sellPrice,
                markup: item.markup,
                moq: item.moq,
                condition: item.condition,
                stockStatus: item.stockStatus,
                leadTime: item.leadTime,
                status: "on_sale",
                seriesId: seriesCtx.seriesId,
                supplierId: seriesCtx.supplierId,
                importBatchId: batch.importBatchId,
              },
              update: {
                costPrice,
                sellPrice,
                markup: item.markup,
                moq: item.moq,
                condition: item.condition,
                stockStatus: item.stockStatus,
                leadTime: item.leadTime,
                status: "on_sale",
                seriesId: seriesCtx.seriesId,
                importBatchId: batch.importBatchId,
              },
            });
          }

          // Product upsert（价格批次只更新 unit/series，不改描述等属性）
          const existingProduct = await tx.product.findFirst({ where: { model: item.model } });
          let productId = existingProduct?.productId || "";
          if (!existingProduct) {
            const product = await tx.product.create({
              data: {
                categoryId: seriesCtx.categoryId,
                brandId: seriesCtx.brandId,
                productName: item.productName,
                model: item.model,
                series: seriesCtx.seriesName,
                unit: item.unit,
                status: "on_sale",
                importBatchId: batch.importBatchId,
              },
            });
            productId = product.productId;
          } else {
            await tx.product.update({
              where: { productId: existingProduct.productId },
              data: {
                productName: item.productName,
                unit: item.unit,
                series: seriesCtx.seriesName,
                status: "on_sale",
                importBatchId: batch.importBatchId,
              },
            });
            productId = existingProduct.productId;
          }

          // SupplierQuote upsert（价格）—— 无归属供应商的品牌不写旧报价表
          if (sellPrice > 0 && seriesCtx.supplierId) {
            const myQuote = await tx.supplierQuote.findFirst({
              where: { productId, supplierId: seriesCtx.supplierId, isValid: true },
              select: { quoteId: true },
            });
            if (myQuote) {
              await tx.supplierQuote.update({
                where: { quoteId: myQuote.quoteId },
                data: {
                  costPrice: costPrice || sellPrice,
                  sellPrice,
                  moq: item.moq,
                  stockStatus: item.stockStatus,
                  leadTime: item.leadTime,
                  isValid: true,
                },
              });
            } else {
              const anyQuote = await tx.supplierQuote.findFirst({
                where: { productId, isValid: true },
                select: { quoteId: true },
              });
              await tx.supplierQuote.create({
                data: {
                  supplierId: seriesCtx.supplierId,
                  productId,
                  costPrice: costPrice || sellPrice,
                  sellPrice,
                  moq: item.moq,
                  stockStatus: item.stockStatus,
                  leadTime: item.leadTime,
                  isValid: true,
                  isDefault: !anyQuote,
                },
              });
            }
          }
        }
      }

      // 4. 标记批次为 approved
      await tx.importBatch.update({
        where: { importBatchId },
        data: {
          approvalStatus: "approved",
          approvedAt: new Date(),
          approvedById: session.adminId,
        },
      });
    });
    return { success: true, message: "Batch confirmed and published live." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to confirm batch: ${msg}` };
  }
}
