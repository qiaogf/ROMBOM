export type DecimalLike = { toString: () => string };

export function decimalToString(value: DecimalLike | string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "0";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return value.toString();
  }
  if (typeof value.toString === "function") {
    return value.toString();
  }
  return "0";
}

export function decimalToNumber(value: DecimalLike | string | number | null | undefined): number {
  return parseFloat(decimalToString(value));
}

export function formatUSD(amount: number | string | DecimalLike | null | undefined): string {
  const str = decimalToString(amount);
  const num = normalizeAmount(str);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatUSDWithoutSymbol(amount: number | string | DecimalLike | null | undefined): string {
  const str = decimalToString(amount);
  const num = normalizeAmount(str);
  return new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(num);
}

export function formatUSDSymbolOnly(): string {
  return "$";
}

export function normalizeAmount(amount: number | string | null | undefined): number {
  if (amount === null || amount === undefined || amount === "") {
    return 0;
  }
  
  if (typeof amount === "string") {
    const cleaned = amount.replace(/[^0-9.-]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  if (typeof amount === "number") {
    if (isNaN(amount) || !isFinite(amount)) {
      return 0;
    }
    return amount;
  }
  
  return 0;
}

export function calculateTotal(
  price: number | string,
  quantity: number
): number {
  const priceNum = normalizeAmount(price);
  return Math.round(priceNum * quantity * 100) / 100;
}

export function addAmounts(
  ...amounts: (number | string | null | undefined)[]
): number {
  let total = 0;
  for (const amount of amounts) {
    total += normalizeAmount(amount);
  }
  return Math.round(total * 100) / 100;
}

export function subtractAmounts(
  minuend: number | string | null | undefined,
  subtrahend: number | string | null | undefined
): number {
  const min = normalizeAmount(minuend);
  const sub = normalizeAmount(subtrahend);
  return Math.round((min - sub) * 100) / 100;
}

export function multiplyAmount(
  amount: number | string | null | undefined,
  multiplier: number
): number {
  const num = normalizeAmount(amount);
  return Math.round(num * multiplier * 100) / 100;
}

export function divideAmount(
  amount: number | string | null | undefined,
  divisor: number
): number {
  const num = normalizeAmount(amount);
  if (divisor === 0) {
    return 0;
  }
  return Math.round((num / divisor) * 100) / 100;
}

export function compareAmounts(
  a: number | string | null | undefined,
  b: number | string | null | undefined
): number {
  const numA = normalizeAmount(a);
  const numB = normalizeAmount(b);
  if (numA < numB) return -1;
  if (numA > numB) return 1;
  return 0;
}

export function isPositive(amount: number | string | null | undefined): boolean {
  return normalizeAmount(amount) > 0;
}

export function isZero(amount: number | string | null | undefined): boolean {
  return normalizeAmount(amount) === 0;
}

export function isNegative(amount: number | string | null | undefined): boolean {
  return normalizeAmount(amount) < 0;
}