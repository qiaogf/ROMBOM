"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QuantitySelector } from "@/components/products/QuantitySelector";
import { addToCart } from "@/app/actions/cartActions";
import type { ProductWithCategory } from "@/actions/products";

interface ProductDetailContentProps {
  product: ProductWithCategory;
}

const DEBOUNCE_DELAY = 500;

export function ProductDetailContent({ product }: ProductDetailContentProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const lastAddRef = useRef(0);

  const displayName = product.nameEn || product.name;
  const displayDescription = product.descriptionEn || product.description;
  const displayCategory = product.category.nameEn || product.category.name;
  const price = Number(product.price);
  const originalPrice = product.originalPrice ? Number(product.originalPrice) : null;
  const discount = originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0;
  const rating = product.ratingAverage ? Number(product.ratingAverage) : 0;

  const allImages = product.images.length > 0 ? product.images : [];
  const selectedImage = allImages[selectedImageIndex] || product.thumbnail || null;

  const handleAddToCart = async () => {
    if (isLoading) return;

    const now = Date.now();
    if (now - lastAddRef.current < DEBOUNCE_DELAY) {
      return;
    }
    lastAddRef.current = now;

    if (product.stock <= 0) {
      setError("This product is currently out of stock");
      return;
    }
    
    if (quantity > product.stock) {
      setError(`Only ${product.stock} items available in stock`);
      return;
    }
    
    if (quantity < 1 || quantity > 999) {
      setError("Invalid quantity");
      return;
    }
    
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const result = await addToCart(product.id, quantity);
      if (result.success) {
        setSuccess(`Successfully added ${quantity} item(s) to your cart`);
      } else {
        if (result.message.includes("login")) {
          setError("Please login to add items to cart");
        } else {
          setError(result.message);
        }
      }
    } catch (err) {
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
          <Link href={`/products?category=${product.categoryId}`} className="text-slate-500 hover:text-slate-900 transition-colors">
            {displayCategory}
          </Link>
          <span className="text-slate-400">/</span>
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
                href="/account/login"
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
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              View Cart
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-2xl ring-1 ring-slate-100 overflow-hidden">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  loading="eager"
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
                    className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden ring-2 transition-all ${
                      index === selectedImageIndex
                        ? "ring-indigo-500"
                        : "ring-transparent hover:ring-slate-200"
                    }`}
                    aria-label={`View image ${index + 1}`}
                  >
                    <img
                      src={image}
                      alt={`${displayName} - ${index + 1}`}
                      className="w-full h-full object-cover"
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
                {product.featured && (
                  <span className="px-2 sm:px-3 py-1 bg-slate-900 text-white text-xs font-semibold rounded-full">
                    Featured
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-2 sm:mb-3 leading-tight">
                {displayName}
              </h1>

              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-4 h-4 sm:w-5 sm:h-5 ${
                        star <= Math.round(rating)
                          ? "text-amber-400 fill-amber-400"
                          : "text-slate-200"
                      }`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm text-slate-500">({product.ratingCount} reviews)</span>
              </div>
            </div>

            <div className="flex items-baseline gap-2 sm:gap-3">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">${price.toFixed(2)}</span>
              {originalPrice && originalPrice > price && (
                <span className="text-base sm:text-lg text-slate-400 line-through">${originalPrice.toFixed(2)}</span>
              )}
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Category</span>
                <Link
                  href={`/products?category=${product.categoryId}`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  {displayCategory}
                </Link>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">SKU</span>
                <span className="text-sm font-medium text-slate-900 font-mono">{product.sku}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Stock</span>
                <span className={`text-sm font-medium ${
                  product.stock > 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {product.stock > 0 ? `In Stock (${product.stock})` : "Out of Stock"}
                </span>
              </div>
              {product.weight && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Weight</span>
                  <span className="text-sm font-medium text-slate-900">
                    {Number(product.weight).toFixed(2)} {product.weightUnit}
                  </span>
                </div>
              )}
              {product.country && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Origin</span>
                  <span className="text-sm font-medium text-slate-900">{product.country}</span>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Quantity</h3>
              <QuantitySelector
                stock={product.stock}
                initialValue={1}
                onChange={setQuantity}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
              <button
                onClick={handleAddToCart}
                disabled={product.stock <= 0 || isLoading}
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
              <button className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Wishlist
              </button>
            </div>

            <div className="pt-4 sm:pt-6 border-t border-slate-100">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-2 sm:mb-3">Description</h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed whitespace-pre-wrap">
                {displayDescription}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}