import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Grid3X3, ChevronRight, Layers } from "lucide-react";
import {
  getBrandBySlug,
  getCategoryProductsGroupsByBrandSlug,
} from "@/lib/db-service";
import { prisma } from "@/lib/prisma";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Brand pages change infrequently — ISR every hour.
export const revalidate = 3600;

export async function generateStaticParams() {
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    select: { slug: true },
  });
  return brands.map((b) => ({ brandSlug: b.slug }));
}

interface PageProps {
  params: Promise<{ brandSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brandSlug } = await params;
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) return {};
  return {
    title: `${brand.name} Series Catalog`,
    description: `Browse all product series from ${brand.name}. Click a series to view detailed model pricing.`,
    alternates: { canonical: `/brand/${brandSlug}` },
  };
}

export default async function BrandPage({ params }: PageProps) {
  const { brandSlug } = await params;
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  // 通过 CategoryBrand 关联加载：每个关联品类 → 该品牌在此品类下的系列列表
  const groups = await getCategoryProductsGroupsByBrandSlug(brandSlug);

  // SEO structured data: breadcrumb + series ItemList.
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
        {
          "@type": "ListItem",
          position: 2,
          name: brand.name,
          item: `${siteUrl}/brand/${brandSlug}`,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${brand.name} Series Catalog`,
      itemListElement: groups.flatMap((group) =>
        group.seriesGroups.map((sg) => ({
          "@type": "ListItem",
          name: sg.seriesName,
          url: `${siteUrl}/brand/${brandSlug}/${sg.seriesSlug}`,
        }))
      ),
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
            <span className="text-slate-700 font-medium">{brand.name}</span>
          </nav>
          {groups.length > 0 && (
            <span className="text-[11px] text-slate-500">
              {groups.reduce((sum, g) => sum + g.seriesGroups.reduce((s, sg) => s + sg.products.length, 0), 0)} SKU
            </span>
          )}
        </div>

        {brand.description && (
          <p className="text-xs text-slate-500 mb-3 leading-snug line-clamp-2">{brand.description}</p>
        )}

        {groups.length === 0 ? (
          <div className="text-center py-10">
            <Grid3X3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">
              No categories or product series available for this brand yet.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.category.id}>
                {/* 品类分组标题 */}
                <div className="flex items-baseline gap-2 mb-2">
                  <h2 className="text-xs font-semibold text-green-800 flex items-center gap-1.5">
                    <Grid3X3 className="w-3.5 h-3.5" />
                    {group.category.name}
                  </h2>
                  {group.category.description && (
                    <span className="text-[11px] text-slate-400 leading-snug line-clamp-1">
                      {group.category.description}
                    </span>
                  )}
                </div>

                {/* 仅显示系列名称，点击进入系列详情页查看型号价格 */}
                <div className="flex flex-wrap gap-2">
                  {group.seriesGroups.map((sg) => (
                    <Link
                      key={sg.seriesSlug}
                      href={`/brand/${brandSlug}/${sg.seriesSlug}`}
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
