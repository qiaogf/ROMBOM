"use server";

// Confirm (publish) a pending import batch live.
// Reads staged ImportBatchItem rows and replays them to ModelPrice / Product / SupplierQuote.
// Two branch types: product_info (attributes only) vs price (price only).
// Idempotent: confirming an already-approved batch returns success without re-writing.
//
// 性能设计（Neon 跨境单次往返 200ms+，原实现在 5s 事务内逐行 findFirst 导致超时）：
//   1. 所有读（batch/items/series/Product/SupplierQuote）移到事务外，批量 findMany 预取建 Map
//   2. 事务内仅剩写操作（upsert/create/update），行数 × 2-3 次写
//   3. 事务 timeout 提升至 30s（interactive transaction 默认 5s 不够跨境批量写）
//   4. 事务内复查 approvalStatus，防并发双击重复上线

import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth-admin";
import { runPriceComparison } from "@/lib/price-compare";
import { revalidatePublicQuotePages } from "./revalidate-helpers";

// ── 管理员确认批次上线 ──
export async function confirmImportBatch(formData: FormData): Promise<{ success: boolean; message: string }> {
  const importBatchId = (formData.get("importBatchId") as string)?.trim();
  if (!importBatchId) return { success: false, message: "Import batch ID is required." };

  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };

  try {
    // ── 事务外预读：批次 + 暂存行 ──
    const batch = await prisma.importBatch.findUnique({
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
    if (batch.approvalStatus === "approved") {
      return { success: true, message: "Batch already confirmed." }; // 幂等
    }
    const batchType = batch.batchType; // product_info | price

    // 每行可能归属不同系列（CSV Series 列逐行解析）；行未填时回退 batch.series
    const itemSeriesIds = Array.from(
      new Set(batch.items.map((i) => i.seriesId).filter((id): id is string => !!id)),
    );
    const itemSeriesList = itemSeriesIds.length > 0
      ? await prisma.series.findMany({
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

    // ── 事务外预读：Product（by model）与有效 SupplierQuote（by productId）映射 ──
    const models = Array.from(new Set(batch.items.map((i) => i.model)));
    const productList = models.length > 0
      ? await prisma.product.findMany({
          where: { model: { in: models } },
          select: { productId: true, model: true },
        })
      : [];
    const productByModel = new Map(productList.map((p) => [p.model, p.productId]));

    const productIds = productList.map((p) => p.productId);
    const quoteList = productIds.length > 0
      ? await prisma.supplierQuote.findMany({
          where: { productId: { in: productIds }, isValid: true },
          select: { quoteId: true, productId: true, supplierId: true },
        })
      : [];
    // key = productId:supplierId → 该组合已有有效报价
    const quoteMap = new Map(quoteList.map((q) => [`${q.productId}:${q.supplierId}`, q.quoteId]));
    // 已存在任一有效报价的产品（isDefault 判定用）
    const anyQuoteSet = new Set(quoteList.map((q) => q.productId));

    // ── 事务内仅写操作 ──
    await prisma.$transaction(async (tx) => {
      // 并发双击防护：事务内复查状态
      const current = await tx.importBatch.findUnique({
        where: { importBatchId },
        select: { approvalStatus: true },
      });
      if (current?.approvalStatus === "approved") return;

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

          // Product create/update（用预取 Map，无逐行 findFirst）
          const existingProductId = productByModel.get(item.model);
          if (!existingProductId) {
            const created = await tx.product.create({
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
              select: { productId: true },
            });
            productByModel.set(item.model, created.productId);
          } else {
            await tx.product.update({
              where: { productId: existingProductId },
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
              leadTime: item.leadTime,
                status: "on_sale",
                seriesId: seriesCtx.seriesId,
                importBatchId: batch.importBatchId,
              },
            });
          }

          // Product create/update（价格批次只更新 unit/series/status，不碰 productName/
          // description 等属性——价格模板无 Name 列，productName 是型号回退值，
          // 写入会覆盖产品表里的真实产品名）
          const existingProductId = productByModel.get(item.model);
          let productId: string;
          if (!existingProductId) {
            const created = await tx.product.create({
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
              select: { productId: true },
            });
            productByModel.set(item.model, created.productId);
            productId = created.productId;
          } else {
            await tx.product.update({
              where: { productId: existingProductId },
              data: {
                unit: item.unit,
                series: seriesCtx.seriesName,
                status: "on_sale",
                importBatchId: batch.importBatchId,
              },
            });
            productId = existingProductId;
          }

          // SupplierQuote upsert（价格）—— 无归属供应商的品牌不写旧报价表
          if (sellPrice > 0 && seriesCtx.supplierId) {
            const quoteKey = `${productId}:${seriesCtx.supplierId}`;
            const existingQuoteId = quoteMap.get(quoteKey);
            if (existingQuoteId) {
              await tx.supplierQuote.update({
                where: { quoteId: existingQuoteId },
                data: {
                  costPrice: costPrice || sellPrice,
                  sellPrice,
                  moq: item.moq,
                  leadTime: item.leadTime,
                  isValid: true,
                },
              });
            } else {
              await tx.supplierQuote.create({
                data: {
                  supplierId: seriesCtx.supplierId,
                  productId,
                  costPrice: costPrice || sellPrice,
                  sellPrice,
                  moq: item.moq,
                  leadTime: item.leadTime,
                  isValid: true,
                  isDefault: !anyQuoteSet.has(productId),
                },
              });
              quoteMap.set(quoteKey, "");
              anyQuoteSet.add(productId);
            }
          }
        }
      }

      // 标记批次为 approved
      await tx.importBatch.update({
        where: { importBatchId },
        data: {
          approvalStatus: "approved",
          approvedAt: new Date(),
          approvedById: session.adminId,
        },
      });
    }, { timeout: 30000, maxWait: 10000 });

    // ── 比价任务：新价格表上线后自动比对所有 Approved 文件，写产品 ListPrice ──
    let compareSummary = "";
    if (batchType === "price") {
      const cmp = await runPriceComparison();
      compareSummary = ` ${cmp.summary}`;
    }

    return { success: true, message: `Batch confirmed and published live.${compareSummary}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to confirm batch: ${msg}` };
  } finally {
    // 无论成败都刷新公开页缓存（幂等，成本低）
    await revalidatePublicQuotePages();
  }
}
