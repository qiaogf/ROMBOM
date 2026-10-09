import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Regenerate the sitemap at most hourly to keep DB load low on crawler hits.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static top-level pages.
  const staticEntries: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
  ];

  // All categories.
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
  });
  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${siteUrl}/category/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // All brands.
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
  });
  const brandEntries: MetadataRoute.Sitemap = brands.map((b) => ({
    url: `${siteUrl}/brand/${b.slug}`,
    lastModified: b.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // All category-brand catalog pairs.
  const pairs = await prisma.categoryBrand.findMany({
    select: {
      category: { select: { slug: true, updatedAt: true } },
      brand: { select: { slug: true, updatedAt: true } },
    },
  });
  const catalogEntries: MetadataRoute.Sitemap = pairs.map((p) => ({
    url: `${siteUrl}/catalog/${p.category.slug}/${p.brand.slug}`,
    lastModified:
      p.brand.updatedAt > p.category.updatedAt
        ? p.brand.updatedAt
        : p.category.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // All brand-series detail pages (canonical Series.slug).
  const seriesList = await prisma.series.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true, brand: { select: { slug: true } } },
  });
  const seriesEntries: MetadataRoute.Sitemap = seriesList.map((s) => ({
    url: `${siteUrl}/brand/${s.brand.slug}/${s.slug}`,
    lastModified: s.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  // All on-sale products.
  const products = await prisma.product.findMany({
    where: { status: "on_sale" },
    select: { productId: true, updatedAt: true },
  });
  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${siteUrl}/products/${p.productId}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    ...staticEntries,
    ...categoryEntries,
    ...brandEntries,
    ...catalogEntries,
    ...seriesEntries,
    ...productEntries,
  ];
}
