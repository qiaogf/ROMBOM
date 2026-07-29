"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "@/app/actions/orderActions";
import { formatUSD, formatUSDWithoutSymbol, decimalToNumber } from "@/lib/price";
import { CreditCard, Truck, Shield, Package, Scale, ArrowRight } from "lucide-react";
import type { CartWithItems } from "@/app/actions/cartActions";

interface CheckoutContentProps {
  cart: NonNullable<CartWithItems>;
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

export function CheckoutContent({ cart }: CheckoutContentProps) {
  const [formData, setFormData] = useState({
    shippingCountry: "US",
    shippingCity: "",
    shippingAddress: "",
    shippingZip: "",
    shippingName: "",
    shippingPhone: "",
    paymentMethod: "credit_card",
    notes: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const lastSubmitRef = useRef(0);

  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.items.reduce((sum, item) => sum + decimalToNumber(item.unitPrice) * item.quantity, 0);
  const shippingCost = subtotal >= 100 ? 0 : 10;
  const taxAmount = Math.round(subtotal * 0.08 * 100) / 100;
  const totalAmount = Math.round((subtotal + shippingCost + taxAmount) * 100) / 100;

  const totalWeight = cart.items.reduce((sum, item) => {
    const itemWeight = item.product.weight ? decimalToNumber(item.product.weight) : 0;
    return sum + itemWeight * item.quantity;
  }, 0);

  const validateForm = useCallback((): string => {
    if (!formData.shippingCountry || !/^[A-Z]{2}$/.test(formData.shippingCountry.toUpperCase())) {
      return "Please select a valid country";
    }
    if (!formData.shippingCity.trim() || formData.shippingCity.length > MAX_FIELD_LENGTHS.shippingCity) {
      return "Please enter a valid city name (max 100 characters)";
    }
    if (!formData.shippingAddress.trim() || formData.shippingAddress.length > MAX_FIELD_LENGTHS.shippingAddress) {
      return "Please enter a valid address (max 200 characters)";
    }
    if (!formData.shippingZip.trim() || formData.shippingZip.length > MAX_FIELD_LENGTHS.shippingZip) {
      return "Please enter a valid ZIP/Postal code (max 20 characters)";
    }
    if (!formData.shippingName.trim() || formData.shippingName.length > MAX_FIELD_LENGTHS.shippingName) {
      return "Please enter a valid recipient name (max 100 characters)";
    }
    if (formData.shippingPhone && formData.shippingPhone.length > MAX_FIELD_LENGTHS.shippingPhone) {
      return "Phone number is too long (max 30 characters)";
    }
    if (formData.notes && formData.notes.length > MAX_FIELD_LENGTHS.notes) {
      return "Order notes are too long (max 500 characters)";
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
      const result = await createOrder({
        shippingCountry: formData.shippingCountry.toUpperCase(),
        shippingCity: formData.shippingCity.trim(),
        shippingAddress: formData.shippingAddress.trim(),
        shippingZip: formData.shippingZip.trim(),
        shippingName: formData.shippingName.trim(),
        shippingPhone: formData.shippingPhone.trim(),
        paymentMethod: formData.paymentMethod,
        notes: formData.notes.trim(),
      });

      if (result.success && result.order) {
        const order = result.order;
        setSuccess("Order placed successfully! You will be redirected to your order details.");
        setTimeout(() => {
          router.push(`/orders/${order.id}`);
        }, 2500);
      } else if (result.success) {
        setSuccess("Order placed successfully! You will be redirected to your orders.");
        setTimeout(() => {
          router.push("/orders");
        }, 2500);
      } else {
        setError(result.message);
        setIsLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again later.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-7 h-7 text-slate-900" />
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Checkout</h1>
          </div>
          <p className="text-slate-500">Complete your purchase securely</p>
        </div>

        {error && (
          <div className="mb-6 alert-error">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 alert-success">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Shipping Address
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.shippingName}
                    onChange={(e) => setFormData({ ...formData, shippingName: e.target.value })}
                    className="input-field"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.shippingCountry}
                      onChange={(e) => setFormData({ ...formData, shippingCountry: e.target.value })}
                      className="input-field cursor-pointer"
                    >
                      <option value="US">United States (USD)</option>
                      <option value="CA">Canada (CAD)</option>
                      <option value="GB">United Kingdom (GBP)</option>
                      <option value="DE">Germany (EUR)</option>
                      <option value="FR">France (EUR)</option>
                      <option value="JP">Japan (JPY)</option>
                      <option value="CN">China (CNY)</option>
                      <option value="AU">Australia (AUD)</option>
                      <option value="SG">Singapore (SGD)</option>
                      <option value="HK">Hong Kong (HKD)</option>
                      <option value="KR">South Korea (KRW)</option>
                      <option value="TW">Taiwan (TWD)</option>
                      <option value="TH">Thailand (THB)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.shippingCity}
                      onChange={(e) => setFormData({ ...formData, shippingCity: e.target.value })}
                      className="input-field"
                      placeholder="New York"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.shippingAddress}
                    onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                    className="input-field"
                    placeholder="123 Main Street"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      ZIP/Postal Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.shippingZip}
                      onChange={(e) => setFormData({ ...formData, shippingZip: e.target.value })}
                      className="input-field"
                      placeholder="10001"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.shippingPhone}
                      onChange={(e) => setFormData({ ...formData, shippingPhone: e.target.value })}
                      className="input-field"
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Order Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="input-field resize-none"
                    placeholder="Any special instructions for shipping..."
                  />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                Payment Method
              </h2>
              <div className="space-y-4">
                <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.paymentMethod === "credit_card" 
                    ? "border-indigo-500 bg-indigo-50" 
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    checked={formData.paymentMethod === "credit_card"}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: "credit_card" })}
                    className="w-5 h-5 text-indigo-600"
                  />
                  <CreditCard className="w-6 h-6 text-slate-400" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Credit Card</p>
                    <p className="text-sm text-slate-500">Visa, Mastercard, American Express</p>
                  </div>
                </label>

