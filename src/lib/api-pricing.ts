/**
 * 客户 API 价格查询内核
 *
 * 业务口径：
 *  - 「通过的价格」= ModelPrice.status = on_sale 且 isActive = true，且排除缺货（leadTime = "Out of Stock"；空值视同现货）
 *  - 线上只输出比价优胜行（isWinnerPrice 最低价 / isWinnerLeadTime 最快交期），特殊类目导入时已自带优胜标记
 *  - 同一型号可输出两行：最低价一行 + 最快交期一行；两者为同一行时只输出一行（tag=both）
 *  - API 价 = round2(该行 costPrice × (1 + markupRatePercent / 100))；加成率 ≤ 0 时不加价
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
  /** 优胜类型：lowest=最低价行 / fastest=最快交期行 / both=同一行双优胜 */
  tag: "lowest" | "fastest" | "both";
}

export interface QueryApiPricesParams {
  /** 授权可见的 seriesId 白名单；空数组 = 全部 */
  seriesWhitelist: string[];
  /** 型号查询词，支持逗号分隔多个型号（每个模糊 contains，任一匹配）；null/空 = 不按型号过滤 */
  modelQuery: string | null;
  /** 客户加成率（百分数，如 15 表示 +15%） */
  markupRatePercent: number;
  /** 每页型号数（1–500） */
  limit: number;
  /** 分页偏移（型号数） */
  offset: number;
}

export interface QueryApiPricesResult {
  /** 匹配的型号总数（非结果行数；一个型号可能对应多行） */
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
  // 型号查询词：逗号分隔多型号，空词剔除
  const modelTerms = params.modelQuery
    ? params.modelQuery.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  // 基础过滤（不含型号条件），明细查询复用
  // 缺货排除：导入归一化后缺货行恒为 "Out of Stock"；null 视同现货，需 OR null 避免被 NOT 排除
  const andClauses: Prisma.ModelPriceWhereInput[] = [
    { status: "on_sale" },
    { isActive: true },
    // 线上只输出比价优胜行
    { OR: [{ isWinnerPrice: true }, { isWinnerLeadTime: true }] },
    { OR: [{ leadTime: null }, { leadTime: { not: "Out of Stock" } }] },
  ];
  if (params.seriesWhitelist.length > 0) {
    andClauses.push({ seriesId: { in: params.seriesWhitelist } });
  }

  const where: Prisma.ModelPriceWhereInput = { AND: [...andClauses] };
  if (modelTerms.length === 1) {
    andClauses.push({ model: { contains: modelTerms[0] } });
    where.AND = [...andClauses];
  } else if (modelTerms.length > 1) {
    andClauses.push({ OR: modelTerms.map((term) => ({ model: { contains: term } })) });
    where.AND = [...andClauses];
  }

  // ① 取匹配的去重型号列表（型号为分页单位）
  const distinctModels = await prisma.modelPrice.findMany({
    where,
    distinct: ["model"],
    select: { model: true },
    orderBy: { model: "asc" },
  });

  // ② 精确匹配（任一查询词）排最前，其余保持字母序
  const allModels = distinctModels.map((m) => m.model);
  if (modelTerms.length > 0) {
    const terms = modelTerms.map((t) => t.toLowerCase());
    allModels.sort((a, b) => {
      const aExact = terms.includes(a.trim().toLowerCase()) ? 0 : 1;
      const bExact = terms.includes(b.trim().toLowerCase()) ? 0 : 1;
      return aExact - bExact;
    });
  }

  const total = allModels.length;
  const pageModels = allModels.slice(offset, offset + limit);

  if (pageModels.length === 0) {
    return { total, limit, offset, rows: [] };
  }

  // ③ 取本页型号的全部优胜行明细（含品牌名）
  const items = await prisma.modelPrice.findMany({
    where: { AND: [...andClauses, { model: { in: pageModels } }] },
    select: {
      modelPriceId: true,
      model: true,
      costPrice: true,
      condition: true,
      leadTime: true,
      isWinnerPrice: true,
      isWinnerLeadTime: true,
      brand: { select: { brandName: true } },
      series: { select: { brand: { select: { brandName: true } } } },
    },
  });

  // ④ 直接输出优胜行：同一行最多出现一次；两行可能同型号不同交期/价格
  const seen = new Set<string>();
  const rows: ApiPriceRow[] = [];
  for (const item of items) {
    if (seen.has(item.modelPriceId)) continue;
    seen.add(item.modelPriceId);
    const brandName =
      (item.brand?.brandName ?? item.series?.brand?.brandName)?.trim() || null;
    rows.push({
      brand: brandName,
      model: item.model,
      price: markup > 0 ? round2(Number(item.costPrice) * (1 + markup / 100)) : round2(Number(item.costPrice)),
      condition: normalizeText(item.condition) || null,
      leadTime: normalizeText(item.leadTime) || null,
      tag: item.isWinnerPrice && item.isWinnerLeadTime ? "both" : item.isWinnerPrice ? "lowest" : "fastest",
    });
  }

  // ⑤ 输出：按型号分页顺序 → 最低价行优先 → 货况、货期升序
  const modelOrder = new Map(pageModels.map((m, i) => [m, i]));
  rows.sort((a, b) => {
    const byModel = (modelOrder.get(a.model) ?? 0) - (modelOrder.get(b.model) ?? 0);
    if (byModel !== 0) return byModel;
    const rank = (t: ApiPriceRow["tag"]) => (t === "both" ? 0 : t === "lowest" ? 1 : 2);
    const byTag = rank(a.tag) - rank(b.tag);
    if (byTag !== 0) return byTag;
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
