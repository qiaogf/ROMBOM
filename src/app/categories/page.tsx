import Link from "next/link";
import { getAllCategories } from "@/actions/products";
import { RetryButton } from "@/components/RetryButton";
import type { Category } from "@/../prisma/generated/client";

export const revalidate = 3600;

export default async function CategoriesPage() {
  try {
    const categories = await getAllCategories();

    const groupedCategories = categories.reduce((acc, cat) => {
      const key = cat.parentId || "root";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(cat);
      return acc;
    }, {} as Record<string, Category[]>);

    const rootCategories = groupedCategories["root"] || [];

    return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Categories</h1>
          <p className="text-slate-500">Browse all product categories</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rootCategories.map((category) => {
            const children = groupedCategories[category.id] || [];
            const displayName = category.nameEn || category.name;

            return (
              <div key={category.id} className="card ring-1 ring-slate-100 overflow-hidden">
                <div className="aspect-video bg-slate-50 relative">
                  {category.imageUrl ? (
                    <img
                      src={category.imageUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-24 h-24 bg-slate-100 rounded-2xl"></div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-bold text-white mb-1">{displayName}</h3>
                    <p className="text-sm text-white/80">
                      {children.length > 0
                        ? `${children.length} subcategories`
                        : "Direct products"}
                    </p>
                  </div>
                </div>

                <div className="p-4">
                  {children.length > 0 ? (
                    <div className="space-y-2">
                      {children.map((child) => (
                        <Link
                          key={child.id}
                          href={`/products?category=${child.id}`}
                          className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        >
                          <span className="font-medium text-slate-700">
                            {child.nameEn || child.name}
                          </span>
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Link
                      href={`/products?category=${category.id}`}
                      className="btn-primary w-full py-3"
                    >
                      View Products
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {rootCategories.length === 0 && (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Categories Found</h3>
            <p className="text-slate-500 mb-6">We don't have any categories yet.</p>
            <Link
              href="/products"
              className="btn-primary"
            >
              Browse All Products
            </Link>
          </div>
        )}
      </div>
    </div>
    );
  } catch (error) {
    console.error("Categories page error:", error);
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center px-4 py-12">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Service Unavailable</h1>
          <p className="text-slate-500 mb-6">We're experiencing temporary connectivity issues. Please try again later.</p>
          <RetryButton className="btn-primary" />
        </div>
      </div>
    );
  }
}