import { searchProductsByModelOrSeries } from "@/lib/db-service";
import { ProductPriceTable } from "@/components/ProductPriceTable";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * 全局搜索结果页
 * URL: /search?q=xxx
 * 按型号 / 产品名 / 系列名搜索，结果按系列分组渲染价格表（含高亮）
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q || "";
  const seriesGroups = q ? await searchProductsByModelOrSeries(q) : [];
  const totalProducts = seriesGroups.reduce((sum, g) => sum + g.products.length, 0);

  // 搜索结果页结构化数据：面包屑 + CollectionPage（含结果数量）
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
        {
          "@type": "ListItem",
          position: 2,
          name: q ? `Search: ${q}` : "Search",
          item: `${siteUrl}/search`,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: q ? `Search: ${q}` : "Search Products",
      url: `${siteUrl}/search?q=${encodeURIComponent(q)}`,
      numberOfItems: totalProducts,
      isPartOf: { "@type": "WebSite", name: "Global-TECH", url: siteUrl },
    },
  ];

  return (
    <div className="px-4 py-4">
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      {/* 搜索标题 */}
      <div className="mb-4 border-b-2 border-green-700 pb-2">
        <h1 className="text-lg font-bold text-green-800">
          {q ? `Search: "${q}"` : "Search Products"}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {q
            ? seriesGroups.length > 0
              ? `${totalProducts} products found in ${seriesGroups.length} series`
              : "No products matched your search."
            : "Enter a model number, product name, or series to search."}
        </p>
      </div>

      {/* 搜索结果价格表 */}
      {seriesGroups.length > 0 && (
        <ProductPriceTable seriesGroups={seriesGroups} searchQuery={q} />
      )}
    </div>
  );
}
