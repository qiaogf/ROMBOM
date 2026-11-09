"use server";

// Confirm (publish) a pending import batch live.
// Reads staged ImportBatchItem rows and replays them to ModelPrice / Product / SupplierQuote.
// Two branch types: product_info (attributes only) vs price (price only).
// Idempotent: confirming an already-approved batch returns success without re-writing.
// 导航自动创建：CSV Brand/Series 列未匹配已有导航时，确认后自动创建 Brand/Series
// （大小写+空格不敏感匹配）并补齐品牌↔品类关联；Category 列仅限系统已有品类，只查找不创建。
//
// 性能设计（Neon 跨境单次往返 200ms+，原实现在 5s 事务内逐行 findFirst 导致超时）：
//   1. 所有读（batch/items/series/Product/SupplierQuote）移到事务外，批量 findMany 预取建 Map
//   2. 事务内仅剩写操作（upsert/create/update），行数 × 2-3 次写
//   3. 事务 timeout 提升至 30s（interactive transaction 默认 5s 不够跨境批量写）
//   4. 事务内复查 approvalStatus，防并发双击重复上线

import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth-admin";
import { runPriceComparison } from "@/lib/price-compare";
import { normNavKey, normCategoryKey } from "@/lib/import-price-upload";
import {
  isSpecialCategoryName,
  GENERIC_BRAND_NAME,
  buildModelPriceQuoteKey,
  buildBaseQuoteKey,
} from "@/lib/import-price";
import { computeQuoteValidUntil } from "@/lib/quote-validity";
import { slugify } from "@/lib/db/types";
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

    // ── 事务外预读：Product（by categoryId|model）与有效 SupplierQuote（by productId）映射 ──
    const models = Array.from(new Set(batch.items.map((i) => i.model)));
    const productList = models.length > 0
      ? await prisma.product.findMany({
          where: { model: { in: models } },
          select: { productId: true, categoryId: true, model: true },
        })
      : [];
    const productByKey = new Map(productList.map((p) => [`${p.categoryId}|${p.model}`, p.productId]));

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

    // ── 事务外预读：产品属性行（product_info 批次 base|categoryId|model），价格行继承属性 ──
    const baseAttrRows = models.length > 0
      ? await prisma.modelPrice.findMany({
          where: { model: { in: models }, quoteKey: { startsWith: "base|" } },
          select: {
            categoryId: true, model: true, description: true, origin: true, certification: true,
            length: true, width: true, height: true, diameter: true, dimensionUnit: true,
            weight: true, packingWeight: true, weightUnit: true, batteryAttributes: true, datasheetLink: true,
          },
        })
      : [];
    const baseAttrByKey = new Map(baseAttrRows.map((r) => [`${r.categoryId}|${r.model}`, r]));

    // ── 事务外预读：导航表（Brand/Category/Series slug + 品牌-品类关联），CSV 新名称匹配/创建用 ──
    const [navBrands, navCategories, navSeriesSlugs, navCatBrands] = await Promise.all([
      prisma.brand.findMany({ select: { brandId: true, brandName: true, slug: true } }),
      prisma.category.findMany({ select: { categoryId: true, categoryName: true, slug: true } }),
      prisma.series.findMany({
        select: { seriesId: true, seriesName: true, slug: true, categoryId: true, brandId: true },
      }),
      prisma.categoryBrand.findMany({ select: { categoryId: true, brandId: true } }),
    ]);
    const brandByKey = new Map<string, { brandId: string; brandName: string }>();
    for (const b of navBrands) {
      brandByKey.set(normNavKey(b.brandName), { brandId: b.brandId, brandName: b.brandName });
      if (b.slug) brandByKey.set(b.slug, { brandId: b.brandId, brandName: b.brandName });
    }
    const categoryByKey = new Map<string, { categoryId: string }>();
    for (const c of navCategories) {
      // 品类键忽略 <>()（）：暂存值可能是 "Discontinued"（导航原名是 "<Discontinued>"）
      categoryByKey.set(normCategoryKey(c.categoryName), { categoryId: c.categoryId });
      if (c.slug) categoryByKey.set(c.slug, { categoryId: c.categoryId });
    }
    const brandSlugSet = new Set(navBrands.map((b) => b.slug));
    const seriesSlugSet = new Set(navSeriesSlugs.map((s) => s.slug));
    // (brandId:categoryId:归一化系列名) → 已有系列；重复导入时复用同一条系列，不再每次新建
    // （特殊类目的「品牌同名系列」尤其依赖此索引）
    const seriesByKey = new Map<string, { seriesId: string; seriesName: string; categoryId: string }>();
    for (const s of navSeriesSlugs) {
      const key = `${s.brandId}:${s.categoryId}:${normNavKey(s.seriesName)}`;
      if (!seriesByKey.has(key)) {
        seriesByKey.set(key, { seriesId: s.seriesId, seriesName: s.seriesName, categoryId: s.categoryId });
      }
    }
    const catBrandSet = new Set(navCatBrands.map((cb) => `${cb.categoryId}:${cb.brandId}`));
    // slug 生成：slugify 为空（如纯中文名）时回退归一化名称
    const baseSlug = (name: string) => slugify(name) || normNavKey(name) || `nav-${Date.now().toString(36)}`;
    const uniqueSlug = (name: string, used: Set<string>): string => {
      const base = baseSlug(name);
      if (!used.has(base)) { used.add(base); return base; }
      let i = 2;
      while (used.has(`${base}-${i}`)) i++;
      const slug = `${base}-${i}`;
      used.add(slug);
      return slug;
    };

    // ── 并发双击防护：原子认领批次（pending → approved）──
    // 跨境 RTT 高（实测 0.5~1.7s/查询），互动事务单连接串行写会分钟级；
    // 改为先原子认领、再并发写（全部 upsert 幂等，失败回滚认领状态可安全重试）
    const claimed = await prisma.importBatch.updateMany({
      where: { importBatchId, approvalStatus: "pending" },
      data: { approvalStatus: "approved", approvedAt: new Date(), approvedById: session.adminId },
    });
    if (claimed.count === 0) {
      return { success: true, message: "Batch already confirmed." }; // 幂等
    }

    // promise 级去重：并发下同键 find-or-create 只执行一次（同步 set 再 await，JS 单线程无竞争）
    const memo = <R>(m: Map<string, Promise<R>>) => (key: string, fn: () => Promise<R>): Promise<R> => {
      let p = m.get(key);
      if (!p) { p = fn(); m.set(key, p); }
      return p;
    };
    const memoBrand = memo(new Map<string, Promise<{ brandId: string; brandName: string }>>());
    const memoSeries = memo(new Map<string, Promise<{ seriesId: string; seriesName: string; categoryId: string }>>());
    const memoCatBrand = memo(new Map<string, Promise<void>>());
    const memoProduct = memo(new Map<string, Promise<string>>());
    const memoQuote = memo(new Map<string, Promise<void>>());

    try {
      // ── 导航条目匹配或创建（memo 防并发重复创建；匹配用预读 Map，slug 集合防重）──
      const findOrCreateBrand = (name: string) => {
        const key = normNavKey(name);
        const hit = brandByKey.get(key);
        if (hit) return Promise.resolve(hit);
        return memoBrand(key, async () => {
          const created = await prisma.brand.create({
            data: { brandName: name, slug: uniqueSlug(name, brandSlugSet) },
            select: { brandId: true, brandName: true },
          });
          brandByKey.set(key, created);
          return created;
        });
      };
      // Category 仅查找不创建：上传时已校验 Category 列必须为系统已有品类
      const stagedSeriesByKey = new Map<string, { seriesId: string; seriesName: string; categoryId: string }>();
      const findOrCreateSeries = (name: string, brandId: string, categoryId: string) => {
        // 索引按「品牌 + 品类 + 归一化系列名」，避免同名系列被跨品牌/跨类目复用或重复创建
        const key = `${brandId}:${categoryId}:${normNavKey(name)}`;
        const hit = stagedSeriesByKey.get(key) ?? seriesByKey.get(key);
        if (hit) return Promise.resolve(hit);
        return memoSeries(key, async () => {
          const created = await prisma.series.create({
            data: { seriesName: name, slug: uniqueSlug(name, seriesSlugSet), brandId, categoryId },
            select: { seriesId: true, seriesName: true, categoryId: true },
          });
          stagedSeriesByKey.set(key, created);
          return created;
        });
      };
      const ensureCategoryBrand = (categoryId: string, brandId: string) => {
        const key = `${categoryId}:${brandId}`;
        if (catBrandSet.has(key)) return Promise.resolve();
        return memoCatBrand(key, async () => {
          await prisma.categoryBrand.create({ data: { categoryId, brandId } });
          catBrandSet.add(key);
        });
      };

      const processItem = async (item: (typeof batch.items)[number]) => {
        // ── 导航解析：已有系列直接复用；暂存新系列 → 匹配/创建 Brand + Category + Series ──
        //    特殊类目（<Discontinued>、(Cement) 等）不建系列：seriesId = null，按 brandId/categoryId 展示
        let seriesCtx: {
          seriesId: string | null;
          seriesName: string | null;
          categoryId: string;
          brandId: string;
          brandName: string;
          supplierId: string | null;
        };
        if (item.seriesId) {
          const itemSeries = itemSeriesMap.get(item.seriesId) ?? batch.series;
          if (!itemSeries) {
            throw new Error(`Row ${item.rowNumber} (model=${item.model}) has no resolvable series. Cannot publish.`);
          }
          seriesCtx = {
            seriesId: itemSeries.seriesId,
            seriesName: itemSeries.seriesName,
            categoryId: itemSeries.categoryId,
            brandId: itemSeries.brand.brandId,
            brandName: itemSeries.brand.brandName,
            // 供应商上传：用品牌归属供应商；管理员上传：保留批次原始 supplierId（可能为 null）
            supplierId: batch.supplierId ?? itemSeries.brand.supplierId,
          };
        } else {
          // 品类来源：Category 列（仅查找，上传时已确保存在）→ 未填则用表单所选批次系列的品类
          const category = item.categoryName
            ? categoryByKey.get(normCategoryKey(item.categoryName)) ?? null
            : batch.series
              ? { categoryId: batch.series.categoryId }
              : null;
          if (!category) {
            throw new Error(`Row ${item.rowNumber} (model=${item.model}) references a category that no longer exists. Cannot publish.`);
          }
          const special = item.categoryName ? isSpecialCategoryName(item.categoryName) : false;
          const brandName = item.brandName?.trim() || (special ? GENERIC_BRAND_NAME : "");
          if (!brandName) {
            throw new Error(`Row ${item.rowNumber} (model=${item.model}) staged without brand name. Cannot publish.`);
          }
          const brand = await findOrCreateBrand(brandName);
          await ensureCategoryBrand(category.categoryId, brand.brandId);

          if (special) {
            // 特殊类目：不建系列，价格行直接挂 品牌 + 品类
            seriesCtx = {
              seriesId: null,
              seriesName: null,
              categoryId: category.categoryId,
              brandId: brand.brandId,
              brandName: brand.brandName,
              supplierId: batch.supplierId ?? null,
            };
          } else {
            if (!item.seriesName) {
              throw new Error(`Row ${item.rowNumber} (model=${item.model}) has no series for normal category "${item.categoryName ?? ""}". Cannot publish.`);
            }
            const series = await findOrCreateSeries(item.seriesName, brand.brandId, category.categoryId);
            seriesCtx = {
              seriesId: series.seriesId,
              seriesName: series.seriesName,
              categoryId: category.categoryId,
              brandId: brand.brandId,
              brandName: brand.brandName,
              supplierId: batch.supplierId ?? null,
            };
          }
        }

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
          // ── 产品属性批次：只写属性，不碰价格（按 base|categoryId|model 唯一键 upsert）──
          const baseKey = buildBaseQuoteKey(seriesCtx.categoryId, item.model);
          await prisma.modelPrice.upsert({
            where: { quoteKey: baseKey },
            create: {
              productName: item.productName,
              model: item.model,
              slug: item.slug,
              quoteKey: baseKey,
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
              selfOrder: item.selfOrder,
              status: "off_sale",
              // 特殊类目（无系列）：属性行即线上展示行，直接标记为优胜
              isWinnerPrice: seriesCtx.seriesId === null,
              isWinnerLeadTime: seriesCtx.seriesId === null,
              seriesId: seriesCtx.seriesId,
              brandId: seriesCtx.brandId,
              categoryId: seriesCtx.categoryId,
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
              selfOrder: item.selfOrder,
              importBatchId: batch.importBatchId,
              isWinnerPrice: seriesCtx.seriesId === null,
              isWinnerLeadTime: seriesCtx.seriesId === null,
            },
          });

          // Product create/update（memo 防并发下同型号重复创建）
          const productKey = `${seriesCtx.categoryId}|${item.model}`;
          await memoProduct(productKey, async () => {
            const existingProductId = productByKey.get(productKey);
            if (!existingProductId) {
              const created = await prisma.product.create({
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
              productByKey.set(productKey, created.productId);
              return created.productId;
            }
            await prisma.product.update({
              where: { productId: existingProductId },
              data: {
                productName: item.productName,
                description: item.description,
                unit: item.unit,
                series: seriesCtx.seriesName,
                importBatchId: batch.importBatchId,
              },
            });
            return existingProductId;
          });
        } else {
          // ── 价格批次：只写价格，不碰属性 ──
          // 特殊类目（无系列）直接上线，不进比价池，不设有效期，直接标记为线上展示行
          const isSpecialRow = seriesCtx.seriesId === null;
          if (hasPrice) {
            const validUntil = isSpecialRow ? null : computeQuoteValidUntil();
            // 报价行唯一键：Category + Model + Condition + 供应商键；同型号跨分类/跨供应商独立成行
            const quoteKey = buildModelPriceQuoteKey({
              categoryId: seriesCtx.categoryId,
              model: item.model,
              condition: item.condition,
              supplierId: seriesCtx.supplierId,
              brandId: seriesCtx.brandId,
            });
            const attrs = baseAttrByKey.get(`${seriesCtx.categoryId}|${item.model}`);
            await prisma.modelPrice.upsert({
              where: { quoteKey },
              create: {
                productName: item.productName,
                model: item.model,
                slug: item.slug,
                quoteKey,
                unit: item.unit,
                costPrice,
                sellPrice,
                markup: item.markup,
                moq: item.moq,
                condition: item.condition,
              leadTime: item.leadTime,
                selfOrder: item.selfOrder,
                status: "on_sale",
                validUntil,
                isWinnerPrice: isSpecialRow,
                isWinnerLeadTime: isSpecialRow,
                description: attrs?.description ?? null,
                origin: attrs?.origin ?? null,
                certification: attrs?.certification ?? null,
                length: attrs?.length ?? null,
                width: attrs?.width ?? null,
                height: attrs?.height ?? null,
                diameter: attrs?.diameter ?? null,
                dimensionUnit: attrs?.dimensionUnit ?? null,
                weight: attrs?.weight ?? null,
                packingWeight: attrs?.packingWeight ?? null,
                weightUnit: attrs?.weightUnit ?? null,
                batteryAttributes: attrs?.batteryAttributes ?? null,
                datasheetLink: attrs?.datasheetLink ?? null,
                seriesId: seriesCtx.seriesId,
                brandId: seriesCtx.brandId,
                categoryId: seriesCtx.categoryId,
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
                selfOrder: item.selfOrder,
                status: "on_sale",
                validUntil,
                isWinnerPrice: isSpecialRow,
                isWinnerLeadTime: isSpecialRow,
                seriesId: seriesCtx.seriesId,
                brandId: seriesCtx.brandId,
                categoryId: seriesCtx.categoryId,
                importBatchId: batch.importBatchId,
              },
            });
          }

          // Product create/update（价格批次只更新 unit/series/status，不碰 productName/
          // description 等属性——价格模板无 Name 列，productName 是型号回退值，
          // 写入会覆盖产品表里的真实产品名；memo 防并发下同型号重复创建）
          const productKey = `${seriesCtx.categoryId}|${item.model}`;
          const productId = await memoProduct(productKey, async () => {
            const existingProductId = productByKey.get(productKey);
            if (!existingProductId) {
              const created = await prisma.product.create({
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
              productByKey.set(productKey, created.productId);
              return created.productId;
            }
            await prisma.product.update({
              where: { productId: existingProductId },
              data: {
                unit: item.unit,
                series: seriesCtx.seriesName,
                status: "on_sale",
                importBatchId: batch.importBatchId,
              },
            });
            return existingProductId;
          });

          // SupplierQuote upsert（价格）—— 无归属供应商的品牌不写旧报价表
          // memo 防并发下同 productId:supplierId 重复创建；isDefault 在 executor 同步段判定，全批次唯一
          if (sellPrice > 0 && seriesCtx.supplierId) {
            const supplierId = seriesCtx.supplierId; // 提取为 const：闭包内 let 收窄会失效
            const quoteKey = `${productId}:${supplierId}`;
            await memoQuote(quoteKey, async () => {
              const existingQuoteId = quoteMap.get(quoteKey);
              if (existingQuoteId) {
                await prisma.supplierQuote.update({
                  where: { quoteId: existingQuoteId },
                  data: {
                    costPrice: costPrice || sellPrice,
                    sellPrice,
                    moq: item.moq,
                    leadTime: item.leadTime,
                    validUntil: isSpecialRow ? null : computeQuoteValidUntil(),
                    isValid: true,
                  },
                });
              } else {
                const isDefault = !anyQuoteSet.has(productId);
                anyQuoteSet.add(productId);
                await prisma.supplierQuote.create({
                  data: {
                    supplierId,
                    productId,
                    costPrice: costPrice || sellPrice,
                    sellPrice,
                    moq: item.moq,
                    leadTime: item.leadTime,
                    validUntil: isSpecialRow ? null : computeQuoteValidUntil(),
                    isValid: true,
                    isDefault,
                  },
                });
                quoteMap.set(quoteKey, "");
              }
            });
          }
        }
      };

      // 限流并发执行：每行 2-3 次写，跨境 RTT 下串行是分钟级；8 路并发在连接池默认上限内
      const CONCURRENCY = 8;
      for (let i = 0; i < batch.items.length; i += CONCURRENCY) {
        await Promise.all(batch.items.slice(i, i + CONCURRENCY).map(processItem));
      }
    } catch (writeErr) {
      // 写失败：回滚认领状态允许重试（已写入的行幂等，可安全重复确认）
      await prisma.importBatch.updateMany({
        where: { importBatchId },
        data: { approvalStatus: "pending", approvedAt: null, approvedById: null },
      });
      throw writeErr;
    }

    // ── 比价任务：新价格表上线后自动比对所有 Approved 文件，写产品 ListPrice ──
    let compareSummary = "";
    if (batchType === "price") {
      const cmp = await runPriceComparison();
      compareSummary = ` ${cmp.summary}`;
    }

    return { success: true, message: `Batch confirmed and published live.${compareSummary}` };
  } catch (err) {
    // 失败原因同时打到服务端日志（next-start.log），便于排查 Neon 超时 / 约束冲突
    console.error(`[confirmImportBatch] failed batch=${importBatchId}`, err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to confirm batch: ${msg}` };
  } finally {
    // 无论成败都刷新公开页缓存（幂等，成本低）
    await revalidatePublicQuotePages();
  }
}
