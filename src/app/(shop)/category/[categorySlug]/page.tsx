import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Layers } from "lucide-react";
import {
  getCategoryBySlug,
  getBrandsByCategorySlug,
} from "@/lib/db-service";
import {
  getBrandProductsGroupsByCategorySlug,
  getFlatPriceTableGroupsByCategorySlug,
  isFlatCategory,
  displayCategoryName,
} from "@/lib/db/products/queries";
import { ProductPriceTable } from "@/components/ProductPriceTable";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface PageProps {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{ brand?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categorySlug } = await params;
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return {};
  return {
    title: `${displayCategoryName(category.name)} Brands`,
    alternates: { canonical: `/category/${categorySlug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { categorySlug } = await params;
  const { brand: brandSlug } = await searchParams;

  const category = await getCategoryBySlug(categorySlug);
  if (!category) notFound();

  const flatMode = isFlatCategory(category.name, categorySlug);

  // 有 brand 参数 → 跳转（仅非扁平路径支持）
  if (brandSlug && !flatMode) {
    const brands = await getBrandsByCategorySlug(categorySlug);
    const hasBrand = brands.some((b) => b.slug === brandSlug);
    if (hasBrand) {
      redirect(`/catalog/${categorySlug}/${brandSlug}`);
    }
  }

  // === 两条路径 ===
  let flatSeriesGroups: Awaited<ReturnType<typeof getFlatPriceTableGroupsByCategorySlug>> | null = null;
  let standardGroups: Awaited<ReturnType<typeof getBrandProductsGroupsByCategorySlug>> | null = null;

  if (flatMode) {
    flatSeriesGroups = await getFlatPriceTableGroupsByCategorySlug(categorySlug);
  } else {
    standardGroups = await getBrandProductsGroupsByCategorySlug(categorySlug);
  }

  // SEO structured data
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
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${displayCategoryName(category.name)} Brands`,
      description:
        category.description || `Browse all brands in ${displayCategoryName(category.name)} category.`,
      url: `${siteUrl}/category/${categorySlug}`,
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
        <div className="flex items-center justify-between mb-2">
          <nav className="flex items-center gap-1 text-xs text-slate-500">
            <Link href="/" className="hover:text-green-700">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-700 font-medium">{displayCategoryName(category.name)}</span>
          </nav>
          {flatMode && flatSeriesGroups && (
            <span className="text-[11px] text-slate-500">
              {flatSeriesGroups.reduce((sum, g) => sum + g.products.length, 0)} SKU
            </span>
          )}
          {!flatMode && standardGroups && (
            <span className="text-[11px] text-slate-500">
              {standardGroups.reduce((sum, g) => sum + g.seriesGroups.reduce((s, sg) => s + sg.products.length, 0), 0)} SKU
            </span>
          )}
        </div>
        {category.description && (
          <p className="text-[11px] text-slate-500 mb-2 leading-snug line-clamp-2">{category.description}</p>
        )}

        {flatMode ? (
          // === 扁平路径：直接展示报价表 ===
          <>
            {flatSeriesGroups && flatSeriesGroups.length > 0 ? (
              <ProductPriceTable
                seriesGroups={flatSeriesGroups}
                showSeriesHeader={true}
                stickyOffset={0}
              />
            ) : (
              <div className="text-center py-10">
                <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">
                  No products yet. When uploading a price file, set the Category column to {category.name}; the price list will then be grouped by brand and series automatically.
                </p>
              </div>
            )}
          </>
        ) : (
          // === 标准路径：品牌 → 系列关联链 ===
          <>
            {standardGroups && standardGroups.length === 0 ? (
              <div className="text-center py-10">
                <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No brands or product series available in this category yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {standardGroups!.map((group) => (
                  <section key={group.brand.id}>
                    {/* 品牌分组标题 */}
                    <div className="flex items-baseline gap-2 mb-2">
                      <h2 className="text-xs font-semibold text-green-800 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        {group.brand.name}
                      </h2>
                      {group.brand.description && (
                        <span className="text-[11px] text-slate-400 leading-snug line-clamp-1">
                          {group.brand.description}
                        </span>
                      )}
                    </div>

                    {/* 系列名称链接 */}
                    <div className="flex flex-wrap gap-2">
                      {group.seriesGroups.map((sg) => (
                        <Link
                          key={sg.seriesSlug}
                          href={`/brand/${group.brand.slug}/${sg.seriesSlug}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-green-50 hover:border-green-300 hover:text-green-800 transition-colors"
                        >
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          {sg.seriesName}
                          {sg.products.length > 0 && (
                            <span className="text-[10px] text-slate-400">({sg.products.length})</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
