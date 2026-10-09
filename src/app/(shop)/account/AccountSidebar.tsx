"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/authActions";
import { useState } from "react";
import {
  ShoppingBag,
  Package,
  Heart,
  Settings,
  User,
  LogOut,
  ChevronRight,
} from "lucide-react";

export function AccountSidebar() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    window.location.href = "/";
  };

  const navItems = [
    {
      href: "/account",
      label: "Dashboard",
      icon: ShoppingBag,
    },
    {
      href: "/account/orders",
      label: "Orders",
      icon: Package,
    },
    {
      href: "/account/wishlist",
      label: "Wishlist",
      icon: Heart,
    },
    {
      href: "/account/settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <div className="card p-5 sticky top-8">
      <div className="flex flex-col items-center text-center mb-4">
        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-2">
          <User className="w-6 h-6 text-indigo-600" />
        </div>
        <h2 className="font-semibold text-slate-900 text-sm leading-tight">My Account</h2>
        <p className="text-xs text-slate-500 leading-tight">Manage your settings</p>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              <ChevronRight className="w-3.5 h-3.5 ml-auto" />
            </Link>
          );
        })}

        <div className="border-t border-slate-100 mt-3 pt-3">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
