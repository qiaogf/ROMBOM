import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Tag, ChevronRight, Layers } from "lucide-react";
import {
  getCategoryBySlug,
  getBrandsByCategorySlug,
  getBrandProductsGroupsByCategorySlug,
} from "@/lib/db-service";

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
    title: `${category.name} Brands`,
    alternates: { canonical: `/category/${categorySlug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { categorySlug } = await params;
  const { brand: brandSlug } = await searchParams;

  const category = await getCategoryBySlug(categorySlug);
  if (!category) notFound();

  // 如果有 brand 参数 → 跳转到统一路由 /catalog/[categorySlug]/[brandSlug]
  if (brandSlug) {
    const brands = await getBrandsByCategorySlug(categorySlug);
    const hasBrand = brands.some((b) => b.slug === brandSlug);
    if (hasBrand) {
      redirect(`/catalog/${categorySlug}/${brandSlug}`);
    }
  }

  // 通过 CategoryBrand 关联加载：每个关联品牌 → 该品牌在此品类下的系列列表
  const groups = await getBrandProductsGroupsByCategorySlug(categorySlug);

  // SEO structured data: breadcrumb + collection page schema.
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
        {
          "@type": "ListItem",
          position: 2,
          name: category.name,
          item: `${siteUrl}/category/${categorySlug}`,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${category.name} Brands`,
      description:
        category.description || `Browse all brands in ${category.name} category.`,
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
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-xs text-slate-500 mb-3">
          <Link href="/" className="hover:text-green-700">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-700 font-medium">{category.name}</span>
        </nav>

        {category.description && (
          <p className="text-xs text-slate-500 mb-3 leading-snug line-clamp-2">{category.description}</p>
        )}

        {groups.length === 0 ? (
          <div className="text-center py-10">
            <Tag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">
              No brands or product series available in this category yet.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.brand.id}>
                {/* 品牌分组标题 */}
                <div className="flex items-baseline gap-2 mb-2">
                  <h2 className="text-xs font-semibold text-green-800 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    {group.brand.name}
                  </h2>
                  {group.brand.description && (
                    <span className="text-[11px] text-slate-400 leading-snug line-clamp-1">
                      {group.brand.description}
                    </span>
                  )}
                </div>

                {/* 仅显示系列名称，点击进入系列详情页查看型号价格 */}
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
      </div>
    </div>
  );
}
