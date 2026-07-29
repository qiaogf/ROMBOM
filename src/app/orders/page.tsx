import Link from "next/link";
import { getOrders } from "@/app/actions/orderActions";
import { getCurrentUserId } from "@/lib/auth";
import { OrdersContent } from "./OrdersContent";
import { Package, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const userId = await getCurrentUserId();
  const orders = userId ? await getOrders() : [];

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <Package className="w-12 h-12 text-slate-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">My Orders</h1>
          <p className="text-slate-500 text-lg mb-10">Please sign in to view your order history.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/account/login"
              className="inline-flex items-center px-8 py-4 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-all duration-200 group"
            >
              <span>Sign In</span>
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/account/register"
              className="inline-flex items-center px-8 py-4 border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <OrdersContent orders={orders} />;
}