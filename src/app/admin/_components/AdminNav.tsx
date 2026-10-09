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
  PackageCheck,
  ReceiptText,
  Truck,
  Code,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/supplier", label: "supplier", icon: Building2 },
  { href: "/admin/customer", label: "customer", icon: Users },
  { href: "/admin/admin-user", label: "admin", icon: UserCog },
  { href: "/admin/category", label: "category", icon: FolderTree },
  { href: "/admin/brand", label: "brand", icon: Tag },
  { href: "/admin/series", label: "series", icon: Layers },
  { href: "/admin/import-price", label: "product", icon: Upload },
  { href: "/admin/model-price", label: "price", icon: DollarSign },
  { href: "/admin/purchase-order", label: "Purchase Order", icon: ShoppingCart },
  { href: "/admin/sales-order", label: "Sales Order", icon: ReceiptText },
  { href: "/admin/logistics-capital", label: "Logistics-Capital", icon: Truck },
  { href: "/admin/api", label: "API", icon: Code },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto py-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        // 子路由也算选中（如 /admin/import-price?batch=xxx）
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors border-l-4 ${
              isActive
                ? "bg-amber-400/25 border-amber-500 text-amber-800 font-bold"
                : "border-transparent text-slate-700 hover:bg-slate-200/60 hover:text-slate-900"
            }`}
          >
            <Icon
              className={`w-3.5 h-3.5 shrink-0 ${
                isActive ? "text-amber-700" : "text-slate-500"
              }`}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
