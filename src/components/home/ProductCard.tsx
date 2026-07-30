"use client";

import Link from "next/link";
import type { Product, Category } from "@/../prisma/generated/client";
import { formatUSD, decimalToNumber } from "@/lib/price";

interface ProductCardProps {
  product: Product & { category: Category };
}

export function ProductCard({ product }: ProductCardProps) {
  const displayImage = product.thumbnail || product.images[0] || null;
  const displayName = product.nameEn || product.name;
  const displayCategory = product.category.nameEn || product.category.name;
  const price = decimalToNumber(product.price);
  const originalPrice = product.originalPrice ? decimalToNumber(product.originalPrice) : null;
  const discount = originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0;
  const rating = product.ratingAverage ? decimalToNumber(product.ratingAverage) : 0;

  return (
    <Link href={`/products/${product.id}`} className="group block">
      <div className="card overflow-hidden ring-1 ring-slate-100 group-hover:ring-indigo-200 group-hover:shadow-md transition-all duration-300">
        <div className="aspect-square bg-slate-50 relative overflow-hidden">
          {displayImage ? (
            <img
              src={displayImage}
              alt={displayName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-20 h-20 bg-slate-100 rounded-xl"></div>
            </div>
          )}

          {discount > 0 && (
            <div className="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-md">
              -{discount}%
            </div>
          )}

          {product.featured && (
            <div className="absolute top-3 right-3 px-2 py-1 bg-slate-900 text-white text-xs font-semibold rounded-md">
              Featured
            </div>
          )}
        </div>

        <div className="p-4">
          <span className="text-xs text-slate-400 uppercase tracking-wider">
            {displayCategory}
          </span>

          <h3 className="font-medium text-slate-900 mt-1 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
            {displayName}
          </h3>

          {rating > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= Math.round(rating)
                        ? "text-amber-400 fill-amber-400"
                        : "text-slate-200"
                    }`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-xs text-slate-400">({product.ratingCount})</span>
            </div>
          )}

          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900">{formatUSD(price)}</span>
            {originalPrice && originalPrice > price && (
              <span className="text-sm text-slate-400 line-through">
                {formatUSD(originalPrice)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
