"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">GlobalShop</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Premium cross-border store delivering quality products worldwide.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Shop
            </h3>
            <ul className="space-y-1.5">
              <li>
                <Link
                  href="/products"
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href="/categories"
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Categories
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Account
            </h3>
            <ul className="space-y-1.5">
              <li>
                <Link
                  href="/login"
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Sign In
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Create Account
                </Link>
              </li>
              <li>
                <Link
                  href="/orders"
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Order History
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Support
            </h3>
            <ul className="space-y-1.5">
              <li>
                <Link
                  href="/cart"
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Cart
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@globalshop.com"
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} GlobalShop. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/terms"
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}