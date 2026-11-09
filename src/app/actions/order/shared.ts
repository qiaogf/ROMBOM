// Shared types, constants, and pure helpers for order actions.
// Imported by both queries.ts and mutations.ts.

import type { SalesOrder, SalesOrderItem, ModelPrice } from "@/../prisma/generated/client";

export interface OrderActionResult {
  success: boolean;
  message: string;
  order?: OrderWithItems;
}

export type OrderWithItems = SalesOrder & {
  items: (SalesOrderItem & { modelPrice?: ModelPrice | null })[];
};

export interface CreateOrderData {
  shippingCountry: string;
  shippingCity?: string;
  shippingAddress?: string;
  shippingZip?: string;
  shippingName?: string;
  shippingPhone?: string;
  paymentMethod?: string;
  notes?: string;
  shippingCost?: string | number;
  taxAmount?: string | number;
  /** 部分支付：标记哪些组件本次支付。默认全付 */
  paySubtotal?: boolean;
  payShipping?: boolean;
  payTax?: boolean;
}

export const SHIPPING_THRESHOLD = 100;
export const SHIPPING_COST = 10;
export const TAX_RATE = 0.08;

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value) || 0;
  return Number(value) || 0;
}

/** 递归将 Prisma Decimal 对象转为 number，以便安全传给客户端组件 */
function serializeDecimals<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj;
  const objAny = obj as unknown as { toNumber?: () => number };
  if (typeof objAny.toNumber === "function") {
    return objAny.toNumber() as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => serializeDecimals(item)) as unknown as T;
  }
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as unknown as Record<string, unknown>)) {
      result[key] = serializeDecimals(value);
    }
    return result as T;
  }
  return obj;
}

export { toNumber, serializeDecimals };
