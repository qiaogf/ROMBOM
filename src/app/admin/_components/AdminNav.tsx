"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderTree,
  Tag,
  Layers,
  DollarSign,
  Building2,
  Users,
  ShoppingCart,
  Upload,
  UserCog,
  ReceiptText,
  Code,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** 仅 Super Admin 可见：账号类管理页 */
  superOnly?: boolean;
}

// 与原来一致：全部为一级导航，不分组、可折叠
const NAV_ITEMS: NavItem[] = [
  { href: "/admin/supplier", label: "Supplier", icon: Building2, superOnly: true },
  { href: "/admin/customer", label: "Customer", icon: Users, superOnly: true },
  { href: "/admin/admin-user", label: "Admin", icon: UserCog, superOnly: true },
  { href: "/admin/category", label: "Category", icon: FolderTree },
  { href: "/admin/brand", label: "Brand", icon: Tag },
  { href: "/admin/series", label: "Series", icon: Layers },
  { href: "/admin/import-price", label: "Product", icon: Upload },
  { href: "/admin/model-price", label: "Price", icon: DollarSign },
  { href: "/admin/purchase-order", label: "Purchase", icon: ShoppingCart },
  { href: "/admin/sales-order", label: "Sales", icon: ReceiptText },
  { href: "/admin/api", label: "API", icon: Code },
];

export function AdminNav({
  onNavigate,
  isSuperAdmin = false,
}: { onNavigate?: () => void; isSuperAdmin?: boolean } = {}) {
  const pathname = usePathname();
  const items = isSuperAdmin ? NAV_ITEMS : NAV_ITEMS.filter((item) => !item.superOnly);

  return (
    <nav className="flex-1 overflow-y-auto py-1">
      {items.map((item) => {
        const Icon = item.icon;
        // 子路由也算选中（如 /admin/import-price?batch=xxx）
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-1.5 px-2 py-2 text-[15px] font-semibold transition-colors border-l-4 ${
              isActive
                ? "bg-amber-400/25 border-amber-500 text-black font-bold"
                : "border-transparent text-black hover:bg-slate-200/60 hover:text-black"
            }`}
          >
            <Icon
              className={`w-3.5 h-3.5 shrink-0 ${
                isActive ? "text-amber-700" : "text-slate-500"
              }`}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
