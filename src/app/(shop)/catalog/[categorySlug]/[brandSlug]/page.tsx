import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Layers } from "lucide-react";
import {
  getCategoryBySlug,
  getBrandBySlug,
  getBrandsByCategorySlug,
  getProductGroupBySeries,
} from "@/lib/db-service";
import { displayCategoryName } from "@/lib/db/products/queries";
import { prisma } from "@/lib/prisma";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Catalog pages change infrequently — ISR every hour.
export const revalidate = 3600;

export async function generateStaticParams() {
  const pairs = await prisma.categoryBrand.findMany({
    // discontinued 只是标记值：不生成 catalog 静态页（仅 /category/discontinued 扁平页展示）
    where: { category: { slug: { not: "discontinued" } } },
    select: {
      category: { select: { slug: true } },
      brand: { select: { slug: true } },
    },
  });
  return pairs.map((p) => ({
    categorySlug: p.category.slug,
    brandSlug: p.brand.slug,
  }));
}

interface PageProps {
  params: Promise<{ categorySlug: string; brandSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categorySlug, brandSlug } = await params;
  const [category, brand] = await Promise.all([
    getCategoryBySlug(categorySlug),
    getBrandBySlug(brandSlug),
  ]);
  if (!category || !brand) return {};
  return {
    title: `${brand.name} - ${displayCategoryName(category.name)} Series`,
    description: `Browse ${brand.name} product series in ${displayCategoryName(category.name)} category. Click a series to view model pricing.`,
    alternates: { canonical: `/catalog/${categorySlug}/${brandSlug}` },
  };
}

export default async function CatalogPage({ params }: PageProps) {
  const { categorySlug, brandSlug } = await params;

  const [category, brand] = await Promise.all([
    getCategoryBySlug(categorySlug),
    getBrandBySlug(brandSlug),
  ]);

  if (!category || !brand) notFound();

  // discontinued 只是标记值：组合页不展示，引导到专属扁平页
  if (categorySlug === "discontinued") redirect("/category/discontinued");

  // 仅当 CategoryBrand 中存在该品类↔品牌关联时才允许访问组合页
  const linkedBrands = await getBrandsByCategorySlug(categorySlug);
  if (!linkedBrands.some((b) => b.id === brand.id)) notFound();

  // 获取该品类+品牌下的所有系列（旧 Product 与新 ModelPrice 合并）
  const seriesGroups = await getProductGroupBySeries(categorySlug, brandSlug);

  // SEO structured data: breadcrumb (Home → Category → Brand) + collection page.
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
        {
          "@type": "ListItem",
          position: 2,
          name: displayCategoryName(category.name),
          item: `${siteUrl}/category/${categorySlug}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: brand.name,
          item: `${siteUrl}/catalog/${categorySlug}/${brandSlug}`,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${brand.name} - ${displayCategoryName(category.name)} Series`,
      description: `Browse ${brand.name} product series in ${displayCategoryName(category.name)} category.`,
      url: `${siteUrl}/catalog/${categorySlug}/${brandSlug}`,
    },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-scroll main-scrollbar">
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <div className="h-0.5 bg-amber-400 shrink-0"></div>
      <div className="px-3 sm:px-4 pt-3 pb-8">
        {/* Breadcrumb + 总 SKU */}
        <div className="flex items-center justify-between mb-3">
          <nav className="flex items-center gap-1 text-xs text-slate-500">
            <Link href="/" className="hover:text-green-700">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/category/${categorySlug}`} className="hover:text-green-700">{displayCategoryName(category.name)}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-700 font-medium">{brand.name}</span>
          </nav>
          {seriesGroups.length > 0 && (
            <span className="text-[11px] text-slate-500">
              {seriesGroups.reduce((sum, sg) => sum + sg.products.length, 0)} SKU
            </span>
          )}
        </div>

        {seriesGroups.length === 0 ? (
          <div className="text-center py-10">
            <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No product series available for this selection yet.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {seriesGroups.map((sg) => (
              <Link
                key={sg.seriesSlug}
                href={`/brand/${brandSlug}/${sg.seriesSlug}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-green-50 hover:border-green-300 hover:text-green-800 transition-colors"
              >
                <Layers className="w-4 h-4 text-slate-400" />
                {sg.seriesName}
                {sg.products.length > 0 && (
                  <span className="text-[11px] text-slate-400">({sg.products.length} models)</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
