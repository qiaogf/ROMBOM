/**
 * Shared CSV/Excel parsing + header resolution helpers for import-price routes.
 *
 * Used by:
 *   - src/app/api/admin/import-price/route.ts   (product_info + price batches)
 *   - src/app/api/supplier/import-price/route.ts (price batches only)
 *
 * Server-safe: no React/next imports. Pure data parsing.
 * `slugify` lives in @/lib/db/types — both routes import it from there directly.
 */

/** RFC-4180 compliant CSV parser (handles quoted fields, embedded commas/newlines). */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ",") { row.push(field); field = ""; i++; continue; }
    if (ch === "\r") { if (input[i + 1] === "\n") i++; row.push(field); field = ""; rows.push(row); row = []; i++; continue; }
    if (ch === "\n") { row.push(field); field = ""; rows.push(row); row = []; i++; continue; }
    field += ch; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  if (rows.length > 0) { const last = rows[rows.length - 1]; if (last.length === 1 && last[0] === "") rows.pop(); }
  return rows;
}

/** Excel (.xlsx/.xls) parser via exceljs. Returns rows as string[][]. */
export async function parseExcel(buffer: Buffer): Promise<string[][]> {
  const { Workbook } = await import("exceljs");
  const wb = new Workbook();
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("No worksheet found in Excel file.");
  const rows: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row: { eachCell: (opts: { includeEmpty: boolean }, cb: (cell: { value: unknown }) => void) => void }) => {
    const vals: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell: { value: unknown }) => {
      const v = cell.value;
      if (v === null || v === undefined) vals.push("");
      else if (typeof v === "object" && v !== null && "result" in (v as object)) vals.push(String((v as { result: unknown }).result));
      else vals.push(String(v));
    });
    rows.push(vals);
  });
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/**
 * Header alias map — canonical name → list of accepted aliases (English + Chinese).
 * Union of admin and supplier templates. Canonical keys not used by a route
 * (e.g. "qty" for admin) are simply ignored by that route's REQUIRED check.
 */
export const HEADER_ALIASES: Record<string, string[]> = {
  productname: ["productname", "name", "product", "名称", "产品名称", "产品名"],
  model: ["model", "modelno", "modelnumber", "partnumber", "型号"],
  description: ["description", "desc", "描述", "产品描述"],
  origin: ["origin", "产地", "原产地", "生产地", "placeoforigin", "countryoforigin"],
  certification: ["certification", "certifications", "cert", "认证", "认证信息", "证书", "certificate"],
  brandname: ["brand", "brandname", "品牌", "品牌名称"],
  category: ["category", "categoryname", "productcategory", "品类", "类别", "分类", "产品分类"],
  series: ["series", "系列", "系列slug"],
  condition: ["productcondition", "condition", "产品状况", "产品情况", "状况"],
  length: ["length", "长", "长度"],
  width: ["width", "宽", "宽度"],
  height: ["height", "高", "高度"],
  diameter: ["diameter", "直径"],
  dimensionunit: ["dimensionunit", "dimension", "尺寸单位"],
  weight: ["weight", "重量", "产品重量"],
  packingweight: ["packingweight", "packing", "包装重量", "包装重"],
  weightunit: ["weightunit", "重量单位"],
  batteryattributes: ["batteryattributes", "battery", "电池", "电池属性"],
  datasheetlink: ["datasheetlink", "datasheet", "数据手册", "规格书"],
  costprice: ["costprice", "cost", "成本价", "成本"],
  unitprice: ["unitprice", "price", "单价", "价格"],
  sellprice: ["sellprice", "售价", "销售价"],
  markup: ["markup", "加价", "加价率", "毛利率", "利润率"],
  moq: ["moq", "quantity", "qty", "数量", "起订量", "最小起订量"],
  // "qty" 列在新模板中作为客户建议采购数量（区别于 MOQ），但 schema 不存储，仅做展示参考
  qty: ["qty"],
  unit: ["unit", "uom", "单位", "计量单位"],
  stockstatus: ["stockstatus", "status", "stock", "货况", "库存状态", "货况选项"],
  leadtime: ["leadtime", "deliverytime", "delivery", "货期", "交期", "交货期"],
};

/** Normalize header text: lowercase + strip whitespace/underscores/punct. */
export function normHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s_\-()（）:：/]/g, "");
}

/**
 * Resolve a raw header cell to its canonical name.
 * Exact match on normalized alias; falls back to the normalized key itself
 * (so unknown headers like "foobar" stay as "foobar" and are simply ignored).
 */
export function resolveHeader(raw: string): string {
  const key = normHeader(raw);
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some((a) => normHeader(a) === key)) return canonical;
  }
  return key;
}

