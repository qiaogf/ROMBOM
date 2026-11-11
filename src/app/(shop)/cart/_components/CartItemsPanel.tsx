"use client";

// Left panel: cart items table + qty controls + bottom summary + submit/delete buttons.
// Extracted from CartContent.tsx (Phase 20) — pure move, zero behavior change.

import Link from "next/link";
import { Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import { formatUSD } from "@/lib/price";
import { toCartItemDisplay, formatLeadtime } from "@/lib/cart-display";
import type { CartWithItems } from "@/app/actions/cartActions";
import type { CartPageActions } from "./useCartPageActions";

interface Props {
  items: CartWithItems["items"];
  isLoggedIn: boolean;
  actions: CartPageActions;
}

// 列序（2026-10-30）：Model（弹性）/ Price / Qty / Subtotal / Condition / Leadtime / Self / 删除
// 列宽总和严格控制：固定列 478px + gaps 7px + padding 16px ≈ 501px，Model 列弹性填充剩余空间
const gridCols =
  "grid-cols-1 sm:grid-cols-[minmax(0,1.5fr)_80px_68px_80px_80px_90px_52px_28px]";

export function CartItemsPanel({ items, isLoggedIn, actions }: Props) {
  const {
    loadingItemId,
    qtyInputs,
    setQtyInputs,
    isSubmitting,
    setShowLogin,
    totalItems,
    totalAmount,
    handleUpdateQuantity,
    handleRemoveItem,
    handleClearCart,
    handleSubmitOrder,
    commitQty,
  } = actions;

  return (
    <div className="lg:col-span-1">
      <div className="border border-slate-200 rounded bg-white overflow-hidden">
        {/* 表头（桌面端显示）— 列序与行单元格严格一一对应 */}
        <div className={`hidden sm:grid ${gridCols} gap-1 items-center px-2 py-1 bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500`}>
          <span>Model</span>
          <span>Price</span>
          <span>Qty</span>
          <span>Amount</span>
          <span>Condition</span>
          <span>Leadtime</span>
          <span className="text-center">Self</span>
          <span aria-hidden></span>
        </div>

        {items.map((item) => {
          const display = toCartItemDisplay(item);
          const unitPrice = display.unitPrice;
          const itemTotal = unitPrice * item.quantity;
          const isLoading = loadingItemId === item.itemId;
          const qtyValue = qtyInputs[item.itemId] ?? String(item.quantity);
          // 仅当条目有有效产品/型号引用时才生成详情链接，避免 /products/undefined
          const detailId = item.productId || item.modelPriceId;

          return (
            <div
              key={item.itemId}
              className={`grid ${gridCols} gap-1 items-center px-2 py-1 border-b border-slate-100 last:border-b-0`}
            >
              {/* Model（首列，链接到产品详情；无引用时仅展示文字） */}
              <div className="min-w-0 flex items-center justify-between sm:block">
                <span className="sm:hidden text-[10px] font-bold uppercase text-slate-400">Model</span>
                {detailId ? (
                  <Link
                    href={`/products/${detailId}`}
                    className="block text-[12px] text-slate-700 hover:text-green-700 truncate font-medium"
                  >
                    {display.model || "-"}
                  </Link>
                ) : (
                  <span
                    className="block text-[12px] text-slate-500 truncate font-medium"
                    title="This cart line is no longer linked to a product"
                  >
                    {display.model || "-"} <span className="text-rose-500">(unavailable)</span>
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="flex items-center justify-between sm:justify-start">
                <span className="sm:hidden text-[10px] font-bold uppercase text-slate-400">Price</span>
                <span className="text-[12px] text-slate-700 tabular-nums">{formatUSD(unitPrice)}</span>
              </div>

              {/* Qty — 窄输入框 + 小字号左右加减 */}
              <div className="flex items-center sm:justify-start">
                <span className="sm:hidden text-[10px] font-bold uppercase text-slate-400 mr-1">Qty</span>
                <button
                  type="button"
                  onClick={() => void handleUpdateQuantity(item.itemId, item.quantity - 1)}
                  disabled={isLoading || item.quantity <= 1}
                  className="w-5 h-[22px] rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 cursor-pointer transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-2.5 h-2.5" />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  value={qtyValue}
                  disabled={isLoading}
                  onChange={(e) => setQtyInputs((m) => ({ ...m, [item.itemId]: e.target.value }))}
                  onBlur={(e) => commitQty(item.itemId, e.target.value, item.quantity)}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  className="w-7 h-[22px] text-center text-[10px] text-slate-700 border border-slate-200 rounded focus:outline-none focus:border-[#336633] disabled:opacity-50"
                  aria-label={`Quantity for ${display.model || "item"}`}
                />
                <button
                  type="button"
                  onClick={() => void handleUpdateQuantity(item.itemId, item.quantity + 1)}
                  disabled={isLoading}
                  className="w-5 h-[22px] rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 cursor-pointer transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* Subtotal */}
              <div className="flex items-center justify-between sm:justify-start">
                <span className="sm:hidden text-[10px] font-bold uppercase text-slate-400">Amount</span>
                <span className="text-[12px] text-slate-700 tabular-nums">{formatUSD(itemTotal)}</span>
              </div>

              {/* Condition */}
              <div className="min-w-0 flex items-center justify-between sm:block">
                <span className="sm:hidden text-[10px] font-bold uppercase text-slate-400">Condition</span>
                <span className="block text-[12px] text-slate-700 truncate">
                  {display.condition ?? <span className="text-slate-400">-</span>}
                </span>
              </div>

              {/* Leadtime */}
              <div className="min-w-0 flex items-center justify-between sm:block">
                <span className="sm:hidden text-[10px] font-bold uppercase text-slate-400">Leadtime</span>
                <span className={`block text-[12px] truncate ${
                  (display.leadTime ?? "").toLowerCase().includes("out of stock") ? "text-rose-600"
                  : (display.leadTime ?? "").toLowerCase().includes("in stock") ? "text-green-700"
                  : "text-amber-700"
                }`}>
                  {formatLeadtime(display.leadTime)}
                </span>
              </div>

              {/* Self — 淡绿 = 客户可自助下单；灰色（不显示）需人工确认 */}
              <div className="flex items-center gap-1 sm:justify-center">
                <span className="sm:hidden text-[10px] font-bold uppercase text-slate-400 mr-1">Self</span>
                {display.selfOrder && (
                  <span
                    className="inline-block px-1 py-[1px] rounded bg-green-100 border border-green-300 text-[9px] font-medium text-green-700 whitespace-nowrap"
                    title="Self-checkout available"
                  >
                    Self
                  </span>
                )}
              </div>

              {/* 删除 */}
              <div className="flex sm:justify-end">
                <button
                  type="button"
                  onClick={() => void handleRemoveItem(item.itemId)}
                  disabled={isLoading}
                  className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-40 cursor-pointer"
                  aria-label={`Remove ${display.model || "item"}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部：总金额汇总 */}
      <div className="mt-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <div className="text-[12px] text-slate-600">
          Items ({totalItems}):{" "}
          <span className="text-[13px] font-bold text-slate-900 ml-0.5">{formatUSD(totalAmount)}</span>
        </div>
      </div>

      {/* Submit Order 按钮 */}
      <div className="mt-1.5 flex gap-1">
        {isLoggedIn ? (
          <button
            type="button"
            onClick={() => void handleSubmitOrder()}
            disabled={isSubmitting}
            className="flex-1 py-2 rounded bg-[#336633] text-white text-[12px] font-bold tracking-wide hover:bg-[#2d5a2d] transition-colors inline-flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Order"}
            {!isSubmitting && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => actions.startSubmitFlow()}
            className="flex-1 py-2 rounded bg-[#336633] text-white text-[12px] font-bold tracking-wide hover:bg-[#2d5a2d] transition-colors inline-flex items-center justify-center gap-1"
          >
            Submit Order
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => void handleClearCart()}
          className="px-4 py-2 rounded bg-slate-50 border border-slate-200 text-slate-700 text-[12px] font-bold hover:bg-slate-100 transition-colors inline-flex items-center justify-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}
