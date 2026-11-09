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
  const displaySeriesName = seriesRecord?.seriesName || seriesName;
  const displaySeriesDesc = seriesRecord?.description || null;

  // 特殊类目：(Others) 分组对应 seriesId=null 的 ModelPrice
  // 查 Series 表失败后，尝试按 brandId + seriesId=null + (类目匹配) 查 ModelPrice
  // seriesSlug 可能是 "(Others)"（品牌页 Link 正确）或 "others"（旧 slugify 产物），都兼容
  const normalizedSlug = seriesName.replace(/[\s]/g, "").toLowerCase();
  const isSpecialCategoryGroup =
    !seriesRecord &&
    (seriesName === "(Others)" || seriesName === "Others" || normalizedSlug === "(others)" || normalizedSlug === "others");

  if (!seriesRecord && products.length === 0 && !isSpecialCategoryGroup) {
    // 品牌下既无旧产品也无 Series 记录 → 该系列不存在
    notFound();
  }

  // 线上展示以 ModelPrice 比价优胜行为准（最低价 / 最快交期可各一行）；
  // 旧 Product 行仅用于新体系未覆盖的型号，避免同型号重复且价格显示 0.00
  let modelPrices: Awaited<ReturnType<typeof prisma.modelPrice.findMany>>;
  if (seriesRecord) {
    modelPrices = await prisma.modelPrice.findMany({
      where: {
        seriesId: seriesRecord.seriesId,
        isActive: true,
        status: "on_sale",
        OR: [{ isWinnerPrice: true }, { isWinnerLeadTime: true }],
      },
      orderBy: [{ isWinnerPrice: "desc" }, { sortOrder: "asc" }],
    });
  } else if (isSpecialCategoryGroup) {
    // 特殊类目：seriesId=null 的 ModelPrice，按 brandId 过滤
    // 同时过滤 brandId + categoryId（防止多个特殊类目混在一起）
    const catBrandLinks = await prisma.categoryBrand.findMany({
      where: { brandId: brand.id, category: { slug: { not: "discontinued" } } },
      select: { categoryId: true },
    });
    const categoryIds = catBrandLinks.map((cb) => cb.categoryId);
    modelPrices = await prisma.modelPrice.findMany({
      where: {
        brandId: brand.id,
        seriesId: null,
        isActive: true,
        status: "on_sale",
        categoryId: { in: categoryIds },
        OR: [{ isWinnerPrice: true }, { isWinnerLeadTime: true }],
      },
      orderBy: [{ isWinnerPrice: "desc" }, { sortOrder: "asc" }],
    });
  } else {
    modelPrices = [];
  }

  // 兜底：如果仍无 ModelPrice 且无 Product → 404
  if (modelPrices.length === 0 && products.length === 0) notFound();
  const modelPriceModels = new Set(modelPrices.map((mp) => mp.model));
  const productInfoMap = new Map(
    products
      .filter((p) => p.productName && p.productName !== p.model)
      .map((p) => [p.model, p])
  );

  mappedProducts = [
    ...modelPrices.map((mp): Product => {
      const info = productInfoMap.get(mp.model);
      return {
        id: mp.modelPriceId,
        name: info?.productName || mp.productName,
        model: mp.model,
        description: info?.description || mp.description,
        unit: mp.unit,
        price: mp.sellPrice.toNumber(),
        quoteId: "",
        moq: mp.moq,
        condition: mp.condition ?? null,
        leadTime: mp.leadTime,
        categoryId: mp.categoryId ?? "",
        brandId: mp.brandId ?? mp.supplierId ?? "",
        seriesName: displaySeriesName,
        seriesDesc: null,
        priceTag:
          mp.isWinnerPrice && mp.isWinnerLeadTime
            ? "both"
            : mp.isWinnerPrice
              ? "lowest"
              : "fastest",
      };
    }),
    ...products
      .filter((p) => !modelPriceModels.has(p.model))
      .map((p): Product => {
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
          condition: null,
          leadTime: quote?.leadTime ?? null,
          categoryId: p.categoryId,
          brandId: p.brandId,
          seriesName: p.series,
          seriesDesc: null,
        };
      }),
  ];

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
        {/* Breadcrumb + 总 SKU */}
        <div className="flex items-center justify-between mb-3">
          <nav className="flex items-center gap-1 text-xs text-slate-500">
            <Link href="/" className="hover:text-green-700">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/brand/${brandSlug}`} className="hover:text-green-700">{brand.name}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-700 font-medium">{displaySeriesName}</span>
          </nav>
          {mappedProducts.length > 0 && (
            <span className="text-[11px] text-slate-500">
              {mappedProducts.length} SKU
            </span>
          )}
        </div>

        {/* 型号价格表 */}
        <ProductPriceTable seriesGroups={seriesGroups} showSeriesHeader={false} />
      </div>
    </div>
  );
}
