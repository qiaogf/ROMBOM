"use client";

import { useState } from "react";

interface QuantitySelectorProps {
  stock: number;
  initialValue?: number;
  onChange: (quantity: number) => void;
}

export function QuantitySelector({
  stock,
  initialValue = 1,
  onChange,
}: QuantitySelectorProps) {
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
    <div className="flex items-center gap-2">
      <button
        onClick={handleDecrease}
        disabled={quantity <= 1}
        className="w-7 h-7 border border-slate-300 rounded flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Decrease quantity"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>

      <input
        type="number"
        min="1"
        max={stock}
        value={quantity}
        onChange={handleInputChange}
        className="w-12 h-7 text-center border border-slate-300 rounded text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
      />

      <button
        onClick={handleIncrease}
        disabled={quantity >= stock}
        className="w-7 h-7 border border-slate-300 rounded flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Increase quantity"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {stock > 0 && stock <= 10 && (
        <span className="text-xs text-amber-600 ml-1">
          Only {stock} left
        </span>
      )}
    </div>
  );
}