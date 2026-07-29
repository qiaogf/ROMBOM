"use client";

import Link from "next/link";
import { Package, Heart, ArrowRight } from "lucide-react";
import { AccountSidebar } from "./AccountSidebar";
import type { OrderWithItems } from "@/app/actions/orderActions";

interface AccountContentProps {
  orders: (OrderWithItems | null)[];
}

export function AccountContent({ orders }: AccountContentProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-amber-50 text-amber-700";
      case "PROCESSING":
        return "bg-blue-50 text-blue-700";
      case "SHIPPED":
        return "bg-indigo-50 text-indigo-700";
      case "DELIVERED":
        return "bg-green-50 text-green-700";
      case "CANCELLED":
        return "bg-red-50 text-red-700";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <AccountSidebar />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Orders</h3>

              {orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.slice(0, 3).filter((order): order is NonNullable<typeof order> => order !== null).map((order) => (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      className="block border border-slate-100 rounded-xl p-4 hover:border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-mono text-slate-500">
                          {order.orderNumber}
                        </span>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                          {order.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                          {order.items.length} item{order.items.length > 1 ? "s" : ""} - {formatDate(order.createdAt)}
                        </span>
                        <span className="font-semibold text-slate-900">
                          ${Number(order.totalAmount).toFixed(2)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="card p-12 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8 text-slate-400" />
                  </div>
                  <h4 className="font-medium text-slate-900 mb-2">No orders yet</h4>
                  <p className="text-sm text-slate-500 mb-4">
                    Your orders will appear here once you make a purchase.
                  </p>
                  <Link
                    href="/products"
                    className="btn-primary"
                  >
                    Start Shopping
                  </Link>
                </div>
              )}

              {orders.length > 3 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <Link
                    href="/account/orders"
                    className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    View all orders
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="card p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Orders</p>
                    <p className="text-xl font-bold text-slate-900">{orders.length}</p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Heart className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Wishlist</p>
                    <p className="text-xl font-bold text-slate-900">0</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
