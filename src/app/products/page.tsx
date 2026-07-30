import Link from "next/link";
import { getPaginatedProducts, getAllCategories } from "@/actions/products";
import { ProductCard } from "@/components/home/ProductCard";
import { CategoryFilter, Pagination } from "@/components/products";
import { RetryButton } from "@/components/RetryButton";
import type { Category } from "@/../prisma/generated/client";

interface ProductsPageProps {
  searchParams: {
    page?: string;
    category?: string;
  };
}

export const revalidate = 3600;

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  try {
    const params = await searchParams;
    const page = parseInt(params.page || "1", 10) || 1;
    const categoryId = params.category || undefined;

    const [paginationResult, categories] = await Promise.all([
      getPaginatedProducts(page, 12, categoryId),
      getAllCategories(),
    ]);

    const { products, total, totalPages, pageSize } = paginationResult;

    const selectedCategory = categories.find((c) => c.id === categoryId);

    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="mb-4">
            <h1 className="text-lg font-semibold text-slate-900">
              {selectedCategory
                ? selectedCategory.nameEn || selectedCategory.name
                : "All Products"}
            </h1>
            <p className="text-xs text-slate-500">
              {total} products
              {selectedCategory &&
                ` in ${selectedCategory.nameEn || selectedCategory.name}`}
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            <aside className="lg:w-48 flex-shrink-0">
              <div className="lg:sticky lg:top-12">
                <CategoryFilter
                  categories={categories}
                  selectedCategoryId={categoryId}
                />
              </div>
            </aside>

            <main className="flex-1">
              {products.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                    {products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={
                          product as typeof product & { category: Category }
                        }
                      />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      total={total}
                      pageSize={pageSize}
                      categoryId={categoryId}
                    />
                  )}
                </>
              ) : (
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
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">
                    No products found
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    We couldn&apos;t find any products matching your selection.
                  </p>
                  <Link href="/products" className="btn-primary">
                    Browse All Products
                  </Link>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Products page error:", error);
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