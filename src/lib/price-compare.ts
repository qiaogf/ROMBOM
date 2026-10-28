// 比价引擎 — 双优胜择优（最低价 / 最快交期）
//
// 规则（与用户确认的方案一致）：
//   1. 数据范围：仅「普通类目」（导航名不含 <> / ()）且已上线、在有效期内的价格批次行
//      —— 特殊类目直接上线，不进比价池
//   2. 同 SKU 定义：同 Category + 型号 + 货况（Condition），跨分类互不覆盖
//   3. 对比字段：单价（costPrice，供应商报价）、交期（leadTime）
//   4. 产出两行优胜：
//        · 最低价优先：单价最低；单价相同取交期最短；仍相同取上传时间最新
//        · 最快交期优先：交期最短；交期相同取单价最低；仍相同取上传时间最新
//      —— 若两条为同一行，只保留一行（同时打两个优胜标记）
//   5. 后台保留全部供应商报价记录（ModelPrice 行不删除），仅用 isWinnerPrice / isWinnerLeadTime 标记线上展示行
//   6. 只刷新受影响类目/品牌的公开页缓存，不清全站缓存

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/../prisma/generated/client";
import { isSpecialCategoryName, leadTimeRank } from "@/lib/import-price";
import { expireStaleQuotes } from "@/lib/quote-validity";

export interface PriceCompareResult {
  groups: number;
  models: number;
  listPricesUpdated: number;
  quotesUpdated: number;
  winnerPriceRows: number;
  winnerLeadTimeRows: number;
  expiredModels: number;
  summary: string;
}

function round4(n: number): number {
  return Number(n.toFixed(4));
}

// 串行锁：定时任务与手动触发同一时间只允许一个比价任务执行
let compareRunning = false;

