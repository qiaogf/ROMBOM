import type { Metadata } from "next";
import { Package, Globe, Truck, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Global-TECH — Cross-Border MRO Industrial Supply",
  description: "Premium cross-border MRO industrial supply platform. Browse categories and brands for model pricing.",
  alternates: { canonical: "/" },
};

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function RootPage() {
  // 站点级结构化数据：WebSite（含搜索行为）+ Organization（品牌身份）
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Global-TECH",
      url: siteUrl,
      description: "Cross-Border MRO Industrial Supply Platform",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteUrl}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Global-TECH",
      url: siteUrl,
      description:
        "Premium cross-border MRO industrial supply platform. Source industrial parts, automation components, and MRO products from trusted suppliers worldwide.",
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
      <div className="px-3 sm:px-4 py-6">
        {/* Hero */}
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-green-800 mb-2">Global-TECH</h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Cross-Border MRO Industrial Supply Platform
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
          <div className="flex flex-col items-center p-4 bg-white border border-slate-200 rounded-lg">
            <Package className="w-6 h-6 text-green-700 mb-2" />
            <span className="text-xs font-medium text-slate-700">MRO Products</span>
          </div>
          <div className="flex flex-col items-center p-4 bg-white border border-slate-200 rounded-lg">
            <Globe className="w-6 h-6 text-green-700 mb-2" />
            <span className="text-xs font-medium text-slate-700">Global Sourcing</span>
          </div>
          <div className="flex flex-col items-center p-4 bg-white border border-slate-200 rounded-lg">
            <Truck className="w-6 h-6 text-green-700 mb-2" />
            <span className="text-xs font-medium text-slate-700">Fast Shipping</span>
          </div>
          <div className="flex flex-col items-center p-4 bg-white border border-slate-200 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-green-700 mb-2" />
            <span className="text-xs font-medium text-slate-700">Quality Assured</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center mt-8">
          <p className="text-xs text-slate-500">
            Select a category or brand from the left menu to browse product pricing.
          </p>
        </div>
      </div>
    </div>
  );
}
