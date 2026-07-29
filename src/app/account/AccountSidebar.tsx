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
    <div className="card p-6 sticky top-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-indigo-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">My Account</h2>
          <p className="text-sm text-slate-500">Manage your settings</p>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Link>
          );
        })}

        <div className="border-t border-slate-100 mt-4 pt-4">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
