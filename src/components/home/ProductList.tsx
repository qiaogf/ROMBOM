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

export function ProductList({
  products,
  title,
  subtitle,
  showRank = false,
  showDate = false,
}: ProductListProps) {
  if (products.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>

      <div className="border border-slate-200 rounded-md divide-y divide-slate-200">
        {products.map((product, index) => {
          const displayImage = product.thumbnail || product.images[0] || null;
          const displayName = product.nameEn || product.name;
          const price = decimalToNumber(product.price);

          return (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="flex items-center gap-3 p-2.5 hover:bg-slate-50 transition-colors group"
            >
              {showRank && (
                <div className="flex-shrink-0 w-5 text-xs font-bold text-slate-400 text-right">
                  {index + 1}
                </div>
              )}

              <div className="flex-shrink-0 w-10 h-10 bg-slate-50 rounded overflow-hidden border border-slate-100">
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-4 h-4 bg-slate-200 rounded-sm"></div>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-slate-900 truncate group-hover:text-slate-700">
                  {displayName}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {showDate && product.createdAt && (
                    <>
                      Added{" "}
                      {new Date(product.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </>
                  )}
                  {showRank && product.salesCount > 0 && (
                    <>Sold {product.salesCount}+ times</>
                  )}
                </p>
              </div>

              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-bold text-slate-900">
                  {formatUSD(price)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}