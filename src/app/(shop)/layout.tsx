import type { ReactNode } from "react";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Sidebar } from "@/components/layout/Sidebar";
import { getAllCategoriesWithSlug, getAllBrandsWithSlug } from "@/actions/products";

// Sidebar categories/brands change rarely — cache at build time and revalidate hourly.
export const revalidate = 3600;

export default async function ShopLayout({ children }: { children: ReactNode }) {
  const categories = await getAllCategoriesWithSlug();
  const brands = await getAllBrandsWithSlug();

  return (
    <>
      <Header />
      <div className="flex flex-row flex-1 min-h-0 h-full bg-white">
        <Suspense fallback={<div className="w-40 md:w-48 bg-slate-50 shrink-0 animate-pulse max-sm:hidden" />}>
          <Sidebar categories={categories} brands={brands} />
        </Suspense>
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
      <Footer />
    </>
  );
}
