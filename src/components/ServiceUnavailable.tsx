import Link from "next/link";
import { RefreshCw, WifiOff } from "lucide-react";

/**
 * 数据库/中继瞬时不可用时的友好占位页
 * 与"记录不存在"区分开：数据仍在，只是此刻取不到，点 Try again 重新加载即可。
 */
export function ServiceUnavailable({
  retryHref,
  title = "Temporarily unavailable",
  message = "We couldn't reach our server just now. Your cart and orders are safe — please try again in a moment.",
  compact = false,
}: {
  retryHref: string;
  title?: string;
  message?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "px-4 py-12 text-center"
          : "flex-1 min-h-0 overflow-y-scroll main-scrollbar"
      }
    >
      {!compact && <div className="h-0.5 bg-amber-400 shrink-0"></div>}
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-10 h-10 text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-slate-500 mb-8">{message}</p>
        <Link
          href={retryHref}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded bg-[#336633] text-white text-sm font-bold hover:bg-[#2d5a2d] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </Link>
      </div>
    </div>
  );
}
