import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbProps {
  categorySlug?: string;
  categoryName?: string;
  brandSlug?: string;
  brandName?: string;
}

/**
 * 面包屑组件：自动识别路径 + query 参数
 * 层次：首页 > 类目 > 品牌（仅当同时有 category + brand 时才显示品牌）
 */
export function Breadcrumb({
  categorySlug,
  categoryName,
  brandSlug,
  brandName,
}: BreadcrumbProps) {
  return (
    <nav className="flex items-center text-xs text-slate-500 mb-3 flex-wrap gap-1">
      <Link
        href="/"
        className="inline-flex items-center gap-1 hover:text-amber-600 transition-colors"
      >
        <Home className="w-3 h-3" />
        <span>Home</span>
      </Link>

      {categorySlug && (
        <>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <Link
            href={`/category/${categorySlug}`}
            className="hover:text-amber-600 transition-colors"
          >
            {categoryName || categorySlug}
          </Link>
        </>
      )}

      {categorySlug && brandSlug && (
        <>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-slate-900 font-medium">
            {brandName || brandSlug}
          </span>
        </>
      )}

      {!categorySlug && brandSlug && (
        <>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <Link
            href={`/brand/${brandSlug}`}
            className="hover:text-amber-600 transition-colors"
          >
            {brandName || brandSlug}
          </Link>
        </>
      )}
    </nav>
  );
}
