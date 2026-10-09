import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  User,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  pending_review: "bg-amber-100 text-amber-700",
  negotiating: "bg-blue-100 text-blue-700",
  approved: "bg-indigo-100 text-indigo-700",
  purchasing: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function formatCurrency(value: unknown, currency = "USD"): string {
  let num: number;
  if (value === null || value === undefined) {
    num = 0;
  } else if (typeof value === "number") {
    num = value;
  } else {
    num = Number(value);
  }
  if (!isFinite(num)) return "0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(num);
}

function formatDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function CustomerDashboardPage() {
  const session = await getSession();

  if (!session.isAuthenticated) {
    redirect("/auth/customer-login");
  }

  const customerId = session.userId;

  const [customer, orderStats, recentOrders] = await Promise.all([
    prisma.customer.findUnique({
      where: { customerId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        companyName: true,
        country: true,
        currency: true,
      },
    }),
    prisma.salesOrder.aggregate({
      where: { customerId },
      _count: true,
      _sum: { totalAmount: true },
    }),
    prisma.salesOrder.findMany({
      where: { customerId },
      orderBy: { orderTime: "desc" },
      take: 5,
      select: {
        orderId: true,
        orderNumber: true,
        orderTime: true,
        totalAmount: true,
        orderStatus: true,
        currency: true,
      },
    }),
  ]);

  const totalOrders = orderStats._count;
  const totalSpent = orderStats._sum.totalAmount;
  const currency = customer?.currency ?? "USD";
  const displayName =
    [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") ||
    customer?.email ||
    "Customer";

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <LayoutDashboard className="w-7 h-7 text-green-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Welcome back, {displayName}.
          </p>
        </div>
      </div>

      {/* Customer info */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-slate-900">
            Account Information
          </h2>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Name
            </dt>
            <dd className="mt-1 text-sm text-slate-900">{displayName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Email
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {customer?.email ?? session.user?.email ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Company
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {customer?.companyName || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Country
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {customer?.country || "—"}
            </dd>
          </div>
        </dl>
      </section>

      {/* Order stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-slate-500">
              Total Orders
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{totalOrders}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-slate-500">
              Total Spent
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {formatCurrency(totalSpent, currency)}
          </p>
        </div>
      </section>

      {/* Recent orders */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Orders</h2>
          <Link
            href="/customer/orders"
            className="inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-800"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            No orders yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentOrders.map((order) => (
              <li key={order.orderId}>
                <Link
                  href={`/orders/${order.orderId}`}
                  className="flex items-center justify-between py-3 -mx-2 px-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {order.orderNumber}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(order.orderTime)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span
                      className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        STATUS_STYLES[order.orderStatus] ??
                        "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {formatStatus(order.orderStatus)}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {formatCurrency(order.totalAmount, order.currency)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Quick links */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/products"
          className="group bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:border-green-200 hover:shadow-md transition-all"
        >
          <Package className="w-6 h-6 text-green-600 mb-3" />
          <p className="text-sm font-semibold text-slate-900">
            Browse Products
          </p>
          <p className="text-xs text-slate-500 mt-1">Explore our catalog</p>
        </Link>
        <Link
          href="/cart"
          className="group bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:border-green-200 hover:shadow-md transition-all"
        >
          <ShoppingCart className="w-6 h-6 text-green-600 mb-3" />
          <p className="text-sm font-semibold text-slate-900">View Cart</p>
          <p className="text-xs text-slate-500 mt-1">Review your items</p>
        </Link>
        <Link
          href="/checkout"
          className="group bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:border-green-200 hover:shadow-md transition-all"
        >
          <ArrowRight className="w-6 h-6 text-green-600 mb-3" />
          <p className="text-sm font-semibold text-slate-900">Checkout</p>
          <p className="text-xs text-slate-500 mt-1">Complete your order</p>
        </Link>
      </section>
    </div>
  );
}
