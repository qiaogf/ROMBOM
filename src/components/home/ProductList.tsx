"use client";

import Link from "next/link";
import type { Product } from "@/../prisma/generated/client";
import { formatUSD, decimalToNumber } from "@/lib/price";

interface ProductListProps {
  products: Product[];
  title: string;
  subtitle?: string;
  showRank?: boolean;
  showDate?: boolean;
}

export function ProductList({ products, title, subtitle, showRank = false, showDate = false }: ProductListProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
        </div>
      </div>

      <div className="space-y-3">
        {products.map((product, index) => {
          const displayImage = product.thumbnail || product.images[0] || null;
          const displayName = product.nameEn || product.name;
          const price = decimalToNumber(product.price);

          return (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="flex items-center gap-4 p-3 bg-white rounded-xl ring-1 ring-slate-100 hover:ring-indigo-200 hover:shadow-md transition-all duration-300 group"
            >
              {showRank && (
                <div className="flex-shrink-0 w-7 h-7 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold group-hover:bg-indigo-100 transition-colors">
                  {index + 1}
                </div>
              )}

              <div className="flex-shrink-0 w-16 h-16 bg-slate-50 rounded-lg overflow-hidden">
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt={displayName}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-8 h-8 bg-slate-100 rounded"></div>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-slate-900 truncate group-hover:text-indigo-600 transition-colors text-sm sm:text-base">
                  {displayName}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {showDate && product.createdAt && (
                    <>Added {new Date(product.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
                  )}
                  {showRank && product.salesCount > 0 && (
                    <>Sold {product.salesCount}+ times</>
                  )}
                </p>
                <p className="text-base font-bold text-slate-900 mt-1">{formatUSD(price)}</p>
              </div>

              <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
