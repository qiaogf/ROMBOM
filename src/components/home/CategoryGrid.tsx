"use client";

import Link from "next/link";
import type { Category } from "@/../prisma/generated/client";

interface CategoryGridProps {
  categories: Category[];
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8 sm:mb-12">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Shop by Category</h2>
            <p className="text-slate-500 text-sm sm:text-base">Browse our curated collections</p>
          </div>
          <Link
            href="/categories"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors hidden sm:inline-flex items-center gap-1"
          >
            View All
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${category.id}`}
              className="group"
            >
              <div className="aspect-square bg-slate-50 rounded-xl overflow-hidden mb-3 ring-1 ring-slate-100 group-hover:ring-indigo-200 group-hover:shadow-md transition-all duration-300">
                {category.imageUrl ? (
                  <img
                    src={category.imageUrl}
                    alt={category.nameEn || category.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-xl group-hover:bg-indigo-50 transition-colors duration-300"></div>
                  </div>
                )}
              </div>
              <h3 className="font-medium text-slate-700 group-hover:text-slate-900 text-center text-sm sm:text-base transition-colors">
                {category.nameEn || category.name}
              </h3>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/categories"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            View All Categories →
          </Link>
        </div>
      </div>
    </section>
  );
}
