"use client";

import Link from "next/link";
import { Package, ChevronRight } from "lucide-react";
import type { OrderWithItems } from "@/app/actions/orderActions";

interface OrdersContentProps {
  orders: (OrderWithItems | null)[];
}

export function OrdersContent({ orders }: OrdersContentProps) {
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">My Orders</h1>
          <p className="text-slate-500">View your order history and tracking information</p>
        </div>

        {orders.length > 0 ? (
          <div className="space-y-6">
            {orders.filter((order): order is NonNullable<typeof order> => order !== null).map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-xl ring-1 ring-slate-100 overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <span className="text-sm font-mono text-slate-500">
                        Order: {order.orderNumber}
                      </span>
                      <span className="ml-4 text-sm text-slate-500">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                      {order.status.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                    <div className="sm:col-span-2">
                      <h4 className="text-sm font-medium text-slate-500 mb-2">Shipping Address</h4>
                      <p className="text-slate-900 font-medium">{order.shippingName}</p>
                      <p className="text-sm text-slate-600">{order.shippingAddress}</p>
                      <p className="text-sm text-slate-600">
                        {order.shippingCity}, {order.shippingCountry} {order.shippingZip}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-2">Order Summary</h4>
                      <p className="text-slate-900 font-medium">
                        {order.items.length} item{order.items.length > 1 ? "s" : ""}
                      </p>
                      <p className="text-sm text-slate-600">
                        Subtotal: ${Number(order.subtotal).toFixed(2)}
                      </p>
                      <p className="text-sm text-slate-600">
                        Shipping: ${Number(order.shippingCost).toFixed(2)}
                      </p>
                      <p className="text-sm text-slate-600">
                        Tax: ${Number(order.taxAmount).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex flex-col justify-end">
                      <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-sm text-slate-500 mb-1">Total</p>
                        <p className="text-xl font-bold text-slate-900">
                          ${Number(order.totalAmount).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-4">
                      <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        View Details
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                      {order.status === "PENDING" && (
                        <button className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                          Cancel Order
                        </button>
                      )}
                      {order.status === "SHIPPED" && (
                        <button className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                          Track Package
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl ring-1 ring-slate-100 p-12 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">No orders yet</h2>
            <p className="text-slate-500 mb-6">
              Your orders will appear here once you make a purchase.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}