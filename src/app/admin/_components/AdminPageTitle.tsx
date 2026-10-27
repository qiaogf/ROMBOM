"use client";

/**
 * Admin 顶栏居中页面标题 — 根据当前路径映射到导航标签
 */
import { usePathname } from "next/navigation";

const TITLE_MAP: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/brand": "brand",
  "/admin/category": "category",
  "/admin/series": "series",
  "/admin/product": "product",
  "/admin/import-price": "product",
  "/admin/model-price": "price",
  "/admin/purchase-order": "Purchase",
  "/admin/sales-order": "Sales",
  "/admin/logistics-capital": "LogiFin",
  "/admin/customer": "customer",
  "/admin/supplier": "supplier",
  "/admin/admin-user": "admin",
  "/admin/api": "API Accounts",
};

export function AdminPageTitle() {
  const pathname = usePathname();
  // 取第一段路由（如 /admin/model-price?batch=xxx → /admin/model-price）
  const key = pathname.split("?")[0];
  const title = TITLE_MAP[key] ?? "";
  if (!title) return null;
  return (
    <span className="text-[13px] font-semibold text-slate-700">{title}</span>
  );
}
