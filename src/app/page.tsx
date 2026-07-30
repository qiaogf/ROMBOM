import {
  getFeaturedProducts,
  getCategories,
  getTopSellers,
  getNewestProducts,
} from "@/actions/products";
import {
  HeroBanner,
  CategoryGrid,
  ProductGrid,
  ProductList,
  Newsletter,
} from "@/components/home";
import { RetryButton } from "@/components/RetryButton";

export const revalidate = 3600;

export default async function Home() {
  try {
    const [featuredProducts, categories, topSellers, newestProducts] =
      await Promise.all([
        getFeaturedProducts(),
        getCategories(),
        getTopSellers(),
        getNewestProducts(),
      ]);

    return (
      <div className="min-h-screen bg-white">
        <HeroBanner />

        <CategoryGrid categories={categories} />

        <ProductGrid
          products={featuredProducts}
          title="Featured Products"
          viewAllHref="/products?featured=true"
        />

        <section className="py-4 sm:py-6 bg-slate-50 border-y border-slate-200">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              <ProductList
                products={topSellers}
                title="Top Sellers"
                showRank
              />
              <ProductList
                products={newestProducts}
                title="New Arrivals"
                showDate
              />
            </div>
          </div>
        </section>

        <Newsletter />
      </div>
    );
  } catch (error) {
    console.error("Home page error:", error);
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