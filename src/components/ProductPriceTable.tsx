"use client";

import React, { useState } from "react";
import { ShoppingCart, Plus, Minus, Package, Loader2 } from "lucide-react";
import type { SeriesGroup, Product } from "@/lib/db-service";
import { useCart } from "@/components/cart/CartProvider";

/** 高亮匹配的关键词 */
function Highlight({ text, query }: { text: string; query?: string }) {
  if (!query?.trim()) return <>{text}</>;
  const trimmed = query.trim();
  const lower = text.toLowerCase();
  const lowerQ = trimmed.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  let idx = lower.indexOf(lowerQ);
  while (idx !== -1) {
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark key={i} className="bg-amber-300 text-slate-900 rounded px-0.5 font-semibold">
        {text.slice(idx, idx + trimmed.length)}
      </mark>
    );
    i = idx + trimmed.length;
    idx = lower.indexOf(lowerQ, i);
  }
  if (i < text.length) parts.push(text.slice(i));
  return <>{parts}</>;
}

interface ProductPriceTableProps {
  seriesGroups: SeriesGroup[];
  searchQuery?: string;
  showSeriesHeader?: boolean;
  /** thead sticky top 偏移（像素）—— 当外层有 sticky 的 Breadcrumb 时用 */
  stickyOffset?: number;
}

