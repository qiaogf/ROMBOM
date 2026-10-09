"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateOrderShippingAndPay, deleteOrder } from "@/app/actions/orderActions";
import { formatUSD } from "@/lib/price";
import { CreditCard, Truck, Shield, Package, ArrowRight, Trash2 } from "lucide-react";
import type { OrderWithItems } from "@/app/actions/orderActions";

interface CheckoutContentProps {
  order: NonNullable<OrderWithItems>;
  /** 从 session 预填收货联系人姓名 */
  defaultName?: string;
}

const MAX_FIELD_LENGTHS = {
  shippingCity: 100,
  shippingAddress: 200,
  shippingZip: 20,
  shippingName: 100,
  shippingPhone: 30,
  notes: 500,
};

const DEBOUNCE_DELAY = 1000;

export function CheckoutContent({ order, defaultName }: CheckoutContentProps) {
  const [formData, setFormData] = useState({
    shippingCountry: order.shippingCountry || "US",
    shippingCity: order.shippingCity || "",
    shippingAddress: order.shippingAddress || "",
    shippingZip: order.shippingZip || "",
    shippingName: order.shippingName || defaultName || "",
    shippingPhone: order.shippingPhone || "",
    paymentMethod: order.paymentMethod || "credit_card",
    notes: order.customerNote || "",
    shippingCost: String(order.shippingCost ?? 0),
    taxAmount: String(order.taxAmount ?? 0),
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const lastSubmitRef = useRef(0);

  // 从订单明细计算小计与总数
  const subtotal = Number(order.subtotal);
  const totalItems = order.items.reduce((s, it) => s + it.quantity, 0);
  const shippingCost = Number(formData.shippingCost) || 0;
  const taxAmount = Number(formData.taxAmount) || 0;
  const totalAmount = Math.round((subtotal + shippingCost + taxAmount) * 100) / 100;

  const validateForm = useCallback((): string => {
    if (!formData.shippingCountry || !/^[A-Z]{2}$/.test(formData.shippingCountry.toUpperCase())) {
      return "Please select a valid country";
    }
    if (!formData.shippingCity.trim() || formData.shippingCity.length > MAX_FIELD_LENGTHS.shippingCity) {
      return "Please enter a valid city name";
    }
    if (!formData.shippingAddress.trim() || formData.shippingAddress.length > MAX_FIELD_LENGTHS.shippingAddress) {
      return "Please enter a valid address";
    }
    if (!formData.shippingZip.trim() || formData.shippingZip.length > MAX_FIELD_LENGTHS.shippingZip) {
      return "Please enter a valid ZIP/Postal code";
    }
    if (!formData.shippingName.trim() || formData.shippingName.length > MAX_FIELD_LENGTHS.shippingName) {
      return "Please enter a valid recipient name";
    }
    if (formData.shippingPhone && formData.shippingPhone.length > MAX_FIELD_LENGTHS.shippingPhone) {
      return "Phone number is too long";
    }
    if (formData.notes && formData.notes.length > MAX_FIELD_LENGTHS.notes) {
      return "Order notes are too long";
    }
    return "";
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;

    const now = Date.now();
    if (now - lastSubmitRef.current < DEBOUNCE_DELAY) {
      setError("Please wait a moment before submitting again.");
      return;
    }
    lastSubmitRef.current = now;

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const result = await updateOrderShippingAndPay(order.orderId, {
        shippingCountry: formData.shippingCountry.toUpperCase(),
        shippingCity: formData.shippingCity.trim(),
        shippingAddress: formData.shippingAddress.trim(),
        shippingZip: formData.shippingZip.trim(),
        shippingName: formData.shippingName.trim(),
        shippingPhone: formData.shippingPhone.trim(),
        paymentMethod: formData.paymentMethod,
        notes: formData.notes.trim(),
        shippingCost: formData.shippingCost,
        taxAmount: formData.taxAmount,
      });

      if (result.success) {
        setSuccess("Payment successful! Redirecting...");
        setTimeout(() => router.push("/orders"), 1200);
      } else {
        setError(result.message);
        setIsLoading(false);
      }
    } catch {
      setError("An unexpected error occurred. Please try again later.");
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (isLoading) return;
    if (!window.confirm("Delete this order?")) return;
    setIsLoading(true);
    setError("");
    try {
      await deleteOrder(order.orderId);
      router.push("/cart");
    } catch {
      setError("Failed to delete. Please try again.");
      setIsLoading(false);
    }
  };

  const inputClass =
    "w-full border border-slate-300 rounded px-1.5 py-1 text-[11px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#336633] focus:ring-1 focus:ring-[#336633]";
  const labelClass = "block text-[11px] font-semibold text-slate-700 mb-0";
  const cardClass = "border border-slate-200 rounded bg-white p-3";

  return (
    <div className="flex-1 min-h-0 overflow-y-scroll main-scrollbar">
      <div className="h-0.5 bg-amber-400 shrink-0"></div>
      <div className="px-2 sm:px-3 pt-1.5 pb-4">
        {/* 标题 */}
        <div className="mb-2 flex items-center gap-2">
          <Package className="w-5 h-5 text-[#336633]" />
          <h1 className="text-base font-bold text-slate-900">Order &amp; Payment</h1>
        </div>

        {error && (
          <div className="mb-2 px-3 py-1.5 rounded border border-rose-200 bg-rose-50 text-[11px] text-rose-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-2 px-3 py-1.5 rounded border border-emerald-200 bg-emerald-50 text-[11px] text-emerald-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3">
          {/* ===== 左侧：Shipping & Taxes + Payment ===== */}
          <div className="lg:col-span-1 space-y-2">
            {/* Shipping & Taxes */}
            <div className={cardClass}>
              <h2 className="text-[12px] font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#336633]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Shipping &amp; Taxes
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Full Name <span className="text-rose-500">*</span></label>
                  <input type="text" value={formData.shippingName} onChange={(e) => setFormData({ ...formData, shippingName: e.target.value })} className={inputClass} placeholder="John Doe" required />
                </div>
                <div>
                  <label className={labelClass}>Country <span className="text-rose-500">*</span></label>
                  <select value={formData.shippingCountry} onChange={(e) => setFormData({ ...formData, shippingCountry: e.target.value })} className={`${inputClass} cursor-pointer`}>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="JP">Japan</option>
                    <option value="CN">China</option>
                    <option value="AU">Australia</option>
                    <option value="SG">Singapore</option>
                    <option value="HK">Hong Kong</option>
                    <option value="KR">South Korea</option>
                    <option value="TW">Taiwan</option>
                    <option value="TH">Thailand</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>City <span className="text-rose-500">*</span></label>
                  <input type="text" value={formData.shippingCity} onChange={(e) => setFormData({ ...formData, shippingCity: e.target.value })} className={inputClass} placeholder="New York" required />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Address <span className="text-rose-500">*</span></label>
                  <input type="text" value={formData.shippingAddress} onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })} className={inputClass} placeholder="123 Main Street" required />
                </div>
                <div>
                  <label className={labelClass}>ZIP <span className="text-rose-500">*</span></label>
                  <input type="text" value={formData.shippingZip} onChange={(e) => setFormData({ ...formData, shippingZip: e.target.value })} className={inputClass} placeholder="10001" required />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input type="tel" value={formData.shippingPhone} onChange={(e) => setFormData({ ...formData, shippingPhone: e.target.value })} className={inputClass} placeholder="+1 234 567 8900" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Notes (Optional)</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={1} className={`${inputClass} resize-none`} placeholder="Special instructions..." />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className={cardClass}>
              <h2 className="text-[12px] font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#336633]" />
                Payment Method
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <label className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all ${
                  formData.paymentMethod === "credit_card" ? "border-[#336633] bg-green-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}>
                  <input type="radio" name="payment" checked={formData.paymentMethod === "credit_card"} onChange={() => setFormData({ ...formData, paymentMethod: "credit_card" })} className="w-3.5 h-3.5 accent-[#336633]" />
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <span className="text-[12px] font-medium text-slate-900">Credit Card</span>
                </label>
                <label className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all ${
                  formData.paymentMethod === "paypal" ? "border-[#336633] bg-green-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}>
                  <input type="radio" name="payment" checked={formData.paymentMethod === "paypal"} onChange={() => setFormData({ ...formData, paymentMethod: "paypal" })} className="w-3.5 h-3.5 accent-[#336633]" />
                  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                  <span className="text-[12px] font-medium text-slate-900">PayPal</span>
                </label>
              </div>
            </div>

            {/* Shipping Cost & Tax */}
            <div className={cardClass}>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                <div>
                  <label className={labelClass}>Shipping Cost ($)</label>
                  <input type="number" min="0" step="0.01" value={formData.shippingCost} onChange={(e) => setFormData({ ...formData, shippingCost: e.target.value })} className={inputClass} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelClass}>Tax ($)</label>
                  <input type="number" min="0" step="0.01" value={formData.taxAmount} onChange={(e) => setFormData({ ...formData, taxAmount: e.target.value })} className={inputClass} placeholder="0.00" />
                </div>
              </div>
            </div>
          </div>

          {/* ===== 右侧：Order Summary ===== */}
          <div className="lg:col-span-1">
            <div className={`${cardClass} lg:sticky lg:top-1`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900">Order Summary</h3>
                <span className="text-[13px] font-bold text-slate-800">
                  Sales Order<span className="text-slate-400 mx-1">：</span>
                  <span className="text-[#336633] tracking-wide">{order.orderNumber}</span>
                </span>
              </div>

              <div className="mb-2 max-h-56 overflow-y-auto pr-1">
                <table className="w-full table-fixed text-[12px]">
                  <colgroup>
                    <col className="w-[26%]" />
                    <col className="w-[24%]" />
                    <col className="w-[10%]" />
                    <col className="w-[18%]" />
                    <col className="w-[22%]" />
                  </colgroup>
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
                    <tr>
                      <th className="px-1.5 py-1 text-left">Product Name</th>
                      <th className="px-1.5 py-1 text-left">Model</th>
                      <th className="px-1.5 py-1 text-center">Qty</th>
                      <th className="px-1.5 py-1 text-right">Unit Price</th>
                      <th className="px-1.5 py-1 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items.map((item) => {
                      const unitPrice = Number(item.unitPrice);
                      const itemTotal = Number(item.subtotal);
                      return (
                        <tr key={item.itemId} className="hover:bg-slate-50">
                          <td className="px-1.5 py-1 text-slate-700 truncate" title={item.productName}>{item.productName}</td>
                          <td className="px-1.5 py-1 font-medium text-slate-900 truncate" title={item.model ?? ""}>{item.model || "—"}</td>
                          <td className="px-1.5 py-1 text-center text-slate-700">{item.quantity}</td>
                          <td className="px-1.5 py-1 text-right text-slate-700">{formatUSD(unitPrice)}</td>
                          <td className="px-1.5 py-1 text-right font-semibold text-slate-900">{formatUSD(itemTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-100 pt-2 space-y-1 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Subtotal ({totalItems})</span>
                  <span className="font-medium text-slate-900">{formatUSD(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Shipping</span>
                  <span className="font-medium text-slate-900">{shippingCost === 0 ? "Free" : formatUSD(shippingCost)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Tax</span>
                  <span className="font-medium text-slate-900">{formatUSD(taxAmount)}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="font-bold text-slate-900 text-[13px]">Total</span>
                  <span className="text-base font-bold text-[#336633]">{formatUSD(totalAmount)}</span>
                </div>
              </div>

              <div className="mt-2 flex gap-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 bg-[#336633] text-white text-[13px] font-bold rounded hover:bg-[#2d5a2d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <>Pay Now <ArrowRight className="w-3.5 h-3.5" /></>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 text-[13px] font-bold rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>

              <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Free over $100</span>
                <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Secure</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
