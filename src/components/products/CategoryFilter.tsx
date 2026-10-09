import Link from "next/link";
import type { SerializableCategory } from "@/lib/serialize";

interface CategoryFilterProps {
  categories: SerializableCategory[];
  selectedCategoryId?: string;
}

export function CategoryFilter({ categories, selectedCategoryId }: CategoryFilterProps) {
  const groupedCategories = categories.reduce((acc, cat) => {
    const key = cat.parentId || "root";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(cat);
    return acc;
  }, {} as Record<string, SerializableCategory[]>);

  const rootCategories = groupedCategories["root"] || [];

  return (
    <div className="bg-white rounded-xl ring-1 ring-slate-100 p-4 sm:p-6">
      <h3 className="font-semibold text-slate-900 mb-4">Categories</h3>
      <div className="space-y-2">
        <Link
          href="/products"
          className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            !selectedCategoryId
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          All Products
        </Link>

        {rootCategories.map((category) => {
          const children = groupedCategories[category.categoryId] || [];
          const isSelected = selectedCategoryId === category.categoryId;

          return (
            <div key={category.categoryId}>
              <Link
                href={`/products?category=${category.categoryId}`}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isSelected
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {category.categoryName}
              </Link>

              {children.length > 0 && (
                <div className="ml-3 mt-1 space-y-1 border-l border-slate-100 pl-3">
                  {children.map((child) => (
                    <Link
                      key={child.categoryId}
                      href={`/products?category=${child.categoryId}`}
                      className={`block px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedCategoryId === child.categoryId
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {child.categoryName}
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