export function ProductPriceTable({ seriesGroups, searchQuery, showSeriesHeader = true, stickyOffset = 0 }: ProductPriceTableProps) {
  const { state, addToCart, addToCartByModelPrice } = useCart();
  const [quantities, setQuantities] = useState<Record<string, number | "">>({});

  // 输入框默认空白；加购/按钮时以 MOQ 为下限
  const getQty = (p: Product) => {
    const v = quantities[p.id];
    const n = v === undefined || v === "" ? p.moq : parseInt(String(v), 10);
    return Math.max(Number.isFinite(n) ? n : p.moq, p.moq);
  };
  const updateQty = (p: Product, delta: number) =>
    setQuantities((prev) => {
      const cur = prev[p.id];
      const base = cur === undefined || cur === "" ? p.moq : parseInt(String(cur), 10);
      const n = Math.min(9999, Math.max(p.moq, (Number.isFinite(base) ? base : p.moq) + delta));
      return { ...prev, [p.id]: n };
    });
  const onQtyChange = (p: Product, v: string) => {
    if (v.trim() === "") {
      setQuantities((prev) => ({ ...prev, [p.id]: "" }));
      return;
    }
    const n = parseInt(v, 10);
    if (Number.isFinite(n)) setQuantities((prev) => ({ ...prev, [p.id]: n }));
  };

  /**
   * 双路径加购分流：
   *   - quoteId 非空 → 旧路径，product.id 是 productId，调 addToCart
   *   - quoteId 为空 → 新路径，product.id 是 modelPriceId（db-service 映射时已设置），调 addToCartByModelPrice
   */
  const handleAdd = (p: Product) =>
    p.quoteId
      ? addToCart(p.id, p.quoteId, getQty(p))
      : addToCartByModelPrice(p.id, getQty(p));

  if (seriesGroups.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-slate-700">No Products Found</h3>
      </div>
    );
  }

  const qtyBtn = "w-5 h-5 flex items-center justify-center border border-slate-300 rounded disabled:opacity-40 hover:bg-slate-100 active:bg-amber-200 text-slate-600 shrink-0";

  // 扁平报价表：单表头 + 系列分组行（一个 thead 管所有 series）
  return (
    <div>
      <div className="overflow-x-auto scroll-smooth">
        <table className="w-full min-w-[720px] text-[11px] border-collapse table-fixed">
          {/* PC 端列宽按字段字符上限固定（ch 单位）；移动端用紧凑百分比自适应，全部列保留 */}
          <colgroup>
            <col className="w-[12%] sm:w-[10ch]" />
            <col className="w-[20ch]" />
            <col className="w-[22%] sm:w-auto" />
            <col className="w-[10%] sm:w-[10ch]" />
            <col className="w-[10%] sm:w-[10ch]" />
            <col className="w-[10%] sm:w-[10ch]" />
            <col className="w-[10%] sm:w-[96px]" />
            <col className="w-[6%] sm:w-[56px]" />
          </colgroup>
          <thead className="sticky z-10 bg-slate-100 shadow-sm" style={{ top: stickyOffset }}>
            <tr className="bg-slate-100 text-slate-700">
              <th className="px-1.5 py-1 font-medium border-b border-slate-300 text-left">Product</th>
              <th className="px-1.5 py-1 font-medium border-b border-slate-300 text-left">Model</th>
              <th className="px-1.5 py-1 font-medium border-b border-slate-300 text-left">Description</th>
              <th className="px-1.5 py-1 font-medium border-b border-slate-300 text-left">Condition</th>
              <th className="px-1.5 py-1 font-medium border-b border-slate-300 text-left">Leadtime</th>
              <th className="px-1.5 py-1 font-medium border-b border-slate-300 text-left">ListPrice</th>
              <th className="px-1.5 py-1 font-medium border-b border-slate-300 text-left">Qty</th>
              <th className="px-1.5 py-1 font-medium border-b border-slate-300 text-left">Cart</th>
            </tr>
          </thead>
          <tbody>
            {seriesGroups.map((group) => (
              <React.Fragment key={group.seriesSlug || group.seriesName}>
                {showSeriesHeader && (
                  <tr>
                    <td colSpan={8} className="px-1.5 py-1 border-b border-slate-200">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] font-semibold text-green-600">{group.seriesName}</span>
                        <span className="text-[10px] text-slate-500">{group.products.length} SKU</span>
                      </div>
                    </td>
                  </tr>
                )}
                {group.products.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-1.5 py-2 text-center text-slate-400 text-[10px]">
                      No models available.
                    </td>
                  </tr>
                )}
                {group.products.map((product: Product) => {
                  const qty = getQty(product);
                  const adding = !!state.addingProductIds[product.id];
                  return (
                    <tr key={product.id} data-product-id={product.id}
                      className="border-b border-slate-100">
                      <td className="px-1.5 py-1 align-middle">
                        <div className="text-slate-900 leading-tight truncate">
                          <Highlight text={product.name} query={searchQuery} />
                        </div>
                      </td>
                      <td className="px-1.5 py-1 text-slate-700 font-semibold align-middle">
                        <Highlight text={product.model} query={searchQuery} />
                      </td>
                      <td className="px-1.5 py-1 text-slate-500 align-middle">
                        <div className="line-clamp-2 leading-tight">
                          <Highlight text={product.description || "-"} query={searchQuery} />
                        </div>
                      </td>
                      <td className="px-1.5 py-1 text-slate-600 align-middle">
                        <div className="line-clamp-2 leading-tight">
                          {product.condition ?? <span className="text-slate-400 italic">-</span>}
                        </div>
                      </td>
                      <td className="px-1.5 py-1 text-slate-600 align-middle">
                        <span className="leading-tight whitespace-nowrap">
                          {product.leadTime || <span className="text-slate-400 italic">-</span>}
                        </span>
                      </td>
                      <td className="px-1.5 py-1 tabular-nums align-middle">
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <span className="font-semibold text-slate-900">{product.price.toFixed(2)}</span>
                          {product.priceTag === "lowest" && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Lowest</span>
                          )}
                          {product.priceTag === "fastest" && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">Fastest</span>
                          )}
                          {product.priceTag === "both" && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">Best</span>
                          )}
                        </div>
                      </td>
                      <td className="px-1.5 py-1 align-middle">
                        <div className="flex items-center gap-0.5">
                          <button type="button" aria-label="Decrease quantity" disabled={adding || qty <= product.moq}
                            onClick={() => updateQty(product, -1)} className={qtyBtn}>
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <input type="text" inputMode="numeric" value={quantities[product.id] ?? ""} disabled={adding}
                            onChange={(e) => onQtyChange(product, e.target.value)}
                            className="w-7 text-center border border-slate-300 rounded py-0.5 text-[11px] focus:outline-none focus:border-amber-400 disabled:bg-slate-50 disabled:opacity-80 tabular-nums" />
                          <button type="button" aria-label="Increase quantity" disabled={adding}
                            onClick={() => updateQty(product, +1)} className={qtyBtn}>
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-1.5 py-1 align-middle">
                        <button type="button" onClick={() => handleAdd(product)} disabled={adding || !product.id}
                          className="inline-flex items-center justify-center gap-0.5 px-1 py-0.5 min-h-[22px] rounded text-[10px] font-medium transition-colors w-full bg-green-700 text-white hover:bg-green-800 active:bg-green-900 disabled:bg-green-700/70 enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
                          {adding ? (
                            <><Loader2 className="w-2.5 h-2.5 animate-spin" aria-hidden /><span>…</span></>
                          ) : (
                            <><ShoppingCart className="w-2.5 h-2.5 shrink-0" /><span>+</span></>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
