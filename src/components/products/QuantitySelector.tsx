"use client";

import { useState } from "react";

interface QuantitySelectorProps {
  stock: number;
  initialValue?: number;
  onChange: (quantity: number) => void;
}

export function QuantitySelector({ stock, initialValue = 1, onChange }: QuantitySelectorProps) {
  const [quantity, setQuantity] = useState(Math.min(initialValue, stock));

  const handleDecrease = () => {
    if (quantity > 1) {
      const newQuantity = quantity - 1;
      setQuantity(newQuantity);
      onChange(newQuantity);
    }
  };

  const handleIncrease = () => {
    if (quantity < stock) {
      const newQuantity = quantity + 1;
      setQuantity(newQuantity);
      onChange(newQuantity);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= stock) {
      setQuantity(value);
      onChange(value);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleDecrease}
        disabled={quantity <= 1}
        className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all"
        aria-label="Decrease quantity"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>

      <div className="relative">
        <input
          type="number"
          min="1"
          max={stock}
          value={quantity}
          onChange={handleInputChange}
          className="w-16 h-10 text-center rounded-lg border border-slate-200 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <button
        onClick={handleIncrease}
        disabled={quantity >= stock}
        className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all"
        aria-label="Increase quantity"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {stock > 0 && stock <= 10 && (
        <span className="text-sm text-amber-600 font-medium ml-2">
          Only {stock} left in stock
        </span>
      )}
    </div>
  );
}