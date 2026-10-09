import { decimalToNumber, type DecimalLike } from "@/lib/price";

/** 库存状态枚举（与 Prisma schema 中 StockStatus enum 对齐） */
export type StockStatus = "in_stock" | "lead_time" | "out_of_stock";

/**
 * 购物车条目展示数据 — 旧 SupplierQuote 路径与新 ModelPrice 路径统一后的扁平形态
 *
 * 设计目的：
 *   - 前端组件不再直接读 item.supplierQuote.xxx / item.modelPrice.xxx
 *     （这些关系在双路径下都可能是 null，直接读会崩）
 *   - 服务端 cartActions 在返回给前端前先 toCartItemDisplay() 一次
 *   - 前端无论拿到 CartItemWithProduct 还是 CartItemDisplay 都能复用同一函数
 */
export interface CartItemDisplay {
  itemId: string;
  quantity: number;
  productId: string | null;
  quoteId: string | null;
  modelPriceId: string | null;
  productName: string;
  model: string;
  unit: string;
  unitPrice: number;
  moq: number;
  condition: string | null;
  /** 库存状态：in_stock 现货 / lead_time 订货 / out_of_stock 缺货 */
  stockStatus: StockStatus;
  /** 订货交期（如 "3-5 days"），仅 lead_time 状态下有意义 */
  leadTime: string | null;
  /** 缩略图 URL（旧 Product 或新 ModelPrice 都有该字段，无则 null） */
  thumbnail: string | null;
  // ===== 规格参数（仅 ModelPrice 路径有值；旧 Product 路径均为 null）=====
  origin: string | null;
  certification: string | null;
  length: number | null;
  width: number | null;
  height: number | null;
  diameter: number | null;
  dimensionUnit: string | null;
  weight: number | null;
  packingWeight: number | null;
  weightUnit: string | null;
  batteryAttributes: string | null;
  datasheetLink: string | null;
}

/**
 * 服务端 CartItem 关系对象的输入形态
 * 三个引用关系都可选，对应 schema 中 quoteId/productId/modelPriceId 均为 String?
 */
export interface CartItemRelationsInput {
  itemId: string;
  quantity: number;
  productId: string | null;
  quoteId: string | null;
  modelPriceId: string | null;
  product?: {
    productName: string;
    model: string;
    unit: string;
    thumbnail?: string | null;
  } | null;
  supplierQuote?: {
    sellPrice: DecimalLike | string | number;
    moq: number;
    stockStatus?: StockStatus;
    leadTime?: string | null;
  } | null;
  modelPrice?: {
    productName: string;
    model: string;
    unit: string;
    sellPrice: DecimalLike | string | number;
    moq: number;
    condition: string | null;
    stockStatus?: StockStatus;
    leadTime?: string | null;
    thumbnail?: string | null;
    origin?: string | null;
    certification?: string | null;
    length?: DecimalLike | string | number | null;
    width?: DecimalLike | string | number | null;
    height?: DecimalLike | string | number | null;
    diameter?: DecimalLike | string | number | null;
    dimensionUnit?: string | null;
    weight?: DecimalLike | string | number | null;
    packingWeight?: DecimalLike | string | number | null;
    weightUnit?: string | null;
    batteryAttributes?: string | null;
    datasheetLink?: string | null;
  } | null;
}

/**
 * 从服务端 CartItem 关系对象提取统一展示数据
 *
 * 优先级：
 *   1) SupplierQuote 路径（旧业务）— 必须同时有 supplierQuote 与 product
 *   2) ModelPrice 路径（新业务）— 只需要 modelPrice
 *   3) 兜底：关系缺失时返回零值，避免前端崩溃（数据异常也应可见）
 *
 * 注：理论上不会出现一个 CartItem 同时有 supplierQuote 和 modelPrice（创建时强制二选一），
 *     若同时存在，旧路径优先（保持向下兼容）。
 */
