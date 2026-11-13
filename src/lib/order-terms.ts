// 订单商务条款选项 — 客户端下拉与管理端下拉共用同一份定义，保证两侧取值完全一致。

export const PAYMENT_TERMS_OPTIONS = [
  "T/T 100% Advance",
  "T/T 50% Deposit, Balance Before Shipment",
  "T/T 30% Deposit, Balance Before Shipment",
] as const;

export const PAYMENT_METHOD_OPTIONS = [
  "Bank Transfer (T/T)",
  "SEPA Transfer",
  "ACH Transfer",
  "FAST Transfer (SG)",
  "FPS Transfer (HK)",
  "Western Union",
  "MoneyGram",
  "VISA",
  "Mastercard",
  "Google Pay",
  "Apple Pay",
] as const;

export const DELIVERY_TERMS_OPTIONS = [
  "EXW (Buyer pickup & export)",
  "FCA (Export, hand to carrier)",
  "FOB (Risk on board)",
  "CIF (Seller pays freight & insurance)",
] as const;

export type OrderTermField = "paymentTerms" | "paymentMethod" | "deliveryTerms";

/** 未人工选择时的默认显示值；保存前不写入数据库。 */
export const DEFAULT_ORDER_TERMS: Record<OrderTermField, string> = {
  paymentTerms: "T/T 100% Advance",
  paymentMethod: "Bank Transfer (T/T)",
  deliveryTerms: "EXW (Buyer pickup & export)",
};

export const ORDER_TERM_OPTIONS: Record<OrderTermField, readonly string[]> = {
  paymentTerms: PAYMENT_TERMS_OPTIONS,
  paymentMethod: PAYMENT_METHOD_OPTIONS,
  deliveryTerms: DELIVERY_TERMS_OPTIONS,
};

/** 判断是否为本系统允许的条款取值（用于服务端校验，拒绝任意文本） */
export function isValidOrderTerm(field: OrderTermField, value: string): boolean {
  return ORDER_TERM_OPTIONS[field].includes(value);
}
