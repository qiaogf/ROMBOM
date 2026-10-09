import Link from "next/link";
import { Grid3X3 } from "lucide-react";
import type { Category } from "@/lib/db-service";

interface CategoryListProps {
  /** 当前品牌 slug（如果处于品牌页） */
  brandSlug?: string;
  /** 类目列表 */
  categories: Category[];
  /** 当前选中的 category slug，用于高亮（仅标准链接模式） */
  activeCategorySlug?: string;
}

/**
 * 通用类目列表：每个类目是卡片。
 * 规则：在品牌视图下点击类目 → 统一跳转标准链接 /category/{catSlug}?brand={brandSlug}
 *       非品牌视图 → 跳 /category/{catSlug}
 */
export function CategoryList({
  brandSlug,
  categories,
  activeCategorySlug,
}: CategoryListProps) {
  if (categories.length === 0) {
    return (
      <div className="text-center py-6 border border-dashed border-slate-200 rounded">
        <Grid3X3 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-xs text-slate-500">No categories found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {categories.map((category) => {
        // 跳转规则：存在 brandSlug 时跳标准链接，否则跳普通类目页
        const href = brandSlug
          ? `/category/${category.slug}?brand=${brandSlug}`
          : `/category/${category.slug}`;
        const isActive = activeCategorySlug === category.slug;

        return (
          <Link
            key={category.id}
            href={href}
            className={`block border rounded p-2.5 hover:shadow transition-all bg-white ${
              isActive
                ? "border-amber-500 ring-1 ring-amber-200"
                : "border-slate-200 hover:border-green-500"
            }`}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-semibold text-green-700 hover:text-green-800">
                {category.name}
              </span>
            </div>
            {category.description && (
              <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                {category.description}
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}
