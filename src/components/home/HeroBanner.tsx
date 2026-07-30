"use client";

import Link from "next/link";

export function HeroBanner() {
  return (
    <section className="relative bg-gradient-to-br from-slate-50 via-white to-slate-50 overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-28">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full mb-4 sm:mb-6">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
            Free Worldwide Shipping
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 sm:mb-6 leading-tight tracking-tight">
            Premium Products
            <span className="block text-indigo-600">From Around the World</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 mb-6 sm:mb-8 max-w-xl leading-relaxed">
            Discover curated collections of high-quality products with fast shipping, secure payments, and exceptional customer service.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link
              href="/products"
              className="btn-primary shadow-lg shadow-slate-900/10"
            >
              Browse Products
              <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/categories"
              className="btn-secondary"
            >
              View Categories
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-full hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-white/90"></div>
        <div className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 grid grid-cols-2 gap-3 sm:gap-4 opacity-50">
          <div className="w-32 h-32 sm:w-40 sm:h-40 bg-slate-100 rounded-xl"></div>
          <div className="w-32 h-32 sm:w-40 sm:h-40 bg-slate-100 rounded-xl"></div>
          <div className="w-32 h-32 sm:w-40 sm:h-40 bg-slate-100 rounded-xl"></div>
          <div className="w-32 h-32 sm:w-40 sm:h-40 bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    </section>
  );
}
