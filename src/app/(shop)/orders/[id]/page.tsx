import Link from "next/link";
import { getOrderById } from "@/app/actions/orderActions";
import { getCurrentUserId } from "@/lib/auth";
import { formatUSD, formatUSDWithoutSymbol, decimalToNumber } from "@/lib/price";
import { 
  Package, 
  ChevronLeft, 
  MapPin, 
  CreditCard, 
  Truck, 
  FileText, 
  CheckCircle,
  Scale,
  Globe,
  Calendar,
  ArrowRight
} from "lucide-react";

export const dynamic = "force-dynamic";

const isValidCuid = (id: string): boolean => {
  return /^[a-z0-9]{25}$/i.test(id);
};

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const resolvedParams = await params;
  const userId = await getCurrentUserId();
  
  if (!isValidCuid(resolvedParams.id)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <Package className="w-12 h-12 text-slate-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Invalid Order ID</h1>
          <p className="text-slate-500 text-lg mb-10">The order ID format is invalid.</p>
          <Link
            href="/orders"
            className="btn-primary-lg group"
          >
            <span>View Orders</span>
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    );
  }

  const order = userId ? await getOrderById(resolvedParams.id) : null;

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <Package className="w-12 h-12 text-slate-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Order Details</h1>
          <p className="text-slate-500 text-lg mb-10">Please sign in to view your order details.</p>
          <Link
            href="/account/login"
            className="btn-primary-lg group"
          >
            <span>Sign In</span>
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <Package className="w-12 h-12 text-slate-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Order Not Found</h1>
          <p className="text-slate-500 text-lg mb-10">The order you are looking for does not exist or you do not have permission to view it.</p>
          <Link
            href="/orders"
            className="btn-primary-lg group"
          >
            <span>View Orders</span>
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    );
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending_review":
        return { label: "Pending Review", color: "bg-amber-50 text-amber-700", icon: CreditCard };
      case "negotiating":
        return { label: "Negotiating", color: "bg-blue-50 text-blue-700", icon: FileText };
      case "approved":
        return { label: "Approved", color: "bg-indigo-50 text-indigo-700", icon: CheckCircle };
      case "purchasing":
        return { label: "Purchasing", color: "bg-purple-50 text-purple-700", icon: Truck };
      case "completed":
        return { label: "Completed", color: "bg-green-50 text-green-700", icon: Package };
      case "cancelled":
        return { label: "Cancelled", color: "bg-red-50 text-red-700", icon: Package };
      default:
        return { label: status, color: "bg-slate-50 text-slate-700", icon: Package };
    }
  };

  const getPaymentStatus = (status: string) => {
    switch (status) {
      case "pending":
        return { label: "Pending", color: "text-amber-600" };
      case "paid":
        return { label: "Paid", color: "text-green-600" };
      case "failed":
        return { label: "Failed", color: "text-red-600" };
      case "refunded":
        return { label: "Refunded", color: "text-blue-600" };
      default:
        return { label: status, color: "text-slate-600" };
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCountryName = (countryCode: string | null) => {
    if (!countryCode) return "-";
    const countries: Record<string, string> = {
      US: "United States",
      CA: "Canada",
      GB: "United Kingdom",
      DE: "Germany",
      FR: "France",
      JP: "Japan",
      CN: "China",
      AU: "Australia",
      SG: "Singapore",
      HK: "Hong Kong",
      KR: "South Korea",
      TW: "Taiwan",
      TH: "Thailand",
    };
    return countries[countryCode] || countryCode;
  };

  const totalWeight = order.items.reduce((sum, item) => {
    const itemWeight = item.weight ? Number(item.weight) : 0;
    return sum + itemWeight * item.quantity;
  }, 0);

  const statusInfo = getStatusInfo(order.orderStatus);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/orders"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">Back to Orders</span>
          </Link>
        </div>

        <div className="card overflow-hidden">
          <div className="px-6 py-6 bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-slate-300 text-sm mb-1">Order Number</p>
                <p className="text-white font-bold text-xl sm:text-2xl">{order.orderNumber}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-4 py-2 rounded-xl text-sm font-medium ${statusInfo.color}`}>
                  <StatusIcon className="w-4 h-4 inline-block mr-2" />
                  {statusInfo.label}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-slate-400 text-sm">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Placed on {formatDate(order.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <Globe className="w-4 h-4" />
                {getCountryName(order.shippingCountry)}
              </span>
              <span className="flex items-center gap-1">
                {order.currency} {formatUSDWithoutSymbol(order.totalAmount)}
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                    Shipping Address
                  </h3>
                  <div className="bg-slate-50 rounded-xl p-5">
                    <p className="font-semibold text-slate-900 mb-2">{order.shippingName}</p>
                    {order.shippingPhone && (
                      <p className="text-sm text-slate-600 mb-2">{order.shippingPhone}</p>
                    )}
                    <p className="text-sm text-slate-600">{order.shippingAddress}</p>
                    <p className="text-sm text-slate-600">
                      {order.shippingCity}, {getCountryName(order.shippingCountry)} {order.shippingZip}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-indigo-600" />
                    Order Items
                  </h3>
                  <div className="space-y-4">
                    {order.items.map((item) => (
                      <div
                        key={item.itemId}
                        className="flex gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                      >
                        <div className="w-20 h-20 bg-slate-50 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center">
                          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                            <Package className="w-6 h-6 text-slate-300" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-900 line-clamp-2">
                            {item.productName}
                          </h4>
                          {item.model && <p className="text-sm text-slate-500 mt-1">Model: {item.model}</p>}
                          <div className="flex items-center gap-4 mt-3">
                            <span className="text-sm text-slate-600">Qty: {item.quantity}</span>
                            <span className="font-semibold text-slate-900">
                              {formatUSD(item.unitPrice)}
                            </span>
                          </div>
                          {item.weight && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                              <Scale className="w-3 h-3" />
                              <span>Weight: {Number(item.weight)} {item.weightUnit || "kg"}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-slate-900">
                            {formatUSD(decimalToNumber(item.unitPrice) * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {totalWeight > 0 && (
                  <div className="bg-indigo-50 rounded-xl p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <Scale className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-indigo-900">Total Weight</p>
                        <p className="text-xl font-bold text-indigo-600">{totalWeight.toFixed(2)} kg</p>
                      </div>
                    </div>
                  </div>
                )}

                {order.customerNote && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Order Notes</h3>
                    <div className="bg-amber-50 rounded-xl p-5">
                      <p className="text-sm text-amber-700">{order.customerNote}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-1">
                <div className="card p-6 sticky top-24">
                  <h3 className="text-lg font-semibold text-slate-900 mb-5">Order Summary</h3>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Subtotal ({order.items.length} items)</span>
                      <span className="text-slate-900">{formatUSD(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Shipping</span>
                      <span className="text-slate-900">
                        {decimalToNumber(order.shippingCost) === 0 ? "Free" : formatUSD(order.shippingCost)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Tax ({getCountryName(order.shippingCountry)})</span>
                      <span className="text-slate-900">{formatUSD(order.taxAmount)}</span>
                    </div>
                    {decimalToNumber(order.discountAmount) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Discount</span>
                        <span className="text-green-600">-{formatUSD(order.discountAmount)}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-100 pt-3 flex justify-between">
                      <span className="font-semibold text-slate-900">Total</span>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 uppercase tracking-wider">{order.currency}</span>
                        <p className="text-xl font-bold text-indigo-600">{formatUSDWithoutSymbol(order.totalAmount)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Payment</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">
                        {order.paymentMethod || "Not specified"}
                      </span>
                      <span className={`text-sm font-medium ${getPaymentStatus(order.paymentStatus).color}`}>
                        {getPaymentStatus(order.paymentStatus).label}
                      </span>
                    </div>
                  </div>

                  {order.shippedAt && (
                    <div className="border-t border-slate-100 pt-4 mt-4">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Shipped</h4>
                      <p className="text-sm text-slate-600">{formatDate(order.shippedAt)}</p>
                      {order.trackingNumber && (
                        <p className="text-sm text-slate-600 mt-1">
                          Tracking: {order.trackingNumber}
                        </p>
                      )}
                    </div>
                  )}

                  {order.deliveredAt && (
                    <div className="border-t border-slate-100 pt-4 mt-4">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Delivered</h4>
                      <p className="text-sm text-slate-600">{formatDate(order.deliveredAt)}</p>
                    </div>
                  )}

                  <div className="mt-6">
                    <Link
                      href="/products"
                      className="btn-primary group"
                    >
                      <span>Continue Shopping</span>
                      <ArrowRight className="w-5 h-5 inline-block ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
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