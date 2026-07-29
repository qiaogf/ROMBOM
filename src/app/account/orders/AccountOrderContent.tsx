"use client";

import Link from "next/link";
import { formatUSD } from "@/lib/price";
import { AccountSidebar } from "../AccountSidebar";
import { Package, ArrowRight } from "lucide-react";
import type { OrderWithItems } from "@/app/actions/orderActions";

interface AccountOrderContentProps {
  orders: (OrderWithItems | null)[];
}

export function AccountOrderContent({ orders }: AccountOrderContentProps) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "PENDING":
        return { label: "Pending", color: "bg-amber-50 text-amber-700" };
      case "PROCESSING":
        return { label: "Processing", color: "bg-blue-50 text-blue-700" };
      case "SHIPPED":
        return { label: "Shipped", color: "bg-indigo-50 text-indigo-700" };
      case "DELIVERED":
        return { label: "Delivered", color: "bg-green-50 text-green-700" };
      case "CANCELLED":
        return { label: "Cancelled", color: "bg-red-50 text-red-700" };
      default:
        return { label: status, color: "bg-slate-50 text-slate-700" };
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <AccountSidebar />
          </div>

          <div className="lg:col-span-2">
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">My Orders</h1>
              <p className="text-slate-500">View your complete order history</p>
            </div>

            {orders.length > 0 ? (
              <div className="space-y-4">
                {orders.filter((order): order is NonNullable<typeof order> => order !== null).map((order) => {
                  const statusInfo = getStatusInfo(order.status);
                  return (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      className="card overflow-hidden hover:shadow-md hover:shadow-slate-200/50 transition-all duration-300 group"
                    >
                      <div className="px-6 py-4 border-b border-slate-100">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-mono text-slate-500">
                              {order.orderNumber}
                            </span>
                            <span className="text-sm text-slate-400">|</span>
                            <span className="text-sm text-slate-500">
                              {formatDate(order.createdAt)}
                            </span>
                          </div>
                          <span className={`px-4 py-1.5 text-xs font-medium rounded-full ${statusInfo.color} group-hover:opacity-90 transition-opacity`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                          <div className="sm:col-span-2">
                            <h4 className="text-sm font-medium text-slate-500 mb-2">Shipping</h4>
                            <p className="text-slate-900 font-medium">{order.shippingName}</p>
                            <p className="text-sm text-slate-600 truncate max-w-xs">
                              {order.shippingAddress}
                            </p>
                            <p className="text-sm text-slate-600">
                              {order.shippingCity}, {order.shippingCountry} {order.shippingZip}
                            </p>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-slate-500 mb-2">Items</h4>
                            <p className="text-slate-900 font-medium">
                              {order.items.length} item{order.items.length > 1 ? "s" : ""}
                            </p>
                            <p className="text-sm text-slate-500">
                              {order.items.slice(0, 2).map((item, idx) => (
                                <span key={item.id} className="inline-block">
                                  {item.nameEn || item.name}{idx < order.items.length - 2 ? ", " : ""}
                                  {order.items.length > 2 && idx === 0 && ` +${order.items.length - 2}`}
                                </span>
                              ))}
                            </p>
                          </div>

                          <div className="flex flex-col justify-end">
                            <div className="bg-slate-50 rounded-xl p-4 group-hover:bg-indigo-50 transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-slate-500 uppercase tracking-wider">Currency</span>
                                <span className="text-xs font-medium text-slate-700">{order.currency}</span>
                              </div>
                              <p className="text-sm text-slate-500 mb-1">Total</p>
                              <p className="text-xl font-bold text-indigo-600">
                                {formatUSD(order.totalAmount)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-end">
                          <span className="inline-flex items-center gap-1 text-sm text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            View Details
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="card p-12 text-center">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8">
                  <Package className="w-12 h-12 text-slate-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">No orders yet</h2>
                <p className="text-slate-500 mb-8">
                  Your orders will appear here once you make a purchase.
                </p>
                <Link
                  href="/products"
                  className="btn-primary-lg group"
                >
                  <span>Start Shopping</span>
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
