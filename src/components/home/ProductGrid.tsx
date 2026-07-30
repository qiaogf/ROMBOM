import Link from "next/link";
import type { Product, Category } from "@/../prisma/generated/client";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: (Product & { category: Category })[];
  title?: string;
  subtitle?: string;
  viewAllHref?: string;
}

export function ProductGrid({
  products,
  title = "Featured Products",
  subtitle,
  viewAllHref,
}: ProductGridProps) {
  if (products.length === 0) return null;

  return (
    <section className="py-4 sm:py-6 bg-white">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {subtitle && (
              <p className="text-xs text-slate-500">{subtitle}</p>
            )}
          </div>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-xs font-medium text-slate-700 hover:text-slate-900"
            >
              View All →
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}