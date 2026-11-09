"use client";

/**
 * 页脚 — McMaster 风格
 * 登录入口统一收拢到页首右上角 Log in 弹窗（Admin / Supplier 不再单独入口）
 */
import Link from "next/link";
import { Home } from "lucide-react";

// 底行右侧视频入口（仅保留 YouTube）
const SOCIAL_LINKS = [
  {
    label: "YouTube",
    href: "https://www.youtube.com/",
    path:
      "M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z",
  },
] as const;

export function Footer() {
  return (
    <footer className="bg-white shrink-0 border-t border-slate-200">
      <div className="h-0.5 bg-amber-400"></div>
      <nav className="flex items-center justify-between h-10 px-4 sm:px-6">
        {/* 左侧：常规链接 */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-1.5 px-2 py-1 text-slate-600 hover:text-amber-600 transition-colors text-[13px] font-medium">
            <Home className="w-3.5 h-3.5 shrink-0" />
            <span>Home</span>
          </Link>
          <Link href="/about" className="px-2 py-1 text-slate-600 hover:text-amber-600 transition-colors text-[13px] font-medium">
            About
          </Link>
          <Link href="/terms" className="px-2 py-1 text-slate-600 hover:text-amber-600 transition-colors text-[13px] font-medium">
            Terms
          </Link>
        </div>

        {/* 右侧：视频 / 社媒入口（等宽单元 + 等间距，视觉上等距离排布） */}
        <div className="flex items-center gap-2">
          {SOCIAL_LINKS.map(({ label, href, path }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className="inline-flex items-center justify-center w-7 h-7 rounded text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="w-4 h-4">
                <path d={path} />
              </svg>
            </a>
          ))}
        </div>
      </nav>
    </footer>
  );
}
