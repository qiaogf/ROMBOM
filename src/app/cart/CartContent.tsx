"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updateCartItem,
  removeFromCart,
  clearCart,
} from "@/app/actions/cartActions";
import { formatUSD, decimalToNumber } from "@/lib/price";
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, ShoppingBag } from "lucide-react";
import type { CartWithItems } from "@/app/actions/cartActions";

interface CartContentProps {
  cart: CartWithItems | null;
}

export function CartContent({ cart }: CartContentProps) {
  const [cartState, setCartState] = useState(cart);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const router = useRouter();

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    setError("");
    setSuccess("");
    setLoadingItemId(itemId);

    try {
      const result = await updateCartItem(itemId, quantity);
      if (result.success) {
        setCartState(result.cart ?? null);
        setSuccess(result.message);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setError("");
    setSuccess("");
    setLoadingItemId(itemId);

    try {
      const result = await removeFromCart(itemId);
      if (result.success) {
        setCartState(result.cart ?? null);
        setSuccess(result.message);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleClearCart = async () => {
    if (!confirm("Are you sure you want to clear your cart?")) return;

    setError("");
    setSuccess("");

    try {
      const result = await clearCart();
      if (result.success) {
        setCartState(result.cart ?? null);
        setSuccess(result.message);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    }
  };

  const handleCheckout = () => {
    router.push("/checkout");
  };

  const totalItems = cartState?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalAmount = cartState?.items.reduce((sum, item) => sum + decimalToNumber(item.unitPrice) * item.quantity, 0) || 0;
  const shipping = totalAmount >= 100 ? 0 : 10;
  const tax = totalAmount * 0.08;
  const finalTotal = totalAmount + shipping + tax;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag className="w-7 h-7 text-slate-900" />
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Shopping Cart</h1>
          </div>
          <p className="text-slate-500">
            {totalItems} item{totalItems !== 1 ? "s" : ""} in your cart
          </p>
        </div>

        {error && (
          <div className="mb-6 alert-error">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 alert-success">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}

        {cartState && cartState.items.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cartState.items.map((item) => {
                const product = item.product;
                const displayName = product.nameEn || product.name;
                const displayImage = product.thumbnail || null;
                const isLoading = loadingItemId === item.id;
                const itemTotal = decimalToNumber(item.unitPrice) * item.quantity;

                return (
                  <div
                    key={item.id}
                    className="card p-4 sm:p-6 flex flex-col sm:flex-row gap-4 transition-all duration-200 hover:shadow-md hover:shadow-slate-200/50"
                  >
                    <Link
                      href={`/products/${product.id}`}
                      className="w-full sm:w-32 sm:h-32 bg-slate-50 rounded-xl overflow-hidden flex-shrink-0 group"
                    >
                      {displayImage ? (
                        <img
                          src={displayImage}
                          alt={displayName}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100">
                          <ShoppingCart className="w-12 h-12 text-slate-300" />
                        </div>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <Link
                          href={`/products/${product.id}`}
                          className="group"
                        >
                          <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                            {displayName}
                          </h3>
                        </Link>
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                          <span>SKU: {product.sku}</span>
                          {product.category && (
                            <span className="px-2 py-0.5 bg-slate-100 rounded-full text-xs">
                              {product.category.nameEn || product.category.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            disabled={isLoading || item.quantity <= 1}
                            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-14 text-center font-semibold text-slate-900 text-lg">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            disabled={isLoading}
                            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-slate-900 text-lg">
                              {formatUSD(itemTotal)}
                            </p>
                            <p className="text-sm text-slate-500">
                              {formatUSD(item.unitPrice)} each
                            </p>
                          </div>

                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={isLoading}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4">
                <button
                  onClick={handleClearCart}
                  className="btn-secondary text-sm gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear Cart</span>
                </button>
                <Link
                  href="/products"
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1 group"
                >
                  <span>Continue Shopping</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="card p-6 sticky top-24">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Order Summary</h3>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Subtotal ({totalItems} items)</span>
                    <span className="font-medium text-slate-900">{formatUSD(totalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Shipping</span>
                    <span className="font-medium text-slate-900">
                      {totalAmount >= 100 ? "Free" : formatUSD(10)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Tax (8%)</span>
                    <span className="font-medium text-slate-900">{formatUSD(tax)}</span>
                  </div>
                  <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                    <span className="font-semibold text-slate-900">Total</span>
                    <span className="text-xl font-bold text-indigo-600">{formatUSD(finalTotal)}</span>
                  </div>
                </div>

                {totalAmount >= 100 && (
                  <div className="mb-6 px-4 py-3 bg-green-50 rounded-xl">
                    <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Free shipping on orders over $100
                    </p>
                  </div>
                )}

                {totalAmount > 0 && totalAmount < 100 && (
                  <div className="mb-6 px-4 py-3 bg-amber-50 rounded-xl">
                    <p className="text-sm text-amber-700 font-medium">
                      Add ${(100 - totalAmount).toFixed(2)} more for free shipping
                    </p>
                  </div>
                )}

                <button
                  onClick={handleCheckout}
                  className="btn-primary w-full py-4 flex items-center justify-center gap-2 group"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <p className="mt-4 text-center text-sm text-slate-400">
                  Secure checkout powered by Stripe
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-12 sm:p-16 text-center">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8">
              <ShoppingCart className="w-12 h-12 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Your cart is empty</h2>
            <p className="text-slate-500 text-lg mb-8">
              Start shopping and add items to your cart.
            </p>
            <Link
              href="/products"
              className="btn-primary-lg group"
            >
              <ShoppingBag className="w-5 h-5 mr-2" />
              <span>Browse Products</span>
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}