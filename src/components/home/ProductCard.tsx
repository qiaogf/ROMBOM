"use client";

import Link from "next/link";
import type { Product, Category } from "@/../prisma/generated/client";
import { formatUSD, decimalToNumber } from "@/lib/price";

export function ProductCard({
  product,
}: {
  product: Product & { category: Category };
}) {
  const displayImage = product.thumbnail || product.images[0] || null;
  const displayName = product.nameEn || product.name;
  const displayCategory = product.category.nameEn || product.category.name;
  const price = decimalToNumber(product.price);
  const originalPrice = product.originalPrice
    ? decimalToNumber(product.originalPrice)
    : null;
  const discount = originalPrice
    ? Math.round((1 - price / originalPrice) * 100)
    : 0;

  return (
    <Link href={`/products/${product.id}`} className="group block">
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden hover:border-slate-400 transition-colors">
        <div className="aspect-square bg-slate-50 relative">
          {displayImage ? (
            <img
              src={displayImage}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-14 h-14 bg-slate-200 rounded"></div>
            </div>
          )}
          {discount > 0 && (
            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-semibold rounded">
              -{discount}%
            </div>
          )}
          {product.stock <= 0 && (
            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-slate-700 text-white text-[10px] font-semibold rounded">
              Out
            </div>
          )}
        </div>

        <div className="p-2.5">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
            {displayCategory}
          </div>
          <h3 className="text-xs font-medium text-slate-900 line-clamp-2 mb-1 group-hover:text-slate-700 leading-snug min-h-[2rem]">
            {displayName}
          </h3>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold text-slate-900">
              {formatUSD(price)}
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-[10px] text-slate-400 line-through">
                {formatUSD(originalPrice)}
              </span>
            )}
          </div>
          {product.sku && (
            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
              Part #{product.sku}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}