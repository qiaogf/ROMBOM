import type { Metadata } from "next";
import { LazyCabinetDiagram, LazyDistributionDiagram } from "@/components/cabinet/LazyCabinetDiagrams";
import ProductionLineHero from "@/components/home/ProductionLineHero";

export const metadata: Metadata = {
  title: "Electrical Cabinet Solution — Control & Power Distribution Cabinets",
  description:
    "Typical electrical control cabinet and LV power distribution cabinet design per IEC 61439, GB/T 7251.1-2023, GB/T 7251.2-2023 and GB 50171-2012: DCS, PLC, communication, drive cabinets plus incoming, metering, compensation and outgoing switchgear.",
  alternates: { canonical: "/" },
};

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";


export default function RootPage() {
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

      <div className="px-3 sm:px-4 py-6 text-left">
        <div className="border border-slate-200 rounded bg-white overflow-hidden">
          <div className="px-3 py-2 text-[13px] font-semibold text-slate-700 border-b border-slate-200 bg-slate-50/60">
            Flexible Automation
          </div>
          <ProductionLineHero />
        </div>

        <div className="mt-12 border border-slate-200 rounded bg-white overflow-hidden">
          <div className="px-3 py-2 text-[13px] font-semibold text-slate-700 border-b border-slate-200 bg-slate-50/60">
            Electrical Control Cabinet
          </div>
          <LazyCabinetDiagram />
        </div>

        <div className="mt-12">
          <div className="border border-slate-200 rounded bg-white overflow-hidden">
            <div className="px-3 py-2 text-[13px] font-semibold text-slate-700 border-b border-slate-200 bg-slate-50/60">
              Power Distribution Cabinet
            </div>
            <LazyDistributionDiagram />
          </div>
        </div>
      </div>
    </div>
  );
}
