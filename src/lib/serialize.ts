import type { Product, Category, SupplierQuote, Brand } from "@/../prisma/generated/client";

export type SerializableCategory = Omit<Category, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export type SerializableBrand = Omit<Brand, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export type SerializableSupplierQuote = {
  quoteId: string;
  supplierId: string;
  productId: string;
  costPrice: number;
  sellPrice: number;
  moq: number;
  leadTime: string | null;
  validUntil: string | null;
  isDefault: boolean;
  isValid: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SerializableProduct = Omit<Product, "createdAt" | "updatedAt" | "supplierQuotes" | "cartItems" | "orderItems" | "category" | "brand" | "images"> & {
  createdAt: string;
  updatedAt: string;
  images: string[];
  supplierQuotes: SerializableSupplierQuote[];
  defaultQuote: SerializableSupplierQuote | null;
};

export type SerializableProductWithCategory = SerializableProduct & {
  category: SerializableCategory | null;
};

function toNumber(value: { toNumber: () => number } | string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  if (typeof value.toNumber === "function") return value.toNumber();
  return null;
}

function toDateString(value: Date | string | null | undefined): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

function serializeSupplierQuote(quote: SupplierQuote): SerializableSupplierQuote {
  return {
    quoteId: quote.quoteId,
    supplierId: quote.supplierId,
    productId: quote.productId,
    costPrice: toNumber(quote.costPrice) ?? 0,
    sellPrice: toNumber(quote.sellPrice) ?? 0,
    moq: quote.moq,
    leadTime: quote.leadTime,
    validUntil: quote.validUntil ? toDateString(quote.validUntil) : null,
    isDefault: quote.isDefault,
    isValid: quote.isValid,
    createdAt: toDateString(quote.createdAt),
    updatedAt: toDateString(quote.updatedAt),
  };
}

export function serializeProduct(product: Product & { supplierQuotes?: SupplierQuote[] }): SerializableProduct {
  const quotes = (product.supplierQuotes || []).filter(q => q.isValid);
  const defaultQuote = quotes.find(q => q.isDefault) || quotes[0] || null;
  
  const { images, ...rest } = product as Product & { supplierQuotes?: SupplierQuote[]; images: string };
  
  let parsedImages: string[] = [];
  if (typeof images === 'string') {
    try {
      parsedImages = JSON.parse(images);
      if (!Array.isArray(parsedImages)) parsedImages = [];
    } catch {
      parsedImages = [];
    }
  } else if (Array.isArray(images)) {
    parsedImages = images;
  }
  
  return {
    ...rest,
    images: parsedImages,
    createdAt: toDateString(product.createdAt),
    updatedAt: toDateString(product.updatedAt),
    supplierQuotes: quotes.map(serializeSupplierQuote),
    defaultQuote: defaultQuote ? serializeSupplierQuote(defaultQuote) : null,
  };
}

export function serializeCategory(category: Category): SerializableCategory {
  return {
    ...category,
    createdAt: toDateString(category.createdAt),
    updatedAt: toDateString(category.updatedAt),
  };
}

export function serializeProductWithCategory(
  product: Product & { category?: Category | null; supplierQuotes?: SupplierQuote[] }
): SerializableProductWithCategory {
  const { category, ...rest } = product;
  return {
    ...serializeProduct(rest as Product & { supplierQuotes?: SupplierQuote[] }),
    category: category ? serializeCategory(category) : null,
  };
}

export function serializeProducts(products: (Product & { supplierQuotes?: SupplierQuote[] })[]): SerializableProduct[] {
  return products.map(serializeProduct);
}

export function serializeProductsWithCategory(
  products: (Product & { category?: Category | null; supplierQuotes?: SupplierQuote[] })[]
): SerializableProductWithCategory[] {
  return products.map(serializeProductWithCategory);
}

export function serializeCategories(categories: Category[]): SerializableCategory[] {
  return categories.map(serializeCategory);
}

export function serializeBrand(brand: Brand): SerializableBrand {
  return {
    ...brand,
    createdAt: toDateString(brand.createdAt),
    updatedAt: toDateString(brand.updatedAt),
  };
}

export function serializeBrands(brands: Brand[]): SerializableBrand[] {
  return brands.map(serializeBrand);
}