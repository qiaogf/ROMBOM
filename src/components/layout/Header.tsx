"use client";

import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { SearchBar } from "./SearchBar";

export function Header() {
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-12 gap-4">
          <Link href="/" className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-slate-900 font-bold text-base leading-none">
              GlobalShop
            </span>
          </Link>

          <div className="flex-1 max-w-2xl min-w-0 hidden sm:block">
            <SearchBar />
          </div>

          <div className="flex items-center gap-1 sm:gap-2 ml-auto sm:ml-0">
            <Link
              href="/products"
              className="hidden md:inline-flex items-center px-2 py-1.5 text-sm text-slate-700 hover:text-slate-900 font-medium"
            >
              Products
            </Link>
            <Link
              href="/categories"
              className="hidden md:inline-flex items-center px-2 py-1.5 text-sm text-slate-700 hover:text-slate-900 font-medium"
            >
              Categories
            </Link>
            <Link
              href="/products"
              className="sm:hidden inline-flex items-center justify-center p-1.5 text-slate-600 hover:text-slate-900"
              aria-label="Products"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Link>

            <div className="h-4 w-px bg-slate-200 hidden sm:block mx-1"></div>

            <Link
              href="/account"
              className="inline-flex items-center justify-center p-1.5 text-slate-600 hover:text-slate-900"
              aria-label="Account"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>

            <Link
              href="/cart"
              className="relative inline-flex items-center justify-center p-1.5 text-slate-600 hover:text-slate-900"
              aria-label="Cart"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-600 rounded-sm">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        <div className="sm:hidden pb-2">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}