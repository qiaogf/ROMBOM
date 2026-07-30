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
    <div className="min-h-screen bg-white">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="w-4 h-4 text-slate-600" />
            <h1 className="text-lg font-semibold text-slate-900">Shopping Cart</h1>
          </div>
          <p className="text-xs text-slate-500">
            {totalItems} item{totalItems !== 1 ? "s" : ""} in your cart
          </p>
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 bg-red-50 text-red-700 rounded text-xs font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 px-3 py-2 bg-green-50 text-green-700 rounded text-xs font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}

        {cartState && cartState.items.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-2">
              {cartState.items.map((item) => {
                const product = item.product;
                const displayName = product.nameEn || product.name;
                const displayImage = product.thumbnail || null;
                const isLoading = loadingItemId === item.id;
                const itemTotal = decimalToNumber(item.unitPrice) * item.quantity;

                return (
                  <div
                    key={item.id}
                    className="border border-slate-200 rounded-md p-3 flex items-center gap-3"
                  >
                    <Link
                      href={`/products/${product.id}`}
                      className="w-14 h-14 bg-slate-50 rounded overflow-hidden flex-shrink-0 border border-slate-100"
                    >
                      {displayImage ? (
                        <img
                          src={displayImage}
                          alt={displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingCart className="w-5 h-5 text-slate-300" />
                        </div>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link href={`/products/${product.id}`}>
                        <h3 className="text-sm font-medium text-slate-900 truncate hover:text-slate-700">
                          {displayName}
                        </h3>
                      </Link>
                      <div className="text-xs text-slate-400 font-mono">
                        #{product.sku}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {formatUSD(item.unitPrice)} each
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={isLoading || item.quantity <= 1}
                        className="w-6 h-6 border border-slate-300 rounded flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        aria-label="Decrease"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center text-sm font-medium text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        disabled={isLoading}
                        className="w-6 h-6 border border-slate-300 rounded flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        aria-label="Increase"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right flex-shrink-0 w-20">
                      <p className="text-sm font-bold text-slate-900">
                        {formatUSD(itemTotal)}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={isLoading}
                      className="p-1 text-slate-400 hover:text-red-600 flex-shrink-0"
                      aria-label="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleClearCart}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear Cart
                </button>
                <Link
                  href="/products"
                  className="text-xs font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1"
                >
                  Continue Shopping
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="border border-slate-200 rounded-md p-4 sticky top-12">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  Order Summary
                </h3>

                <div className="space-y-2 text-xs mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Subtotal ({totalItems})</span>
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
                  <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                    <span className="font-semibold text-slate-900">Total</span>
                    <span className="text-base font-bold text-slate-900">{formatUSD(finalTotal)}</span>
                  </div>
                </div>

                {totalAmount > 0 && totalAmount < 100 && (
                  <div className="mb-3 px-2 py-1.5 bg-amber-50 rounded text-xs text-amber-700">
                    Add ${(100 - totalAmount).toFixed(2)} more for free shipping
                  </div>
                )}

                <button
                  onClick={handleCheckout}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-colors"
                >
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4" />
                </button>

                <p className="mt-2 text-center text-xs text-slate-400">
                  Secure checkout
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-md p-12 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-md flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-7 h-7 text-slate-400" />
            </div>
            <h2 className="text-base font-semibold text-slate-900 mb-1">
              Your cart is empty
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Start shopping and add items to your cart.
            </p>
            <Link href="/products" className="btn-primary">
              Browse Products
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}