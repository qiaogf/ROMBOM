import Link from "next/link";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  categoryId?: string;
}

/** 前后翻页箭头（桌面与移动共用，样式与原实现逐字一致） */
function PageArrow({
  href,
  disabled,
  dir,
}: {
  href: string;
  disabled: boolean;
  dir: "left" | "right";
}) {
  const cls = `px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium ${
    disabled
      ? "text-slate-300 cursor-not-allowed"
      : "text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
  }`;
  const icon = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={dir === "left" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
      />
    </svg>
  );

  if (disabled) {
    return (
      <span className={cls} aria-disabled="true">
        {icon}
      </span>
    );
  }
  return (
    <Link href={href} className={cls} aria-label={dir === "left" ? "Previous page" : "Next page"}>
      {icon}
    </Link>
  );
}

export function Pagination({ page, totalPages, total, pageSize, categoryId }: PaginationProps) {
  const baseUrl = categoryId ? `/products?category=${categoryId}` : "/products";

  const getPageUrl = (p: number) => {
    if (categoryId) {
      return `${baseUrl}&page=${p}`;
    }
    return `${baseUrl}?page=${p}`;
  };

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const pages = [];
  const maxVisible = 5;

  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  if (startPage > 1) {
    pages.push({ number: 1, isEllipsis: false });
    if (startPage > 2) {
      pages.push({ number: -1, isEllipsis: true });
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push({ number: i, isEllipsis: false });
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pages.push({ number: -1, isEllipsis: true });
    }
    pages.push({ number: totalPages, isEllipsis: false });
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8 border-t border-slate-100">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-900">{startItem}</span> - <span className="font-medium text-slate-900">{endItem}</span> of <span className="font-medium text-slate-900">{total}</span> products
      </p>

      {/* 移动端紧凑分页：Prev / Page x of y / Next */}
      <nav className="flex sm:hidden items-center gap-2">
        <PageArrow href={getPageUrl(page - 1)} disabled={page <= 1} dir="left" />
        <span className="text-sm text-slate-600 font-medium">
          Page <span className="text-slate-900">{page}</span> of{" "}
          <span className="text-slate-900">{totalPages}</span>
        </span>
        <PageArrow href={getPageUrl(page + 1)} disabled={page >= totalPages} dir="right" />
      </nav>

      {/* 桌面端完整页码分页 */}
      <nav className="hidden sm:flex items-center gap-1">
        <PageArrow href={getPageUrl(page - 1)} disabled={page <= 1} dir="left" />

        {pages.map(({ number, isEllipsis }) => (
          isEllipsis ? (
            <span key={number} className="px-2 py-2 text-slate-400 text-sm">...</span>
          ) : (
            <Link
              key={number}
              href={getPageUrl(number)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                number === page
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              {number}
            </Link>
          )
        ))}

        <PageArrow href={getPageUrl(page + 1)} disabled={page >= totalPages} dir="right" />
      </nav>
    </div>
  );
}
