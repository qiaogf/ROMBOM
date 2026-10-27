export type DecimalLike = { toString: () => string };

function decimalToString(value: DecimalLike | string | number | null | undefined): string {
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

function normalizeAmount(amount: number | string | null | undefined): number {
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