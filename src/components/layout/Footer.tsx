"use client";

/**
 * 页脚 — McMaster 风格
 * 右侧 Admin / Supplier 均为弹窗登录（复用 ModalShell + Admin/SupplierLoginModal）
 */
import { useState } from "react";
import Link from "next/link";
import { Shield, Building2, Home } from "lucide-react";
import { AdminLoginModal } from "./AdminLoginModal";
import { SupplierLoginModal } from "./SupplierLoginModal";

export function Footer() {
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showSupplierLogin, setShowSupplierLogin] = useState(false);

  return (
    <>
      <footer className="bg-white shrink-0 border-t border-slate-200">
        <div className="h-0.5 bg-amber-400"></div>
        <nav className="flex items-center justify-between h-10 px-4 sm:px-6">
          {/* 左侧：常规链接 */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-1.5 px-2 py-1 text-slate-600 hover:text-amber-600 transition-colors text-[13px] font-medium">
              <Home className="w-3.5 h-3.5 shrink-0" />
              <span>Home</span>
            </Link>
          </div>

          {/* 右侧：管理员/供应商入口 (与买家入口分开) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdminLogin(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-slate-500 hover:text-green-800 hover:bg-green-50 transition-colors text-[12px] font-medium cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>Admin</span>
            </button>
            <span className="w-px h-3.5 bg-slate-200"></span>
            <button
              type="button"
              onClick={() => setShowSupplierLogin(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-slate-500 hover:text-green-800 hover:bg-green-50 transition-colors text-[12px] font-medium cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span>Supplier</span>
            </button>
          </div>
        </nav>
      </footer>

      {showAdminLogin && <AdminLoginModal onClose={() => setShowAdminLogin(false)} />}
      {showSupplierLogin && <SupplierLoginModal onClose={() => setShowSupplierLogin(false)} />}
    </>
  );
}