                <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.paymentMethod === "paypal" 
                    ? "border-indigo-500 bg-indigo-50" 
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    checked={formData.paymentMethod === "paypal"}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: "paypal" })}
                    className="w-5 h-5 text-indigo-600"
                  />
                  <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">PayPal</p>
                    <p className="text-sm text-slate-500">Secure PayPal checkout</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Order Summary</h3>

              <div className="space-y-4 mb-6">
                {cart.items.map((item) => {
                  const product = item.product;
                  const displayName = product.nameEn || product.name;
                  const itemTotal = Number(item.unitPrice) * item.quantity;
                  return (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-16 h-16 bg-slate-50 rounded-xl overflow-hidden flex-shrink-0">
                        {product.thumbnail ? (
                          <img 
                            src={product.thumbnail} 
                            alt={displayName} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100">
                            <Package className="w-8 h-8 text-slate-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 line-clamp-2">
                          {displayName}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {item.quantity} x {formatUSD(item.unitPrice)}
                        </p>
                      </div>
                      <p className="font-semibold text-slate-900 text-sm flex-shrink-0">
                        {formatUSD(itemTotal)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {totalWeight > 0 && (
                <div className="flex items-center gap-3 mb-6 px-4 py-3 bg-indigo-50 rounded-xl">
                  <Scale className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="text-sm font-medium text-indigo-900">Total Weight</p>
                    <p className="text-xs text-indigo-600">{totalWeight.toFixed(2)} kg</p>
                  </div>
                </div>
              )}

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-sm">Subtotal ({totalItems} items)</span>
                  <span className="font-medium text-slate-900">{formatUSD(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-sm">Shipping</span>
                  <span className="font-medium text-slate-900">
                    {shippingCost === 0 ? "Free" : formatUSD(shippingCost)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-sm">Tax (8%)</span>
                  <span className="font-medium text-slate-900">{formatUSD(taxAmount)}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="font-semibold text-slate-900">Total</span>
                  <div className="text-right">
                    <span className="text-sm text-slate-500">USD</span>
                    <p className="text-xl font-bold text-indigo-600">{formatUSDWithoutSymbol(totalAmount)}</p>
                  </div>
                </div>
              </div>

              {subtotal > 0 && subtotal < 100 && (
                <div className="mt-4 px-4 py-3 bg-amber-50 rounded-xl">
                  <p className="text-sm text-amber-700 font-medium">
                    Add ${(100 - subtotal).toFixed(2)} more for free shipping
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-6 py-4 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 group"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    <span>Place Order</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <Truck className="w-5 h-5" />
                  <span>Free shipping on orders over $100</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <Shield className="w-5 h-5" />
                  <span>Secure checkout</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}