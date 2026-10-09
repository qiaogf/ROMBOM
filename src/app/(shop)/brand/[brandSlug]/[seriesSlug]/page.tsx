import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getBrandBySlug } from "@/lib/db-service";
import { prisma } from "@/lib/prisma";
import { ProductPriceTable } from "@/components/ProductPriceTable";
import type { SeriesGroup, Product } from "@/lib/db-service";

// 注意：本页不能启用 ISR（revalidate/generateStaticParams）。
// shop layout 的 Header 通过 getCurrentUser() 读取 cookies()，
// 运行时按需静态生成会抛 DYNAMIC_SERVER_USAGE（500）。
// 其他 ISR 页面因 generateStaticParams 返回真实路径在构建期降级为动态；
// 本页路径无法枚举（series slug 动态），必须保持纯动态渲染。

interface PageProps {
  params: Promise<{ brandSlug: string; seriesSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brandSlug, seriesSlug } = await params;
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) return {};
  const seriesName = decodeURIComponent(seriesSlug);
  return {
    title: `${brand.name} ${seriesName} Price List`,
    description: `Browse ${brand.name} ${seriesName} series models with pricing and specifications.`,
    alternates: { canonical: `/brand/${brandSlug}/${seriesSlug}` },
  };
}

export default async function SeriesDetailPage({ params }: PageProps) {
  const { brandSlug, seriesSlug } = await params;
  const seriesName = decodeURIComponent(seriesSlug);

  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  // 先查 Series 表拿到权威系列名（精确匹配 slug）
  // 解决 slugify("LOGO!")="logo" 与 Series.slug="logo!" 不一致问题
  // 品牌页 ensureGroup 已改为优先用 Series.slug，所以 URL 里的 seriesSlug 应与 Series.slug 一致
  const seriesRecord = await prisma.series.findFirst({
    where: {
      brandId: brand.id,
      OR: [{ slug: seriesName }, { seriesName: seriesName }],
    },
    select: { seriesId: true, seriesName: true, description: true },
  });

  // 用 Series 表的权威系列名查 Product（精确匹配）
  // SQLite 无 mode:"insensitive"，依赖 Series 表提供正确的 canonical name
  const querySeriesName = seriesRecord?.seriesName || seriesName;

  // 查询该品牌下指定系列的所有产品（旧模型 Product 表）
  // SQLite 的 = 大小写敏感，若 Series 表有记录则 querySeriesName 是 canonical name 可精确匹配
  // 若无 Series 记录，则取品牌下所有在售产品在 JS 中做大小写不敏感过滤
  let products;
  if (seriesRecord) {
    products = await prisma.product.findMany({
      where: {
        brandId: brand.id,
        series: querySeriesName,
        status: "on_sale",
      },
      include: {
        supplierQuotes: {
          where: { isValid: true },
          take: 1,
          orderBy: { sellPrice: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
  } else {
    // 无 Series 记录 → 拉取品牌下全部在售产品，在 JS 中大小写不敏感过滤
    const allBrandProducts = await prisma.product.findMany({
      where: {
        brandId: brand.id,
        status: "on_sale",
      },
      include: {
        supplierQuotes: {
          where: { isValid: true },
          take: 1,
          orderBy: { sellPrice: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
    products = allBrandProducts.filter(
      (p) => (p.series || "").toLowerCase() === querySeriesName.toLowerCase()
    );
  }

  let mappedProducts: Product[];
  let displaySeriesName = seriesRecord?.seriesName || seriesName;
  let displaySeriesDesc = seriesRecord?.description || null;

  if (products.length > 0) {
    // Product(旧模型) 无 Product Condition 字段，从 ModelPrice（新模型）按 model 批量补充
    const conditions = await prisma.modelPrice.findMany({
      where: { model: { in: products.map((p) => p.model) } },
      select: { model: true, condition: true },
    });
    const conditionMap = new Map(conditions.map((c) => [c.model, c.condition]));

    mappedProducts = products.map((p): Product => {
      const quote = p.supplierQuotes[0];
      return {
        id: p.productId,
        name: p.productName,
        model: p.model,
        description: p.description,
        unit: p.unit,
        price: quote ? Number(quote.sellPrice) : 0,
        quoteId: quote?.quoteId || "",
        moq: quote?.moq ?? 1,
        condition: conditionMap.get(p.model) ?? null,
        stockStatus: quote?.stockStatus ?? "in_stock",
        leadTime: quote?.leadTime ?? null,
        categoryId: p.categoryId,
        brandId: p.brandId,
        seriesName: p.series,
        seriesDesc: null,
      };
    });
  } else if (seriesRecord) {
    // 回退：新模型 ModelPrice 表 — 用顶部已查到的 Series 记录
    const modelPrices = await prisma.modelPrice.findMany({
      where: { seriesId: seriesRecord.seriesId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    mappedProducts = modelPrices.map((mp): Product => ({
      id: mp.modelPriceId,
      name: mp.productName,
      model: mp.model,
      description: mp.description,
      unit: mp.unit,
      price: mp.sellPrice.toNumber(),
      quoteId: "",
      moq: mp.moq,
      condition: mp.condition,
      stockStatus: mp.stockStatus,
      leadTime: mp.leadTime,
      categoryId: "",
      brandId: mp.supplierId ?? "",
      seriesName: seriesRecord.seriesName,
      seriesDesc: null,
    }));
  } else {
    // 品牌下既无旧产品也无 Series 记录 → 该系列不存在
    notFound();
  }

  // 转换为 SeriesGroup 格式
  const seriesGroups: SeriesGroup[] = [{
    seriesName: displaySeriesName,
    seriesSlug: seriesSlug,
    seriesDesc: displaySeriesDesc,
    products: mappedProducts,
  }];

  return (
    <div className="flex-1 min-h-0 overflow-y-scroll main-scrollbar">
      <div className="h-0.5 bg-amber-400 shrink-0"></div>
      <div className="px-3 sm:px-4 pt-3 pb-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-xs text-slate-500 mb-3">
          <Link href="/" className="hover:text-green-700">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href={`/brand/${brandSlug}`} className="hover:text-green-700">{brand.name}</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-700 font-medium">{displaySeriesName}</span>
        </nav>

        {/* 型号价格表 */}
        <ProductPriceTable seriesGroups={seriesGroups} showSeriesHeader={false} />
      </div>
    </div>
  );
}
