"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

/**
 * 顶部搜索条 — 国际标准规范
 *
 * 设计规范：
 *  - 圆角胶囊 (rounded-full)
 *  - 半透明深色底 (bg-white/5)，聚焦时加亮 (focus:bg-white/10)
 *  - 搜索图标 16px (w-4 h-4)，左侧固定
 *  - 输入文字 13px，placeholder 浅色
 *  - 整体宽度 flex-1，居中，max-w-md
 */
export function SearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600/60 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search model / series..."
          className="w-full pl-9 pr-4 py-2 sm:py-1.5 min-h-[40px] rounded-full text-[14px] sm:text-[13px] bg-green-50 text-green-800 placeholder:text-green-600/40 border border-green-200 focus:outline-none focus:border-amber-400/60 focus:bg-white transition-colors"
        />
      </div>
    </form>
  );
}
