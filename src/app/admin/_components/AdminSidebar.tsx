"use client";

import { useState } from "react";
import { Grid3X3, Shield, X } from "lucide-react";
import { AdminNav } from "./AdminNav";

// 移动端抽屉式侧栏：与主页面左侧 Category / Brand 侧栏一致的收放行为
export function AdminSidebar({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 sm:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className={`sm:hidden fixed top-14 left-2 z-50 w-11 h-11 flex items-center justify-center bg-white rounded-lg shadow border border-slate-200 text-slate-600 active:bg-amber-100 ${
          mobileOpen ? "hidden" : ""
        }`}
        aria-label="Open admin navigation"
      >
        <Grid3X3 className="w-5 h-5" />
      </button>

      <aside
        className={`w-52 sm:w-[124px] shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out ${
          mobileOpen ? "max-sm:translate-x-0" : "max-sm:-translate-x-full"
        } max-sm:fixed max-sm:inset-y-0 max-sm:left-0 max-sm:z-40 sm:static sm:translate-x-0`}
      >
        <div className="h-11 shrink-0 flex items-center gap-1.5 px-2 border-b border-slate-200 bg-white">
          <Shield className="w-4 h-4 shrink-0 text-slate-700" />
          <span className="text-[12px] font-semibold text-slate-800 whitespace-nowrap">Admin Panel</span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto sm:hidden w-8 h-8 flex items-center justify-center rounded text-slate-500 active:bg-slate-200"
            aria-label="Close admin navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <AdminNav onNavigate={() => setMobileOpen(false)} isSuperAdmin={isSuperAdmin} />
      </aside>
    </>
  );
}
