import Link from "next/link";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  categoryId?: string;
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
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

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

      <nav className="flex items-center gap-1">
        {page > 1 ? (
          <Link
            href={getPageUrl(page - 1)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        ) : (
          <span className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-300 cursor-not-allowed">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </span>
        )}

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

        {page < totalPages ? (
          <Link
            href={getPageUrl(page + 1)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <span className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-300 cursor-not-allowed">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}
      </nav>
    </div>
  );
}