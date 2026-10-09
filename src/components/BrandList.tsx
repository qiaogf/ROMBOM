import Link from "next/link";
import { Tag } from "lucide-react";
import type { Brand } from "@/lib/db-service";

interface BrandListProps {
  /** 当前类目 slug（如果处于类目页） */
  categorySlug?: string;
  /** 品牌列表 */
  brands: Brand[];
  /** 当前选中的 brand slug，用于高亮（如果处于标准链接模式） */
  activeBrandSlug?: string;
}

/**
 * 通用品牌列表：每个品牌是卡片。
 * 在类目视图下，点击品牌会跳标准链接：/category/{catSlug}?brand={brandSlug}
 */
export function BrandList({
  categorySlug,
  brands,
  activeBrandSlug,
}: BrandListProps) {
  if (brands.length === 0) {
    return (
      <div className="text-center py-6 border border-dashed border-slate-200 rounded">
        <Tag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-xs text-slate-500">No brands found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {brands.map((brand) => {
        // 构造跳转链接
        const href = categorySlug
          ? `/category/${categorySlug}?brand=${brand.slug}`
          : `/brand/${brand.slug}`;
        const isActive = activeBrandSlug === brand.slug;

        return (
          <Link
            key={brand.id}
            href={href}
            className={`block border rounded p-2.5 hover:shadow transition-all bg-white ${
              isActive
                ? "border-amber-500 ring-1 ring-amber-200"
                : "border-slate-200 hover:border-green-500"
            }`}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-semibold text-green-700 hover:text-green-800">
                {brand.name}
              </span>
            </div>
            {brand.description && (
              <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                {brand.description}
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}
