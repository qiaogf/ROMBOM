import Link from "next/link";
import { HeaderNav } from "./HeaderNav";
import { SearchBar } from "./SearchBar";

/**
 * 页顶 — 参照 mcmaster.com
 * 桌面端（lg+）单行：Logo（左）+ 搜索（中）+ 四选项（右）
 * 移动端（<lg）两行：第一行 Logo + 精简导航，第二行搜索框全宽
 * 右侧依次：Email Us / Log in / Cart / Order（弹窗与跳转逻辑在 HeaderNav 客户端组件内）
 *
 * 注意：本组件保持纯静态渲染。登录态由 HeaderNav 客户端通过 /api/me 异步获取，
 * 切勿在此读取 cookies/session，否则全站公开页会被拖成 no-store 动态渲染。
 */
export function Header() {
  return (
    <header className="shrink-0 bg-white border-b-2 border-amber-400">
      {/* Row 1: Logo + 导航（桌面端含搜索框） */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 h-14">
        <Link
          href="/"
          className="flex items-center hover:opacity-80 transition-opacity shrink-0"
          title="Home"
        >
          <span className="text-xl font-bold tracking-wide text-green-800 whitespace-nowrap">
            Global-TECH
          </span>
        </Link>

        {/* 搜索框（仅桌面端单行展示） */}
        <div className="hidden lg:block flex-1 max-w-md mx-4">
          <SearchBar />
        </div>

        <HeaderNav />
      </div>

      {/* Row 2: 搜索框全宽（移动端 / 平板 <lg） */}
      <div className="lg:hidden px-4 pb-2.5">
        <SearchBar />
      </div>
    </header>
  );
}
