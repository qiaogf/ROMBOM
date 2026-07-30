"use client";

import Link from "next/link";
import type { Category } from "@/../prisma/generated/client";

export function CategoryGrid({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
          <span className="flex-shrink-0 text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">
            Shop:
          </span>
          {categories.map((category) => {
            const name = category.nameEn || category.name;
            return (
              <Link
                key={category.id}
                href={`/products?category=${category.id}`}
                className="flex-shrink-0 px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors whitespace-nowrap"
              >
                {name}
              </Link>
            );
          })}
          <Link
            href="/categories"
            className="flex-shrink-0 px-2.5 py-1 text-xs font-medium text-slate-900 hover:underline whitespace-nowrap"
          >
            View All →
          </Link>
        </nav>
      </div>
    </section>
  );
}