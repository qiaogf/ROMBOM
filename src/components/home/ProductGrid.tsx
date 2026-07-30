import Link from "next/link";
import type { Product, Category } from "@/../prisma/generated/client";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: (Product & { category: Category })[];
  title?: string;
  subtitle?: string;
  viewAllHref?: string;
}

export function ProductGrid({ products, title = "Featured Products", subtitle, viewAllHref }: ProductGridProps) {
  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8 sm:mb-12">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">{title}</h2>
            {subtitle && <p className="text-slate-500 text-sm sm:text-base">{subtitle}</p>}
          </div>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors hidden sm:inline-flex items-center gap-1"
            >
              View All
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {viewAllHref && (
          <div className="mt-8 text-center sm:hidden">
            <Link
              href={viewAllHref}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              View All Products →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}