"use client";

import { useState, useMemo, useCallback } from "react";
import { Grid3X3, Tag, X } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

type CategoryData = {
  categoryId: string;
  categoryName: string;
  parentId: string | null;
  level: number;
  slug: string;
  briefDesc?: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { products: number };
  children?: CategoryData[];
};

type BrandData = {
  brandId: string;
  brandName: string;
  slug: string;
  description?: string | null;
  _count?: { products: number };
};

interface SidebarProps {
  categories: CategoryData[];
  brands: BrandData[];
}

export function Sidebar({ categories, brands }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  // ============ 从 URL 解析当前选中的 categorySlug + brandSlug ============
  // 三种 URL 模式：
  //  1) /category/{categorySlug}                 → 仅类目
  //  2) /category/{categorySlug}?brand=xxx       → 类目 + 品牌（标准链接）
  //  3) /brand/{brandSlug}                       → 仅品牌
  // 注意：/brand/xxx?category=xxx 不应该实际出现（会被 redirect），但解析逻辑仍兼容
  const { categorySlug, brandSlug } = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    let cat: string | null = null;
    let br: string | null = null;

    if (segments[0] === "category" && segments.length >= 2) {
      cat = segments[1];
      const qBrand = searchParams.get("brand");
      if (qBrand) br = qBrand;
    } else if (segments[0] === "brand" && segments.length >= 2) {
      br = segments[1];
      const qCat = searchParams.get("category");
      if (qCat) cat = qCat;
    } else if (segments[0] === "catalog" && segments.length >= 3) {
      // /catalog/[categorySlug]/[brandSlug] — 同时选中类目 + 品牌
      cat = segments[1];
      br = segments[2];
    }

    return { categorySlug: cat, brandSlug: br };
  }, [pathname, searchParams]);

  // ============ URL 构建（严格遵守架构规范） ============
  const buildUrl = useCallback(
    (newCatSlug: string | null, newBrandSlug: string | null): string => {
      // 菜单跳转规则：
      //  仅类目 → /category/{cat}
      //  仅品牌 → /brand/{brand}
      //  同时 → /category/{cat}?brand={brand} （统一标准链接）
      if (newCatSlug && newBrandSlug) {
        return `/category/${newCatSlug}?brand=${newBrandSlug}`;
      }
      if (newCatSlug) return `/category/${newCatSlug}`;
      if (newBrandSlug) return `/brand/${newBrandSlug}`;
      return "/";
    },
    []
  );

  // ============ 点击类目：切换 category，保持 brand（如果有） ============
  const handleCategoryClick = useCallback(
    (clickedSlug: string) => {
      const newCat = categorySlug === clickedSlug ? null : clickedSlug;
      const target = buildUrl(newCat, brandSlug);

      router.push(target);
      setMobileOpen(false);
    },
    [categorySlug, brandSlug, buildUrl, router]
  );

  // ============ 点击品牌：切换 brand，保持 category（如果有） ============
  const handleBrandClick = useCallback(
    (clickedSlug: string) => {
      const newBr = brandSlug === clickedSlug ? null : clickedSlug;
      const target = buildUrl(categorySlug, newBr);

      router.push(target);
      setMobileOpen(false);
    },
    [categorySlug, brandSlug, buildUrl, router]
  );

  // 手指按下瞬间预取目标页（click 触发导航时 RSC 数据已在路上，省一个隧道往返）
  const prefetchCategory = useCallback(
    (clickedSlug: string) => {
      const newCat = categorySlug === clickedSlug ? null : clickedSlug;
      router.prefetch(buildUrl(newCat, brandSlug));
    },
    [categorySlug, brandSlug, buildUrl, router]
  );

  const prefetchBrand = useCallback(
    (clickedSlug: string) => {
      const newBr = brandSlug === clickedSlug ? null : clickedSlug;
      router.prefetch(buildUrl(categorySlug, newBr));
    },
    [categorySlug, brandSlug, buildUrl, router]
  );

  // ============ 渲染类目 ============
  const renderRootCategories = () => {
    const rootCats = categories.filter(
      (cat) => !cat.parentId || cat.parentId === "0"
    );
    if (rootCats.length === 0) {
      return (
        <p className="px-1.5 py-0.5 text-slate-500" style={{ fontSize: "13px" }}>
          No categories
        </p>
      );
    }
    // 侧边栏只渲染根类目 → 直接用 categorySlug 与当前条目的 slug 对比即可
    // 简化匹配逻辑，避免 findRootCategorySlug 找错导致不高亮
    return rootCats.map((category) => {
      const isSelected = categorySlug === category.slug;
      return (
        <button
          key={category.categoryId}
          onClick={() => handleCategoryClick(category.slug)}
          onPointerDown={() => prefetchCategory(category.slug)}
          className={`w-full text-left min-h-[36px] sm:min-h-0 sm:py-1 px-2.5 sm:px-2 my-0 mx-0.5 rounded flex items-center leading-tight transition-colors duration-100 truncate active:bg-amber-200 ${
            isSelected
              ? "bg-amber-400/25 border-l-4 border-amber-500 text-black font-bold"
              : "border-l-4 border-transparent text-black hover:bg-slate-100 hover:text-black"
          } text-[15px] sm:text-[14px]`}
        >
          {category.categoryName}
        </button>
      );
    });
  };

  // ============ 渲染品牌 ============
  const renderBrands = () => {
    if (brands.length === 0) {
      return (
        <p className="px-1.5 py-0.5 text-slate-500" style={{ fontSize: "13px" }}>
          No brands
        </p>
      );
    }
    return brands.map((brand) => {
      const isSelected = brandSlug === brand.slug;
      return (
        <button
          key={brand.brandId}
          onClick={() => handleBrandClick(brand.slug)}
          onPointerDown={() => prefetchBrand(brand.slug)}
          className={`w-full text-left min-h-[36px] sm:min-h-0 sm:py-1 px-2.5 sm:px-2 my-0 mx-0.5 rounded flex items-center leading-tight transition-colors duration-100 truncate active:bg-amber-200 ${
            isSelected
              ? "bg-amber-400/25 border-l-4 border-amber-500 text-black font-bold"
              : "border-l-4 border-transparent text-black hover:bg-slate-100 hover:text-black"
          } text-[15px] sm:text-[14px]`}
        >
          {brand.brandName}
        </button>
      );
    });
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 sm:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className={`sm:hidden fixed top-28 left-2 z-50 w-11 h-11 flex items-center justify-center bg-white rounded-lg shadow border border-slate-200 text-slate-600 active:bg-amber-100 ${
          mobileOpen ? "hidden" : ""
        }`}
        aria-label="Open sidebar"
      >
        <Grid3X3 className="w-5 h-5" />
      </button>

      <aside
        className={`w-44 sm:w-32 md:w-36 bg-white shrink-0 transition-transform duration-200 ease-in-out h-full flex flex-col ${
          mobileOpen ? "max-sm:translate-x-0" : "max-sm:-translate-x-full"
        } max-sm:fixed max-sm:inset-y-0 max-sm:left-0 max-sm:z-40 sm:static sm:translate-x-0`}
      >
        <div className="h-0.5 bg-amber-400 shrink-0"></div>

        <div className="flex flex-col min-h-0 flex-1">
          <div className="flex items-center justify-between px-1.5 py-0.5 bg-slate-50 border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-1">
              <Grid3X3 className="w-3 h-3 text-green-800" />
              <span
                className="font-medium text-green-800 uppercase tracking-wider"
                style={{ fontSize: "13px" }}
              >
                Category
              </span>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="sm:hidden w-8 h-8 flex items-center justify-center rounded text-slate-500 active:bg-slate-200"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto sidebar-scrollbar">
            <div className="py-0.5">{renderRootCategories()}</div>
          </div>
        </div>

        <div className="h-0.5 bg-amber-400 shrink-0"></div>

        <div className="flex flex-col min-h-0 flex-1">
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 border-b border-slate-200 shrink-0">
            <Tag className="w-3 h-3 text-green-800" />
            <span
              className="font-medium text-green-800 uppercase tracking-wider"
              style={{ fontSize: "13px" }}
            >
              Brand
            </span>
          </div>
          <div className="flex-1 overflow-y-auto sidebar-scrollbar">
            <div className="py-0.5">{renderBrands()}</div>
          </div>
        </div>
      </aside>
    </>
  );
}
