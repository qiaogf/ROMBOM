import Link from "next/link";
import type { Metadata } from "next";
import { getProductById } from "@/actions/products";
import { ProductDetailContent } from "./ProductDetailContent";
import { RetryButton } from "@/components/RetryButton";
import { serializeProductWithCategory } from "@/lib/serialize";
import { isPurchasableLeadtime } from "@/lib/cart-display";
import { prisma } from "@/lib/prisma";

// Product catalog is read-heavy and changes infrequently — ISR every hour.
export const revalidate = 3600;

export async function generateStaticParams() {
  const products = await prisma.product.findMany({
    where: { status: "on_sale" },
    select: { productId: true },
  });
  return products.map((p) => ({ id: p.productId }));
}

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface ProductDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const product = await getProductById(resolvedParams.id);
    if (!product) {
      return {
        title: "Product Not Found",
        description: "The product you are looking for does not exist or has been removed.",
        robots: { index: false, follow: false },
      };
    }

    const title = product.model
      ? `${product.productName} - ${product.model}`
      : product.productName;
    const description =
      product.description?.replace(/\s+/g, " ").trim().slice(0, 160) ||
      `Buy ${product.productName}${product.model ? " " + product.model : ""} from Global-TECH, your trusted cross-border MRO industrial supply partner.`;
    const image =
      (product.images as unknown as string[])?.[0] ||
      (product as unknown as { thumbnail?: string | null }).thumbnail ||
      null;

    return {
      title,
      description,
      alternates: { canonical: `/products/${product.productId}` },
      openGraph: {
        title,
        description,
        type: "website",
        url: `/products/${product.productId}`,
        siteName: "Global-TECH",
        images: image ? [{ url: image, alt: product.productName }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: image ? [image] : undefined,
      },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: "Product", description: "Global-TECH product detail page." };
  }
}

type Result =
  | { kind: "ok"; data: ReturnType<typeof serializeProductWithCategory> }
  | { kind: "notfound" }
  | { kind: "error" };

/** Build JSON-LD structured data for a product + breadcrumb trail. */
function buildProductJsonLd(product: ReturnType<typeof serializeProductWithCategory>) {
  const price = product.defaultQuote?.sellPrice ?? 0;
  // Leadtime 统一字段：含 "out of stock"（不区分大小写）= 缺货，其余（含空值）= 有货
  const availability = isPurchasableLeadtime(product.defaultQuote?.leadTime)
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.productName,
    model: product.model,
    description: product.description || undefined,
    image: product.images.length > 0 ? product.images : undefined,
    category: product.category?.categoryName || undefined,
    sku: product.productId,
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: price.toString(),
      availability,
      url: `${siteUrl}/products/${product.productId}`,
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${siteUrl}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Products",
        item: `${siteUrl}/products`,
      },
      ...(product.category
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: product.category.categoryName,
              item: `${siteUrl}/category/${product.category.slug}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: product.category ? 4 : 3,
        name: product.productName,
      },
    ],
  };

  return [productSchema, breadcrumbSchema];
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  let result: Result = { kind: "notfound" };

  try {
    const resolvedParams = await params;
    const product = await getProductById(resolvedParams.id);

    if (!product) {
      result = { kind: "notfound" };
    } else {
      result = { kind: "ok", data: serializeProductWithCategory(product) };
    }
  } catch (error) {
    console.error("Product detail page error:", error);
    result = { kind: "error" };
  }

  if (result.kind === "notfound") {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Product Not Found</h1>
          <p className="text-slate-500 mb-6">The product you are looking for does not exist or has been removed.</p>
          <Link
            href="/products"
            className="btn-primary"
          >
            Browse All Products
          </Link>
        </div>
      </div>
    );
  }

  if (result.kind === "error") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center px-4 py-12">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Service Unavailable</h1>
          <p className="text-slate-500 mb-6">We&apos;re experiencing temporary connectivity issues. Please try again later.</p>
          <RetryButton className="btn-primary" />
        </div>
      </div>
    );
  }

  const jsonLd = buildProductJsonLd(result.data);

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <ProductDetailContent product={result.data} />
    </>
  );
}
