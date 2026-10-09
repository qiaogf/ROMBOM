// Shared types + cell classNames for the API account table.
// Phase 3：加 customerId（强关联客户）+ 客户/品牌-系列下拉选项类型 + 工具函数。

export interface ApiAccount {
  apiAccountId: string;
  /** 强关联客户 ID；legacy 行为空（无主数据） */
  customerId: string | null;
  customerName: string;
  email: string;
  apiKey: string;
  /** 授权可见的 Series.seriesId 白名单，逗号分隔；空=全部品牌系列 */
  brandSeriesFilter: string;
  markupRate: number;
  quotaPerMinute: number;
  isActive: boolean;
}

/** 可绑定的客户下拉选项（仅 isActive=true 且未绑定密钥的客户） */
export interface CustomerOption {
  customerId: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string;
}

/** Brand → Series 两级勾选树（仅 isActive 的 brand/series） */
export interface BrandSeriesOption {
  brandId: string;
  brandName: string;
  series: { seriesId: string; seriesName: string }[];
}

/** 客户显示名：firstName+lastName 优先，回退 companyName，再回退 email */
export function customerDisplayName(c: {
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string;
}): string {
  const full = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
  if (full) return full;
  if (c.companyName) return c.companyName;
  return c.email;
}

/** seriesIds 数组 → brandSeriesFilter CSV（空数组=全部可见） */
export function seriesIdsToFilter(ids: string[]): string {
  return ids.filter(Boolean).join(",");
}

/** brandSeriesFilter CSV → seriesIds 数组（空字符串=空数组=全部可见） */
export function filterToSeriesIds(filter: string): string[] {
  return filter
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const inputCls =
  "w-full border border-slate-300 rounded px-1 py-0.5 text-[11px] text-slate-900 focus:outline-none focus:border-[#336633] focus:ring-1 focus:ring-[#336633]";
export const numCls =
  "w-full border border-slate-300 rounded px-1 py-0.5 text-[11px] text-slate-900 text-center focus:outline-none focus:border-[#336633] focus:ring-1 focus:ring-[#336633] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
