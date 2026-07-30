import Link from "next/link";
import { getAllCategories } from "@/actions/products";
import { RetryButton } from "@/components/RetryButton";
import type { Category } from "@/../prisma/generated/client";

export const revalidate = 3600;

export default async function CategoriesPage() {
  try {
    const categories = await getAllCategories();

    const groupedCategories = categories.reduce(
      (acc, cat) => {
        const key = cat.parentId || "root";
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(cat);
        return acc;
      },
      {} as Record<string, Category[]>
    );

    const rootCategories = groupedCategories["root"] || [];

    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="mb-4">
            <h1 className="text-lg font-semibold text-slate-900">Categories</h1>
            <p className="text-xs text-slate-500">
              Browse all product categories
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rootCategories.map((category) => {
              const children = groupedCategories[category.id] || [];
              const displayName = category.nameEn || category.name;

              return (
                <div
                  key={category.id}
                  className="border border-slate-200 rounded-md overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border-b border-slate-200">
                    {category.imageUrl ? (
                      <img
                        src={category.imageUrl}
                        alt={displayName}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-slate-200 rounded flex-shrink-0"></div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">
                        {displayName}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {children.length > 0
                          ? `${children.length} subcategories`
                          : "Direct products"}
                      </p>
                    </div>
                  </div>

                  <div className="p-2">
                    {children.length > 0 ? (
                      <div className="space-y-0.5">
                        {children.map((child) => (
                          <Link
                            key={child.id}
                            href={`/products?category=${child.id}`}
                            className="flex items-center justify-between px-2 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded transition-colors"
                          >
                            <span>{child.nameEn || child.name}</span>
                            <svg
                              className="w-3 h-3 text-slate-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <Link
                        href={`/products?category=${category.id}`}
                        className="btn-primary w-full py-1.5 text-xs"
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
            <div className="card p-8 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-md flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-6 h-6 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                No Categories Found
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                We don&apos;t have any categories yet.
              </p>
              <Link href="/products" className="btn-primary">
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-4 py-12">
          <div className="w-14 h-14 bg-slate-100 rounded-md flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-slate-900 mb-2">
            Service Unavailable
          </h1>
          <p className="text-sm text-slate-500 mb-4">
            We&apos;re experiencing temporary connectivity issues. Please try
            again later.
          </p>
          <RetryButton className="btn-primary" />
        </div>
      </div>
    );
  }
}