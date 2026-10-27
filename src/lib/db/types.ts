// Shared types and utility functions for db query modules.

// ============ 类型定义 ============

export interface Category {
  id: string;
  name: string;
  description: string | null;
  slug: string;
}

export interface Brand {
  id: string;
  name: string;
  description: string | null;
  slug: string;
}

export interface Product {
  id: string;
  /** 默认有效报价 ID，加购时传给 cartActions.addToCart */
  quoteId: string;
  name: string;
  model: string;
  description: string | null;
  unit: string;
  price: number;
  /** 最小起订量（来自有效报价），价格表数量输入以此为下限 */
  moq: number;
  /** Product Condition（来自 ModelPrice.condition，CSV 导入的自由文本） */
  condition?: string | null;
  /** Leadtime 统一文本：In Stock（现货）/ Out of Stock（缺货）/ 交期文本；null/空 视同 In Stock */
  leadTime: string | null;
  categoryId: string;
  brandId: string;
  seriesName: string | null;
  seriesDesc: string | null;
}

export interface SeriesInfo {
  seriesName: string;
  seriesDesc: string | null;
}

export interface SeriesGroup {
  seriesName: string;
  seriesSlug: string;
  seriesDesc: string | null;
  products: Product[];
}

/** 类目页分组：一个关联品牌 + 该品牌在此类目下按系列分组的型号产品 */
export interface BrandProductsGroup {
  brand: Brand;
  seriesGroups: SeriesGroup[];
}

/** 品牌页分组：一个关联类目 + 该品牌在此类目下按系列分组的型号产品 */
export interface CategoryProductsGroup {
  category: Category;
  seriesGroups: SeriesGroup[];
}

// ============ 工具函数 ============

/** 系列名 → URL slug（与导入路由保持一致） */
export function slugify(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** 将 Prisma Decimal 转换为 number */
export function toNumber(value: { toNumber: () => number } | string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value) || 0;
  if (typeof value.toNumber === "function") return value.toNumber();
  return 0;
}

/**
 * 合并系列的两个数据源并按系列名（小写）去重：
 *   1) Series 表记录（新模型，带描述，优先）
 *   2) Product 表 series 文本（旧兼容模型，补充 Series 表中缺失的系列）
 * 结果按系列名字母序返回。
 */
export function mergeSeriesSources(
  seriesFromTable: { seriesName: string; description: string | null }[],
  seriesFromProducts: { series: string | null }[]
): SeriesInfo[] {
  const merged = new Map<string, SeriesInfo>();

  for (const s of seriesFromTable) {
    const name = s.seriesName.trim();
    if (!name) continue;
    merged.set(name.toLowerCase(), {
      seriesName: name,
      seriesDesc: s.description || null,
    });
  }

  for (const p of seriesFromProducts) {
    if (!p.series) continue;
    const name = p.series.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!merged.has(key)) {
      merged.set(key, { seriesName: name, seriesDesc: null });
    }
  }

  return Array.from(merged.values()).sort((a, b) =>
    a.seriesName.localeCompare(b.seriesName)
  );
}
