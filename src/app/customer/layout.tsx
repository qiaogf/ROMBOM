import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { logout } from "@/app/actions/authActions";
import { LayoutDashboard, Package, User, LogOut } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!session.isAuthenticated) {
    redirect("/auth/customer-login");
  }

  const email = session.user?.email ?? "";

  const navItems = [
    { href: "/cart", label: "Cart", icon: LayoutDashboard },
    { href: "/customer/orders", label: "My Orders", icon: Package },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-green-400" />
              <span className="text-base font-semibold">My Account</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-300">{email}</span>
              <form action={logout}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Nav + main content */}
      <div className="flex flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 gap-8">
        <nav className="w-56 shrink-0">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
