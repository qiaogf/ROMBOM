/**
 * 客户 API 价格查询内核
 *
 * 业务口径：
 *  - 「通过的价格」= ModelPrice.status = on_sale 且 isActive = true，且排除缺货（stockStatus = out_of_stock）
 *  - 同货况（condition）同货期（leadTime）下，同一型号取最低 costPrice（多供应商比价选最优）
 *  - API 价 = round2(最优成本价 × (1 + markupRatePercent / 100))；加成率 ≤ 0 时不加价
 *  - 授权范围 = Series.seriesId 白名单；空数组 = 全部品牌系列
 *  - 分页以「型号」为单位：同一型号的多个货况/货期行不会跨页拆分
 */
import { Prisma } from "@/../prisma/generated/client";
import { prisma } from "@/lib/prisma";

export interface ApiPriceRow {
  /** 品牌名（取自 series.brand.brandName） */
  brand: string | null;
  model: string;
  /** 加成后的 API 价（USD），两位小数 */
  price: number;
  /** 货况（CSV 自由文本，如 New / Used / Refurbished），无值为 null */
  condition: string | null;
  /** 货期（自由文本，如 7 days / In stock），无值为 null */
  leadTime: string | null;
}

export interface QueryApiPricesParams {
  /** 授权可见的 seriesId 白名单；空数组 = 全部 */
  seriesWhitelist: string[];
  /** 型号查询词（模糊 contains）；null/空 = 不按型号过滤 */
  modelQuery: string | null;
  /** 客户加成率（百分数，如 15 表示 +15%） */
  markupRatePercent: number;
  /** 每页型号数（1–500） */
  limit: number;
  /** 分页偏移（型号数） */
  offset: number;
}

export interface QueryApiPricesResult {
  /** 匹配的型号总数（非结果行数；一个型号可能对应多个货况/货期行） */
  total: number;
  limit: number;
  offset: number;
  rows: ApiPriceRow[];
}

const MAX_PAGE_SIZE = 500;

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeText(value: string | null): string {
  // null 与空白字符串归为同一「无值」组
  return value?.trim() ? value.trim() : "";
}

export async function queryApiPrices(
  params: QueryApiPricesParams
): Promise<QueryApiPricesResult> {
  const limit = Math.min(Math.max(Math.trunc(params.limit) || 1, 1), MAX_PAGE_SIZE);
  const offset = Math.max(Math.trunc(params.offset) || 0, 0);
  const markup = Number.isFinite(params.markupRatePercent) ? params.markupRatePercent : 0;
  const modelQuery = params.modelQuery?.trim() || null;

  const where: Prisma.ModelPriceWhereInput = {
    status: "on_sale",
    isActive: true,
    stockStatus: { not: "out_of_stock" },
  };
  if (params.seriesWhitelist.length > 0) {
    where.seriesId = { in: params.seriesWhitelist };
  }
  if (modelQuery) {
    where.model = { contains: modelQuery };
  }

  // ① 取匹配的去重型号列表（型号为分页单位）
  const distinctModels = await prisma.modelPrice.findMany({
    where,
    distinct: ["model"],
    select: { model: true },
    orderBy: { model: "asc" },
  });

  // ② 精确匹配排最前，其余保持字母序
  const allModels = distinctModels.map((m) => m.model);
  if (modelQuery) {
    const q = modelQuery.toLowerCase();
    allModels.sort((a, b) => {
      const aExact = a.trim().toLowerCase() === q ? 0 : 1;
      const bExact = b.trim().toLowerCase() === q ? 0 : 1;
      return aExact - bExact;
    });
  }

  const total = allModels.length;
  const pageModels = allModels.slice(offset, offset + limit);

  if (pageModels.length === 0) {
    return { total, limit, offset, rows: [] };
  }

  // ③ 取本页型号的全部通过价明细（含品牌名：series.brand.brandName）
  const items = await prisma.modelPrice.findMany({
    where: { ...where, model: { in: pageModels } },
    select: {
      model: true,
      costPrice: true,
      condition: true,
      leadTime: true,
      series: { select: { brand: { select: { brandName: true } } } },
    },
  });

  // ④ 按 型号 + 货况 + 货期 分组，组内取最低成本价
  interface BestGroup {
    brand: string | null;
    model: string;
    condition: string | null;
    leadTime: string | null;
    minCost: number;
  }
  const groups = new Map<string, BestGroup>();
  for (const item of items) {
    const conditionKey = normalizeText(item.condition);
    const leadTimeKey = normalizeText(item.leadTime);
    const key = `${item.model}\u0000${conditionKey}\u0000${leadTimeKey}`;
    const cost = Number(item.costPrice);
    const existing = groups.get(key);
    const brandName = item.series?.brand?.brandName?.trim() || null;
    if (!existing || cost < existing.minCost) {
      groups.set(key, {
        brand: brandName,
        model: item.model,
        condition: conditionKey || null,
        leadTime: leadTimeKey || null,
        minCost: cost,
      });
    }
  }

  // ⑤ 输出：按 pageModels 顺序（型号），同型号内货况、货期升序，保证稳定
  const modelOrder = new Map(pageModels.map((m, i) => [m, i]));
  const rows = Array.from(groups.values())
    .map((g) => ({
      brand: g.brand,
      model: g.model,
      price: markup > 0 ? round2(g.minCost * (1 + markup / 100)) : round2(g.minCost),
      condition: g.condition,
      leadTime: g.leadTime,
    }))
    .sort((a, b) => {
      const byModel = (modelOrder.get(a.model) ?? 0) - (modelOrder.get(b.model) ?? 0);
      if (byModel !== 0) return byModel;
      const byCondition = (a.condition ?? "").localeCompare(b.condition ?? "");
      if (byCondition !== 0) return byCondition;
      return (a.leadTime ?? "").localeCompare(b.leadTime ?? "");
    });

  return { total, limit, offset, rows };
}

/**
 * 解析 ApiAccount.brandSeriesFilter（seriesId 逗号白名单）。
 * 空字符串 → 空数组（= 全部可见）。
 */
export function parseSeriesWhitelist(brandSeriesFilter: string): string[] {
  return brandSeriesFilter
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