export function toCartItemDisplay(item: CartItemRelationsInput): CartItemDisplay {
  const nullSpecs = {
    origin: null,
    certification: null,
    length: null,
    width: null,
    height: null,
    diameter: null,
    dimensionUnit: null,
    weight: null,
    packingWeight: null,
    weightUnit: null,
    batteryAttributes: null,
    datasheetLink: null,
  };

  // 1) 旧路径：有 supplierQuote（必然有 product 关系）
  if (item.supplierQuote && item.product) {
    return {
      itemId: item.itemId,
      quantity: item.quantity,
      productId: item.productId,
      quoteId: item.quoteId,
      modelPriceId: item.modelPriceId,
      productName: item.product.productName,
      model: item.product.model,
      unit: item.product.unit,
      unitPrice: decimalToNumber(item.supplierQuote.sellPrice),
      moq: item.supplierQuote.moq,
      // 旧 Product 表无 condition 字段，从 ModelPrice 关系补充（若有）
      condition: item.modelPrice?.condition ?? null,
      stockStatus: item.supplierQuote.stockStatus ?? item.modelPrice?.stockStatus ?? "in_stock",
      leadTime: item.supplierQuote.leadTime ?? item.modelPrice?.leadTime ?? null,
      thumbnail: item.product.thumbnail ?? null,
      ...nullSpecs,
    };
  }

  // 2) 新路径：有 modelPrice
  if (item.modelPrice) {
    const mp = item.modelPrice;
    return {
      itemId: item.itemId,
      quantity: item.quantity,
      productId: item.productId,
      quoteId: item.quoteId,
      modelPriceId: item.modelPriceId,
      productName: mp.productName,
      model: mp.model,
      unit: mp.unit,
      unitPrice: decimalToNumber(mp.sellPrice),
      moq: mp.moq,
      condition: mp.condition ?? null,
      stockStatus: mp.stockStatus ?? "in_stock",
      leadTime: mp.leadTime ?? null,
      thumbnail: mp.thumbnail ?? null,
      origin: mp.origin ?? null,
      certification: mp.certification ?? null,
      length: mp.length != null ? decimalToNumber(mp.length) : null,
      width: mp.width != null ? decimalToNumber(mp.width) : null,
      height: mp.height != null ? decimalToNumber(mp.height) : null,
      diameter: mp.diameter != null ? decimalToNumber(mp.diameter) : null,
      dimensionUnit: mp.dimensionUnit ?? null,
      weight: mp.weight != null ? decimalToNumber(mp.weight) : null,
      packingWeight: mp.packingWeight != null ? decimalToNumber(mp.packingWeight) : null,
      weightUnit: mp.weightUnit ?? null,
      batteryAttributes: mp.batteryAttributes ?? null,
      datasheetLink: mp.datasheetLink ?? null,
    };
  }

  // 3) 兜底：关系缺失（不应发生，但前端不能崩）
  return {
    itemId: item.itemId,
    quantity: item.quantity,
    productId: item.productId,
    quoteId: item.quoteId,
    modelPriceId: item.modelPriceId,
    productName: item.product?.productName ?? "Unknown",
    model: item.product?.model ?? "—",
    unit: item.product?.unit ?? "",
    unitPrice: 0,
    moq: 1,
    condition: null,
    stockStatus: "in_stock",
    leadTime: null,
    thumbnail: item.product?.thumbnail ?? null,
    ...nullSpecs,
  };
}

/**
 * 批量转换 CartItem 关系数组为展示数据
 */
export function toCartItemDisplayList(
  items: ReadonlyArray<CartItemRelationsInput>
): CartItemDisplay[] {
  return items.map(toCartItemDisplay);
}

/**
 * 计算购物车总数与总金额（金额四舍五入到分，避免浮点误差）
 *
 * 替代 CartContent.tsx / CheckoutContent.tsx 中各处的 reduce 计算
 */
export function computeCartTotals(
  items: ReadonlyArray<CartItemDisplay>
): { totalItems: number; totalAmount: number } {
  let totalItems = 0;
  let totalAmount = 0;
  for (const item of items) {
    totalItems += item.quantity;
    totalAmount += item.unitPrice * item.quantity;
  }
  return {
    totalItems,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

/**
 * 格式化库存状态为展示文本
 *   - in_stock → "In Stock"
 *   - lead_time → 显示 leadTime 字段（如 "3-5 days"），无 leadTime 时回退 "Lead Time"
 *   - out_of_stock → "Out of Stock"
 */
export function formatStockStatus(
  stockStatus: StockStatus,
  leadTime: string | null
): string {
  switch (stockStatus) {
    case "in_stock":
      return "In Stock";
    case "lead_time":
      return leadTime?.trim() ? leadTime.trim() : "Lead Time";
    case "out_of_stock":
      return "Out of Stock";
    default:
      return "In Stock";
  }
}
