"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { addToCart as serverAddToCart } from "@/app/actions/cartActions";
import { useCart } from "@/components/cart/CartProvider";
import { isPurchasableLeadtime, formatLeadtime } from "@/lib/cart-display";
import type { SerializableProductWithCategory } from "@/lib/serialize";

interface ProductDetailContentProps {
  product: SerializableProductWithCategory;
}

const DEBOUNCE_DELAY = 500;

export function ProductDetailContent({ product }: ProductDetailContentProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const lastAddRef = useRef(0);
  const { isLoggedIn, addToCart: providerAdd } = useCart();

  const displayName = product.productName;
  const displayDescription = product.description;
  const displayCategory = product.category?.categoryName || "";
  const price = product.defaultQuote?.sellPrice ?? 0;
  const costPrice = product.defaultQuote?.costPrice ?? 0;
  const discount = costPrice > 0 && price > 0 && costPrice > price
    ? Math.round((1 - price / costPrice) * 100)
    : 0;

  const isOnSale = product.status === "on_sale";
  const leadTime = product.defaultQuote?.leadTime ?? null;
  const leadTimeText = (leadTime ?? "").trim().toLowerCase();
  const isInStock = isPurchasableLeadtime(leadTime);
  const isLeadTimeOnly = leadTimeText !== "" && !leadTimeText.includes("in stock") && !leadTimeText.includes("out of stock");
  const moq = product.defaultQuote?.moq ?? 1;
  const quoteId = product.defaultQuote?.quoteId;

  const allImages = product.images || [];
  const selectedImage = allImages[selectedImageIndex] || product.thumbnail || null;

  const handleAddToCart = async () => {
    if (isLoading) return;

    const now = Date.now();
    if (now - lastAddRef.current < DEBOUNCE_DELAY) {
      return;
    }
    lastAddRef.current = now;

    if (!quoteId) {
      setError("No valid quote available for this product");
      return;
    }

    if (!isOnSale) {
      setError("This product is not currently on sale");
      return;
    }

    if (!isInStock) {
      setError("This product is currently out of stock");
      return;
    }

    if (quantity < moq) {
      setError(`Minimum order quantity is ${moq}`);
      return;
    }

    if (quantity > 999) {
      setError("Invalid quantity");
      return;
    }

    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      // 统一走 CartProvider：登录用户走服务端，游客走本地购物车（价格经服务端只读查价）
      if (!isLoggedIn) {
        const res = await providerAdd(product.productId, quoteId, quantity);
        if (res.ok) {
          setSuccess(`Successfully added ${quantity} item(s) to your cart`);
        } else {
          setError(res.error || "Failed to add to cart");
        }
        return;
      }
      const result = await serverAddToCart(product.productId, quoteId, quantity);
      if (result.success) {
        setSuccess(`Successfully added ${quantity} item(s) to your cart`);
      } else {
        if (result.message.includes("login")) {
          setError("Please login to add items to cart");
        } else {
          setError(result.message);
        }
      }
    } catch {
      setError("An unexpected error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <nav className="flex flex-wrap items-center gap-2 mb-4 sm:mb-6 text-sm">
          <Link href="/" className="text-slate-500 hover:text-slate-900 transition-colors">Home</Link>
          <span className="text-slate-400">/</span>
          <Link href="/products" className="text-slate-500 hover:text-slate-900 transition-colors">Products</Link>
          <span className="text-slate-400">/</span>
          {displayCategory && (
            <>
              <Link href={`/products?category=${product.categoryId}`} className="text-slate-500 hover:text-slate-900 transition-colors">
                {displayCategory}
              </Link>
              <span className="text-slate-400">/</span>
            </>
          )}
          <span className="text-slate-900 font-medium truncate max-w-[150px] sm:max-w-[200px]">{displayName}</span>
        </nav>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 text-red-700 rounded-xl text-sm font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
            {error.includes("login") && (
              <Link
                href="/auth/customer-login"
                className="px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        )}
        {success && (
          <div className="mb-4 px-4 py-3 bg-green-50 text-green-700 rounded-xl text-sm font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {success}
            </div>
            <Link
              href="/cart"
              className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
            >
              View Cart
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-2xl ring-1 ring-slate-100 overflow-hidden">
              {selectedImage ? (
                <Image
                  src={selectedImage}
                  alt={displayName}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-50">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 bg-slate-100 rounded-2xl"></div>
                </div>
              )}
            </div>

            {allImages.length > 1 && (
              <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {allImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden ring-2 transition-all ${
                      index === selectedImageIndex
                        ? "ring-indigo-500"
                        : "ring-transparent hover:ring-slate-200"
                    }`}
                    aria-label={`View image ${index + 1}`}
                  >
                    <Image
                      src={image}
                      alt={`${displayName} - ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
                {discount > 0 && (
                  <span className="px-2 sm:px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
                    -{discount}%
                  </span>
                )}
                {!isOnSale && (
                  <span className="px-2 sm:px-3 py-1 bg-slate-900 text-white text-xs font-semibold rounded-full">
                    Off Sale
                  </span>
                )}
                {isLeadTimeOnly && (
                  <span className="px-2 sm:px-3 py-1 bg-amber-500 text-white text-xs font-semibold rounded-full">
                    Lead Time
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-2 sm:mb-3 leading-tight">
                {displayName}
              </h1>
            </div>

            <div className="flex items-baseline gap-2 sm:gap-3">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">${price.toFixed(2)}</span>
              {costPrice > price && costPrice > 0 && (
                <span className="text-base sm:text-lg text-slate-400 line-through">${costPrice.toFixed(2)}</span>
              )}
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              {displayCategory && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Category</span>
                  <Link
                    href={`/products?category=${product.categoryId}`}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    {displayCategory}
                  </Link>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Model</span>
                <span className="text-sm font-medium text-slate-900">{product.model}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Unit</span>
                <span className="text-sm font-medium text-slate-900">{product.unit}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Availability</span>
                <span className={`text-sm font-medium ${
                  isInStock ? "text-green-600" : "text-red-600"
                }`}>
                  {formatLeadtime(leadTime)}
                </span>
              </div>
              {moq > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">MOQ</span>
                  <span className="text-sm font-medium text-slate-900">{moq} {product.unit}</span>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Quantity</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(moq, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  disabled={quantity <= moq}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className="w-16 text-center text-lg font-semibold">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  disabled={quantity >= 999}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <span className="text-xs text-slate-400">{product.unit}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
              <button
                onClick={handleAddToCart}
                disabled={!isOnSale || !isInStock || isLoading || !quoteId}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 sm:py-4 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Add to Cart
                  </>
                )}
              </button>
            </div>

            {displayDescription && (
              <div className="pt-4 sm:pt-6 border-t border-slate-100">
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-2 sm:mb-3">Description</h2>
                <p className="text-sm sm:text-base text-slate-600 leading-snug line-clamp-3">
                  {displayDescription}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}