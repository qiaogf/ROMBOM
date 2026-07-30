"use client";

import Link from "next/link";

export function HeroBanner() {
  return (
    <section className="bg-slate-50 border-b border-slate-200">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-semibold rounded">
              Free Shipping
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline">
              Worldwide delivery on all orders
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/products"
              className="text-xs font-medium text-slate-700 hover:text-slate-900"
            >
              Browse Products →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}