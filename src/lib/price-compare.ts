// 定时比价任务（事件触发版）— 价格批次上线/改加价后自动执行
//
// 规则（与用户确认的方案一致）：
//   1. 触发：有新价格表 Confirm 上线，或 approved 批次的 Markup 被人工修改
//   2. 数据源：所有 approvalStatus = approved 的价格批次（ImportBatch.batchType = price）里的型号行
//   3. 分组：按 Brand → Series → Model 逐级缩小范围，Model & Condition & Leadtime 相同为一组
//   4. 取值：每组内筛选人工加价后（sellPrice）的最低价，作为该型号的 ListPrice 写入 Product.listPrice
//   5. 同步：同步更新该产品所有有效 SupplierQuote.sellPrice（公开报价表与购物车成交价读报价，
//      保证展示价 = ListPrice = 下单价，三者一致），并刷新公开页缓存
//
// 多组同型号（如同型号不同 Condition）时，Product.listPrice 取各组优胜价中的最低值。

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/../prisma/generated/client";

export interface PriceCompareResult {
  groups: number; // 分组数
  models: number; // 涉及型号数
  listPricesUpdated: number; // 实际改写的 Product.listPrice 数
  quotesUpdated: number; // 同步的 SupplierQuote 数
  summary: string; // 给管理界面展示的一句话结果
}

function round4(n: number): number {
  return Number(n.toFixed(4));
}

export async function runPriceComparison(): Promise<PriceCompareResult> {
  const empty: PriceCompareResult = {
    groups: 0,
    models: 0,
    listPricesUpdated: 0,
    quotesUpdated: 0,
    summary: "No approved price rows to compare.",
  };

  try {
    // ── 1. 数据源：所有 Approved 价格批次的有效价格行 ──
    const rows = await prisma.modelPrice.findMany({
      where: {
        sellPrice: { gt: 0 },
        importBatch: { approvalStatus: "approved", batchType: "price" },
      },
      select: {
        modelPriceId: true,
        model: true,
        brandName: true,
        condition: true,
        leadTime: true,
        sellPrice: true,
        series: { select: { seriesName: true, brand: { select: { brandName: true } } } },
      },
    });
    if (rows.length === 0) return empty;

    // ── 2. 分组：Brand & Series & Model & Condition & Leadtime（归一化，空值参与键但不影响匹配） ──
    const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();
    const groupWinners = new Map<string, (typeof rows)[number]>();
    for (const r of rows) {
      const key = [
        norm(r.series?.brand?.brandName ?? r.brandName),
        norm(r.series?.seriesName),
        norm(r.model),
        norm(r.condition),
        norm(r.leadTime),
      ].join("|");
      const cur = groupWinners.get(key);
      // 组内筛选人工加价后的最低价；同价保留先出现行
      if (!cur || Number(r.sellPrice) < Number(cur.sellPrice)) groupWinners.set(key, r);
    }

    // ── 3. 型号级 ListPrice = 各组优胜价中的最低值 ──
    const modelMin = new Map<string, number>();
    for (const w of groupWinners.values()) {
      const p = Number(w.sellPrice);
      const cur = modelMin.get(w.model);
      if (cur === undefined || p < cur) modelMin.set(w.model, p);
    }

    // ── 4. 写入 Product.listPrice + 同步有效报价 ──
    const models = Array.from(modelMin.keys());
    const productList = await prisma.product.findMany({
      where: { model: { in: models } },
      select: { productId: true, model: true, listPrice: true },
    });
    const productIds = productList.map((p) => p.productId);
    const quoteList =
      productIds.length > 0
        ? await prisma.supplierQuote.findMany({
            where: { productId: { in: productIds }, isValid: true },
            select: { quoteId: true, productId: true, sellPrice: true },
          })
        : [];

    const minByModel = modelMin; // model → 目标 ListPrice
    const modelByProductId = new Map(productList.map((p) => [p.productId, p.model]));
    const updates: Prisma.PrismaPromise<unknown>[] = [];
    let listPricesUpdated = 0;
    let quotesUpdated = 0;

    for (const p of productList) {
      const target = minByModel.get(p.model);
      if (target === undefined) continue;
      const current = p.listPrice !== null ? Number(p.listPrice) : null;
      if (current === null || Math.abs(current - target) > 0.0001) {
        listPricesUpdated++;
        updates.push(prisma.product.update({ where: { productId: p.productId }, data: { listPrice: round4(target) } }));
      }
    }
    for (const q of quoteList) {
      // 报价同步为组内最低（ListPrice 同步到公开表与购物车成交价的唯一通道）
      const target = minByModel.get(modelByProductId.get(q.productId) ?? "");
      if (target === undefined) continue;
      if (Math.abs(Number(q.sellPrice) - target) > 0.0001) {
        quotesUpdated++;
        updates.push(prisma.supplierQuote.update({ where: { quoteId: q.quoteId }, data: { sellPrice: round4(target) } }));
      }
    }

    if (updates.length > 0) await prisma.$transaction(updates);

    const result: PriceCompareResult = {
      groups: groupWinners.size,
      models: modelMin.size,
      listPricesUpdated,
      quotesUpdated,
      summary:
        listPricesUpdated === 0 && quotesUpdated === 0
          ? `Compared ${groupWinners.size} groups (${modelMin.size} models) — all ListPrices up to date.`
          : `Compared ${groupWinners.size} groups (${modelMin.size} models) — ${listPricesUpdated} ListPrices updated, ${quotesUpdated} quotes synced.`,
    };

    // ── 5. 有变更时刷新公开报价页缓存（catalog tag + ISR 路径） ──
    if (result.listPricesUpdated > 0 || result.quotesUpdated > 0) {
      const { revalidatePath, revalidateTag } = await import("next/cache");
      revalidatePath("/", "layout");
      revalidateTag("catalog", { expire: 0 });
    }

    return result;
  } catch {
    // 比价失败不阻断主流程（Confirm/Markup 已成功），返回空结果由调用方决定展示
    return { ...empty, summary: "Price comparison skipped (internal error)." };
  }
}
