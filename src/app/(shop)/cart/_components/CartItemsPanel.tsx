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

// 列序（2026-11-18）：Model（弹性）/ Price / Qty / Amount / Condition / Leadtime / 删除
// 列宽：固定列 488px + gaps 24px + padding 16px ≈ 528px，Model 下限 160px，
// 表格最小宽度 700px（手机端同样保持表格形态），容器更窄时由外层 overflow-auto 产生左右滑条
const gridCols =
  "grid-cols-[minmax(160px,1.2fr)_80px_68px_84px_88px_88px_80px]";

export function CartItemsPanel({ items, isLoggedIn, actions }: Props) {
  const {
    loadingItemId,
    qtyInputs,
    setQtyInputs,
    isSubmitting,
    totalItems,
    totalAmount,
    handleUpdateQuantity,
    handleRemoveItem,
    handleClearCart,
    handleSubmitOrder,
    commitQty,
  } = actions;

  return (
    <div className="lg:col-span-1 min-w-0 overflow-auto max-h-[70dvh]">
      <div className="border border-slate-200 rounded bg-white overflow-hidden min-w-[700px]">
        {/* 表头 — 列序与行单元格严格一一对应（手机端同样按表格展示） */}
        <div className={`grid ${gridCols} gap-1 items-center px-2 py-1 bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center`}>
          <span>Model</span>
          <span>Price</span>
          <span>Qty</span>
          <span>Amount</span>
          <span>Condition</span>
          <span>Leadtime</span>
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
              <div className="min-w-0">
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
              <div className="flex items-center justify-center">
                <span className="text-[12px] text-slate-700 tabular-nums">{formatUSD(unitPrice)}</span>
              </div>

              {/* Qty — 窄输入框 + 小字号左右加减 */}
              <div className="flex items-center justify-center">
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
              <div className="flex items-center justify-center">
                <span className="text-[12px] text-slate-700 tabular-nums">{formatUSD(itemTotal)}</span>
              </div>

              {/* Condition */}
              <div className="min-w-0">
                <span className="block text-[12px] text-slate-700 truncate text-center">
                  {display.condition ?? <span className="text-slate-400">-</span>}
                </span>
              </div>

              {/* Leadtime */}
              <div className="min-w-0">
                <span className={`block text-[12px] truncate text-center ${
                  (display.leadTime ?? "").toLowerCase().includes("out of stock") ? "text-rose-600"
                  : (display.leadTime ?? "").toLowerCase().includes("in stock") ? "text-green-700"
                  : "text-amber-700"
                }`}>
                  {formatLeadtime(display.leadTime)}
                </span>
              </div>

              {/* 删除 */}
              <div className="flex items-center justify-center">
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

      {/* 底部：汇总与操作按钮 — 与表格同属一个表格（滚动条位于 Items 行下方），列对齐：Items→Qty、金额→Amount、Submit→Condition、Delete→Self */}
      <div className={`grid ${gridCols} gap-1 items-center border-t border-slate-200 px-2 py-1`}>
        <span className="col-start-3 text-[12px] text-slate-600 whitespace-nowrap">
          Items ({totalItems}):
        </span>
        <span className="col-start-4 text-[13px] font-bold text-slate-900 tabular-nums whitespace-nowrap">
          {formatUSD(totalAmount)}
        </span>

        <div className="col-start-5 col-span-2">
          {isLoggedIn ? (
            <button
              type="button"
              onClick={() => void handleSubmitOrder()}
              disabled={isSubmitting}
              className="w-full py-2 rounded bg-[#336633] text-white text-[12px] font-bold tracking-wide hover:bg-[#2d5a2d] transition-colors inline-flex items-center justify-center gap-1 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Order"}
              {!isSubmitting && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => actions.startSubmitFlow()}
              className="w-full py-2 rounded bg-[#336633] text-white text-[12px] font-bold tracking-wide hover:bg-[#2d5a2d] transition-colors inline-flex items-center justify-center gap-1"
            >
              Submit Order
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="col-start-7">
          <button
            type="button"
            onClick={() => void handleClearCart()}
            className="w-full px-2 py-2 rounded bg-slate-50 border border-slate-200 text-slate-700 text-[12px] font-bold hover:bg-slate-100 transition-colors inline-flex items-center justify-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
