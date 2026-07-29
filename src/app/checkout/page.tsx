import Link from "next/link";
import { getCurrentCart } from "@/app/actions/cartActions";
import { getCurrentUserId } from "@/lib/auth";
import { CheckoutContent } from "./CheckoutContent";
import { ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const userId = await getCurrentUserId();
  const cart = userId ? await getCurrentCart() : null;

  if (!userId) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Checkout</h1>
          <p className="text-slate-500 mb-8">Please login to proceed with checkout.</p>
          <Link
            href="/account/login"
            className="btn-primary"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Your cart is empty</h1>
          <p className="text-slate-500 mb-8">Please add items to your cart before checkout.</p>
          <Link
            href="/products"
            className="btn-primary"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return <CheckoutContent cart={cart} />;
}