import Link from "next/link";
import type { Category } from "@/../prisma/generated/client";

interface CategoryFilterProps {
  categories: Category[];
  selectedCategoryId?: string;
}

export function CategoryFilter({
  categories,
  selectedCategoryId,
}: CategoryFilterProps) {
  const groupedCategories = categories.reduce(
    (acc, cat) => {
      const key = cat.parentId || "root";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(cat);
      return acc;
    },
    {} as Record<string, Category[]>
  );

  const rootCategories = groupedCategories["root"] || [];

  return (
    <div className="bg-white border border-slate-200 rounded-md p-3">
      <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
        Categories
      </h3>
      <div className="space-y-0.5">
        <Link
          href="/products"
          className={`block px-2 py-1 text-xs font-medium rounded transition-colors ${
            !selectedCategoryId
              ? "bg-slate-800 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          All Products
        </Link>

        {rootCategories.map((category) => {
          const children = groupedCategories[category.id] || [];
          const isSelected = selectedCategoryId === category.id;

          return (
            <div key={category.id}>
              <Link
                href={`/products?category=${category.id}`}
                className={`block px-2 py-1 text-xs font-medium rounded transition-colors ${
                  isSelected
                    ? "bg-slate-800 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {category.nameEn || category.name}
              </Link>

              {children.length > 0 && (
                <div className="ml-2 border-l border-slate-200 pl-2 space-y-0.5 mt-0.5">
                  {children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/products?category=${child.id}`}
                      className={`block px-2 py-1 text-xs rounded transition-colors ${
                        selectedCategoryId === child.id
                          ? "bg-slate-800 text-white"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      }`}
                    >
                      {child.nameEn || child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}