export async function runPriceComparison(): Promise<PriceCompareResult> {
  const now = new Date();
  const empty: PriceCompareResult = {
    groups: 0,
    models: 0,
    listPricesUpdated: 0,
    quotesUpdated: 0,
    winnerPriceRows: 0,
    winnerLeadTimeRows: 0,
    expiredModels: 0,
    summary: "No approved price rows to compare.",
  };

  if (compareRunning) {
    return { ...empty, summary: "Another price comparison is already running; this run was skipped." };
  }
  compareRunning = true;

  try {
    // ── 0. 先清扫过期报价 ──
    const expired = await expireStaleQuotes(now).catch(() => ({
      modelsExpired: 0,
      quotesExpired: 0,
      categorySlugs: [] as string[],
      brandSlugs: [] as string[],
    }));
    // 缓存失效范围：过期报价所属类目/品牌 + 本次参比行所属类目/品牌
    const categorySlugs = new Set<string>(expired.categorySlugs);
    const brandSlugs = new Set<string>(expired.brandSlugs);

    // ── 1. 取参比行：已上线 + 有效期内 + 价格批次已批准 + 非缺货 ──
    const rows = await prisma.modelPrice.findMany({
      where: {
        AND: [
          { status: "on_sale" },
          { isActive: true },
          { sellPrice: { gt: 0 } },
          { importBatch: { approvalStatus: "approved", batchType: "price" } },
          { OR: [{ leadTime: null }, { leadTime: { not: "Out of Stock" } }] },
          { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
        ],
      },
      select: {
        modelPriceId: true,
        model: true,
        brandName: true,
        condition: true,
        leadTime: true,
        costPrice: true,
        sellPrice: true,
        categoryId: true,
        createdAt: true,
        category: { select: { categoryName: true, slug: true } },
        series: { select: { seriesName: true, brand: { select: { brandName: true, slug: true } } } },
      },
    });
    for (const r of rows) {
      if (r.category?.slug) categorySlugs.add(r.category.slug);
      if (r.series?.brand?.slug) brandSlugs.add(r.series.brand.slug);
    }
    if (rows.length === 0) {
      return { ...empty, expiredModels: expired.modelsExpired };
    }

    // 排除特殊类目（不进比价池）
    const pool = rows.filter((r) => {
      const catName = r.category?.categoryName ?? "";
      return !isSpecialCategoryName(catName);
    });
    if (pool.length === 0) {
      return { ...empty, expiredModels: expired.modelsExpired };
    }

    // ── 2. 分组：Category + 型号 + 货况（同型号跨分类/跨供应商各自成组）──
    const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();
    const groups = new Map<string, typeof pool>();
    for (const r of pool) {
      const key = [r.categoryId ?? "na", norm(r.model), norm(r.condition)].join("|");
      const arr = groups.get(key);
      if (arr) arr.push(r);
      else groups.set(key, [r]);
    }

    // ── 3. 组内双优胜 ──
    const cheapestWinners = new Map<string, (typeof pool)[number]>();
    const fastestWinners = new Map<string, (typeof pool)[number]>();
    for (const [key, members] of groups) {
      const byPrice = [...members].sort((a, b) => {
        const p = Number(a.costPrice) - Number(b.costPrice);
        if (Math.abs(p) > 0.0001) return p;
        const l = leadTimeRank(a.leadTime) - leadTimeRank(b.leadTime);
        if (l !== 0) return l;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      const byLead = [...members].sort((a, b) => {
        const l = leadTimeRank(a.leadTime) - leadTimeRank(b.leadTime);
        if (l !== 0) return l;
        const p = Number(a.costPrice) - Number(b.costPrice);
        if (Math.abs(p) > 0.0001) return p;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      cheapestWinners.set(key, byPrice[0]);
      fastestWinners.set(key, byLead[0]);
    }

    const winnerPriceIds = new Set(Array.from(cheapestWinners.values()).map((r) => r.modelPriceId));
    const winnerLeadIds = new Set(Array.from(fastestWinners.values()).map((r) => r.modelPriceId));
    const scopeIds = pool.map((r) => r.modelPriceId);

    // ── 4. 写标记：先清空本批次参比行的优胜标记，再标记优胜行 ──
    const updates: Prisma.PrismaPromise<unknown>[] = [
      prisma.modelPrice.updateMany({
        where: { modelPriceId: { in: scopeIds } },
        data: { isWinnerPrice: false, isWinnerLeadTime: false },
      }),
    ];
    for (const id of winnerPriceIds) {
      updates.push(prisma.modelPrice.update({ where: { modelPriceId: id }, data: { isWinnerPrice: true } }));
    }
    for (const id of winnerLeadIds) {
      updates.push(prisma.modelPrice.update({ where: { modelPriceId: id }, data: { isWinnerLeadTime: true } }));
    }

    // ── 5. 型号级最低优胜价 → 同步旧 Product.listPrice（兼容旧展示通道）──
    // 回写键：Category + Model（同型号在不同分类下独立报价，互不覆盖）
    const modelMin = new Map<string, number>();
    for (const w of [...cheapestWinners.values(), ...fastestWinners.values()]) {
      const p = Number(w.sellPrice);
      const key = `${w.categoryId ?? "na"}|${w.model}`;
      const cur = modelMin.get(key);
      if (cur === undefined || p < cur) modelMin.set(key, p);
    }
    const modelNames = Array.from(
      new Set([...cheapestWinners.values(), ...fastestWinners.values()].map((w) => w.model)),
    );
    const productList = await prisma.product.findMany({
      where: { model: { in: modelNames } },
      select: { productId: true, categoryId: true, model: true, listPrice: true },
    });
    const productIds = productList.map((p) => p.productId);
    const quoteList =
      productIds.length > 0
        ? await prisma.supplierQuote.findMany({
            where: { productId: { in: productIds }, isValid: true },
            select: { quoteId: true, productId: true, sellPrice: true },
          })
        : [];

    const productKeyById = new Map(productList.map((p) => [p.productId, `${p.categoryId}|${p.model}`]));
    let listPricesUpdated = 0;
    let quotesUpdated = 0;

    for (const p of productList) {
      const target = modelMin.get(`${p.categoryId}|${p.model}`);
      if (target === undefined) continue;
      const current = p.listPrice !== null ? Number(p.listPrice) : null;
      if (current === null || Math.abs(current - target) > 0.0001) {
        listPricesUpdated++;
        updates.push(prisma.product.update({ where: { productId: p.productId }, data: { listPrice: round4(target) } }));
      }
    }
    for (const q of quoteList) {
      const target = modelMin.get(productKeyById.get(q.productId) ?? "");
      if (target === undefined) continue;
      if (Math.abs(Number(q.sellPrice) - target) > 0.0001) {
        quotesUpdated++;
        updates.push(prisma.supplierQuote.update({ where: { quoteId: q.quoteId }, data: { sellPrice: round4(target) } }));
      }
    }

    if (updates.length > 0) await prisma.$transaction(updates);

    const result: PriceCompareResult = {
      groups: groups.size,
      models: modelMin.size,
      listPricesUpdated,
      quotesUpdated,
      winnerPriceRows: winnerPriceIds.size,
      winnerLeadTimeRows: winnerLeadIds.size,
      expiredModels: expired.modelsExpired,
      summary: `Compared ${groups.size} SKU groups (${modelMin.size} models) — ${winnerPriceIds.size} lowest-price + ${winnerLeadIds.size} fastest-lead winners${
        listPricesUpdated + quotesUpdated > 0 ? `, ${listPricesUpdated + quotesUpdated} legacy prices synced` : ""
      }${expired.modelsExpired > 0 ? `, ${expired.modelsExpired} expired quotes off-shelf` : ""}.`,
    };

    // ── 6. 刷新公开页缓存：仅受影响类目/品牌/型号详情页（对应 SKU），不清全站 ──
    if (winnerPriceIds.size > 0 || expired.modelsExpired > 0) {
      const { revalidatePath, revalidateTag } = await import("next/cache");
      for (const slug of categorySlugs) revalidateTag(`category-${slug}`, { expire: 0 });
      for (const slug of brandSlugs) revalidateTag(`brand-${slug}`, { expire: 0 });
      // 型号详情页为 ISR 静态页：仅刷新受影响类目下的产品详情，避免全站 revalidatePath
      const affectedCategoryIds = new Set(rows.map((r) => r.categoryId).filter((id): id is string => Boolean(id)));
      const productIdsToRefresh = new Set(
        productList
          .filter((p) => affectedCategoryIds.has(p.categoryId))
          .map((p) => p.productId),
      );
      for (const productId of productIdsToRefresh) revalidatePath(`/products/${productId}`);
    }

    return result;
  } catch {
    return { ...empty, summary: "Price comparison skipped (internal error)." };
  } finally {
    compareRunning = false;
  }
}
