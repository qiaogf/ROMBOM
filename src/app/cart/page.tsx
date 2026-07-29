import Link from "next/link";
import { getCurrentCart } from "@/app/actions/cartActions";
import { getCurrentUserId } from "@/lib/auth";
import { CartContent } from "./CartContent";
import { ShoppingCart, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const userId = await getCurrentUserId();
  const cart = userId ? await getCurrentCart() : null;

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-28 h-28 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <ShoppingCart className="w-14 h-14 text-slate-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Your Shopping Cart</h1>
          <p className="text-slate-500 text-lg mb-10">Please sign in to view and manage your shopping cart.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/account/login"
              className="btn-primary-lg group"
            >
              <span>Sign In</span>
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/account/register"
              className="btn-secondary"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <CartContent cart={cart} />;
}