// Cart shared types — interfaces consumed by queries/mutations and by client components.
// Prisma model types are imported only for type composition; they are not re-exported here.

import type {
  Cart,
  CartItem,
  SupplierQuote,
  Product,
  ModelPrice,
} from "@/../prisma/generated/client";

export interface CartActionResult {
  success: boolean;
  message: string;
  cart?: CartWithItems;
  totalQuantity?: number;
  totalAmount?: number;
}

/**
 * 购物车条目（带关系）— 双路径兼容
 *
 * 三关系全部可选，对应 schema 中 quoteId / productId / modelPriceId 均为 String?
 * 旧业务 item 只填 supplierQuote + product；新业务 item 只填 modelPrice
 */
export interface CartItemWithProduct extends CartItem {
  product?: (Product & { category?: { categoryId: string; categoryName: string } | null }) | null;
  supplierQuote?: SupplierQuote | null;
  /** 带所属导入批次的主开关，用于计算型号是否可自助下单 */
  modelPrice?: (ModelPrice & { importBatch?: { selfOrderAll: boolean } | null }) | null;
}

export interface CartWithItems extends Cart {
  items: CartItemWithProduct[];
}

export interface CartSummary {
  totalQuantity: number;
  totalAmount: number;
  itemCount: number;
}
