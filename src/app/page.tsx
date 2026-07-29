import { getFeaturedProducts, getCategories, getTopSellers, getNewestProducts } from "@/actions/products";
import { HeroBanner, CategoryGrid, ProductGrid, ProductList, Newsletter } from "@/components/home";
import { RetryButton } from "@/components/RetryButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const [featuredProducts, categories, topSellers, newestProducts] = await Promise.all([
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
          subtitle="Curated selection of our best items"
          viewAllHref="/products?featured=true"
        />

        <section className="py-12 sm:py-16 lg:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
              <ProductList
                products={topSellers}
                title="Top Sellers"
                subtitle="Most popular items this week"
                showRank
              />
              <ProductList
                products={newestProducts}
                title="New Arrivals"
                subtitle="Fresh products just added"
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
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Service Unavailable</h1>
          <p className="text-slate-500 mb-6">We're experiencing temporary connectivity issues. Please try again later.</p>
          <RetryButton className="px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors" />
        </div>
      </div>
    );
  }
}