/**
 * Parse a numeric string, stripping currency symbols / thousands separators / unit suffixes.
 * "$1,234.56" → 1234.56; "15.00 USD" → 15.00; "" → null; "abc" → null.
 */
export function toDecimal(value: string | undefined): number | null {
  if (!value) return null;
  // 剥离货币符号/千分位/单位后缀
  const cleaned = value.replace(/[^0-9.\-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Leadtime 列归一化（stockStatus + leadTime 合并为单一 leadTime 后的导入口径）：
 *   空 → "In Stock"；含 "out of stock"/"缺货" → "Out of Stock"；
 *   含 "in stock"/"现货"/"stock" → "In Stock"；否则保留原文（如 "3-5 days"）。
 */
export function normalizeLeadtime(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  if (!v) return "In Stock";
  const t = v.toLowerCase();
  if (t.includes("out of stock") || v.includes("缺货")) return "Out of Stock";
  if (t.includes("stock") || v.includes("现货")) return "In Stock";
  return v;
}

// ── 字段长度上限（字符）—— PC 端列宽按字符上限定宽，超限行在导入时拒绝 ──
// Category 不在此列：它必须匹配导航已有类目（存在性校验已覆盖，且已存在类目名可超 15 字符）
export const FIELD_LIMITS = {
  brandname: 15,
  series: 15,
  model: 20,
  productname: 50,
  description: 150,
} as const;

/**
 * 校验单行字段长度。返回首个超限字段的错误消息；全部合规返回 null。
 * 仅校验将写入/新建的名称字段；匹配到系统已有系列的行无需校验 Series 长度。
 */
export function validateFieldLengths(fields: {
  brandname?: string | null;
  series?: string | null;
  model?: string | null;
  productname?: string | null;
  description?: string | null;
}): string | null {
  const checks: Array<[keyof typeof FIELD_LIMITS, string, string | null | undefined]> = [
    ["brandname", "Brand", fields.brandname],
    ["series", "Series", fields.series],
    ["model", "Model", fields.model],
    ["productname", "Product", fields.productname],
    ["description", "Description", fields.description],
  ];
  for (const [key, label, value] of checks) {
    if (value && value.length > FIELD_LIMITS[key]) {
      return `${label} "${value.slice(0, 30)}${value.length > 30 ? "…" : ""}" exceeds the ${FIELD_LIMITS[key]}-character limit (${value.length} chars).`;
    }
  }
  return null;
}

/** Brand 缺失时的自动填充品牌名（有 Series 无 Brand 的行归此品牌；复用系统已有的 Generic 品牌） */
export const GENERIC_BRAND_NAME = "Generic";

/** 特殊类目下 Brand/Series 都为空时的统一分组系列名（展示在页面末尾） */
export const OTHERS_SERIES_NAME = "(Others)";

/** 特殊类目判定：`<xxx>` / `(xxx)` 格式（点击跳过系列选择，直接展示公开价表） */
export function isSpecialCategoryName(name: string): boolean {
  return /[()<>]/.test(name);
}

// ── 报价行唯一键 / 批次内去重辅助 ──

/** 文本归一化：去首尾空格 + 转小写（唯一键/去重键统一口径） */
export function normQuoteText(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

/** 交期排序权重：越小越快。空值视同现货；Out of Stock 视为最慢 */
export function leadTimeRank(lt: string | null | undefined): number {
  const s = (lt ?? "").trim().toLowerCase();
  if (!s) return 0;
  if (s.includes("out of stock")) return 99999;
  if (s.includes("in stock")) return 0;
  const m = s.match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : 10000;
}

export interface QuoteKeyParts {
  categoryId: string;
  model: string;
  condition: string | null;
  supplierId: string | null;
  brandId: string | null;
}

/** 报价行唯一键：Category + Model + Condition + 供应商键（供应商 > 品牌 > none） */
export function buildModelPriceQuoteKey(p: QuoteKeyParts): string {
  const supplierKey = p.supplierId ? `s:${p.supplierId}` : p.brandId ? `b:${p.brandId}` : "none";
  return [p.categoryId, normQuoteText(p.model), normQuoteText(p.condition), supplierKey].join("|");
}

/** 产品属性行唯一键（product_info 批次），与价格/报价行分离 */
export function buildBaseQuoteKey(categoryId: string, model: string): string {
  return ["base", categoryId, normQuoteText(model)].join("|");
}

/** 批次内去重键：Category + Model + Condition + Leadtime */
export function buildBatchDedupeKey(p: {
  category: string | null;
  model: string;
  condition: string | null;
  leadTime: string | null;
}): string {
  return [
    normQuoteText(p.category),
    normQuoteText(p.model),
    normQuoteText(p.condition),
    normQuoteText(p.leadTime),
  ].join("|");
}
