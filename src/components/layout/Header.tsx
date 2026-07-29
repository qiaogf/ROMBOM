"use client";

import Link from "next/link";
import { ShoppingCart, Menu, X, User, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { getCurrentUserId, logout } from "@/app/actions/authActions";
import { getCartItemCount } from "@/app/actions/cartActions";
import { usePathname, useRouter } from "next/navigation";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const id = await getCurrentUserId();
      const count = await getCartItemCount();
      setUserId(id);
      setCartCount(count);
    };
    fetchData();
  }, [pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setUserId(null);
    setCartCount(0);
    router.push("/");
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/products", label: "Products" },
    { href: "/categories", label: "Categories" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">GlobalShop</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 sm:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            {userId ? (
              <div className="hidden sm:flex items-center gap-4">
                <Link
                  href="/account"
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span className="text-sm font-medium">Account</span>
                </Link>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-3">
                <Link
                  href="/account/login"
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span className="text-sm font-medium">Login</span>
                </Link>
                <Link
                  href="/account/register"
                  className="btn-primary px-4 py-2 text-sm"
                >
                  Register
                </Link>
              </div>
            )}
            
            <Link
              href="/cart"
              className="relative flex items-center text-slate-600 hover:text-slate-900 transition-colors"
              aria-label="Shopping cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-2 w-5 h-5 bg-indigo-600 text-white text-xs font-medium rounded-full flex items-center justify-center">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
            
            <button
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-slate-100">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-3 text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-slate-100 my-2"></div>
              {userId ? (
                <>
                  <Link
                    href="/account"
                    className="px-4 py-3 text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 flex items-center gap-3"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="w-5 h-5" />
                    <span>Account</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="px-4 py-3 text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 flex items-center gap-3 w-full"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <Link
                    href="/account/login"
                    className="px-4 py-3 text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 flex items-center gap-3"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="w-5 h-5" />
                    <span>Login</span>
                  </Link>
                  <Link
                    href="/account/register"
                    className="btn-primary px-4 py-3 w-full"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>Create Account</span>
                  </Link>
                </div>
              )}
              <Link
                href="/cart"
                className="px-4 py-3 text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 flex items-center gap-3"
                onClick={() => setMobileMenuOpen(false)}
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Cart</span>
                {cartCount > 0 && (
                  <span className="ml-auto w-5 h-5 bg-indigo-600 text-white text-xs font-medium rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}