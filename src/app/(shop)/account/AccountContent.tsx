import Link from "next/link";
import { Package, Heart, Settings, ChevronRight, Mail, Globe, User, Phone } from "lucide-react";
import type { OrderWithItems } from "@/app/actions/orderActions";

interface CustomerInfo {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  currency: string | null;
}

interface AccountContentProps {
  orders: (OrderWithItems | null)[];
  customer: CustomerInfo | null;
}

const COUNTRIES: Record<string, string> = {
  US: "United States", CA: "Canada", GB: "United Kingdom", DE: "Germany",
  FR: "France", JP: "Japan", CN: "China", AU: "Australia", SG: "Singapore",
  HK: "Hong Kong", KR: "South Korea", TW: "Taiwan", TH: "Thailand",
};

export function AccountContent({ orders, customer }: AccountContentProps) {
  const recentOrders = orders
    .filter((o): o is NonNullable<typeof o> => o !== null)
    .slice(0, 5);

  const fullName = [customer?.firstName, customer?.lastName].filter(Boolean).join(" ").trim() || "—";
  const countryName = customer?.country ? COUNTRIES[customer.country] || customer.country : "—";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Settings */}
          <div className="card p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-600" />
                Settings
              </h3>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              {/* Personal Information */}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Personal</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400">Name</p>
                      <p className="text-xs font-medium text-slate-700 truncate">{fullName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400">Email</p>
                      <p className="text-xs font-medium text-slate-700 truncate">{customer?.email || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400">Phone</p>
                      <p className="text-xs font-medium text-slate-700 truncate">{customer?.phone || "—"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Regional Settings */}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Regional</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400">Country</p>
                      <p className="text-xs font-medium text-slate-700 truncate">{countryName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 text-slate-400 shrink-0 text-center text-[10px] leading-[14px]">$</span>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400">Currency</p>
                      <p className="text-xs font-medium text-slate-700">{customer?.currency || "—"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Wishlist */}
          <div className="card p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Heart className="w-4 h-4 text-green-600" />
                Wishlist
              </h3>
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-3">0</p>
            <p className="text-xs text-slate-400 mb-4">No items saved yet</p>
            <div className="flex-1 flex items-center justify-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                <Heart className="w-8 h-8 text-green-300" />
              </div>
            </div>
          </div>

          {/* Orders */}
          <div className="card p-4 flex flex-col max-h-[calc(100vh-8rem)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600" />
                Orders
              </h3>
              <span className="text-2xl font-bold text-slate-900">{orders.length}</span>
            </div>
            {recentOrders.length > 0 ? (
              <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                {recentOrders.map((order) => (
                  <div key={order.orderId} className="border border-slate-100 rounded-md p-3">
                    {/* Order header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-800">{order.orderNumber}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                        {order.orderStatus.replace(/_/g, " ")}
                      </span>
                    </div>

                    {/* Order Items */}
                    <div className="mb-2">
                      <div className="space-y-0.5">
                        {order.items.map((item) => (
                          <div key={item.itemId} className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-600 truncate pr-1">
                              {item.model || item.productName} ×{item.quantity}
                            </span>
                            <span className="text-slate-700 tabular-nums shrink-0">
                              ${Number(item.subtotal).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="border-t border-slate-100 pt-1.5 space-y-0.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Subtotal</span>
                        <span className="text-slate-600 tabular-nums">${Number(order.subtotal).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Shipping</span>
                        <span className="text-slate-600 tabular-nums">${Number(order.shippingCost).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Tax</span>
                        <span className="text-slate-600 tabular-nums">${Number(order.taxAmount).toFixed(2)}</span>
                      </div>
                      {Number(order.discountAmount) > 0 && (
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Discount</span>
                          <span className="text-green-600 tabular-nums">-${Number(order.discountAmount).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs font-semibold pt-0.5">
                        <span className="text-slate-800">Total</span>
                        <span className="text-slate-900 tabular-nums">${Number(order.totalAmount).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No orders yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
