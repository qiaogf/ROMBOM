import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import { MarkdownBody } from "@/components/markdown/MarkdownBody";

const SITE_URL = "https://www.mrobom.com";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "About MROBOM",
  description:
    "MROBOM supplies production MRO and BOM materials to customers worldwide, with a broad portfolio of service solutions.",
  alternates: { canonical: `${SITE_URL}/about` },
};

export default async function AboutPage() {
  const { value } = await getPage("about");

  return (
    <div className="flex-1 min-h-0 overflow-y-auto main-scrollbar">
      <div className="h-0.5 bg-amber-400 shrink-0"></div>
      <div className="px-6 py-10 text-left">
        <h1 className="mb-6 text-[22px] font-bold text-slate-900">About MROBOM</h1>
        <MarkdownBody content={value} />
      </div>
    </div>
  );
}
