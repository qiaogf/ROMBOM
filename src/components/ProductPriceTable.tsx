"use client";

import { useState } from "react";
import { ShoppingCart, Plus, Minus, Package, Loader2 } from "lucide-react";
import type { SeriesGroup, Product } from "@/lib/db-service";
import { formatStockStatus } from "@/lib/cart-display";
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
}

export function ProductPriceTable({ seriesGroups, searchQuery, showSeriesHeader = true }: ProductPriceTableProps) {
  const { state, addToCart, addToCartByModelPrice } = useCart();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // 数量以产品 MOQ 为下限，避免加购被服务端以最小起订量拒绝
  const getQty = (p: Product) => Math.max(quantities[p.id] ?? p.moq, p.moq);
  const updateQty = (p: Product, delta: number) =>
    setQuantities((prev) => ({ ...prev, [p.id]: Math.min(9999, Math.max(p.moq, (prev[p.id] ?? p.moq) + delta)) }));
  const onQtyChange = (p: Product, v: string) => {
    const n = parseInt(v, 10);
    if (Number.isFinite(n)) setQuantities((prev) => ({ ...prev, [p.id]: Math.min(9999, Math.max(p.moq, Math.floor(n))) }));
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

  const qtyBtn = "w-5 h-5 flex items-center justify-center border border-slate-300 rounded disabled:opacity-40 hover:bg-slate-100 text-slate-600 shrink-0";

  return (
    <div className="space-y-6">
      {seriesGroups.map((group) => (
        <div key={group.seriesName} className="mb-6">
          {showSeriesHeader && (
            <div className="border-b-2 border-green-700 mb-2 pb-1 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-green-800">{group.seriesName}</h3>
              <span className="text-[11px] text-slate-500">{group.products.length} SKU</span>
            </div>
          )}

          <div className="overflow-x-auto scroll-smooth">
            {/* min-w 保证窄屏下列宽不被压缩成叠印，整体横向滚动（mcmaster 式） */}
            <table className="w-full min-w-[720px] text-[11px] border-collapse table-fixed">
              <colgroup>
                <col className="w-[7%]" />
                <col className="w-[14%]" />
                <col className="w-[32%]" />
                <col className="w-[3%]" />
                <col className="w-[4%]" />
                <col className="w-[9%]" />
                <col className="w-[8%]" />
                <col className="w-[7%]" />
                <col className="w-[9%]" />
                <col className="w-[7%]" />
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-100 text-slate-700">
                  <th className="px-2 py-1 font-medium border-b border-slate-200">Product Name</th>
                  <th className="px-2 py-1 font-medium border-b border-slate-200">Model</th>
                  <th className="px-2 py-1 font-medium border-b border-slate-200">Description</th>
                  <th className="px-2 py-1 font-medium border-b border-slate-200 text-center">Unit</th>
                  <th className="px-2 py-1 font-medium border-b border-slate-200 text-center tabular-nums">MOQ</th>
                  <th className="px-2 py-1 font-medium border-b border-slate-200 text-center">Product Condition</th>
                  <th className="px-2 py-1 font-medium border-b border-slate-200 text-center">Stock Status</th>
                  <th className="px-2 py-1 font-medium border-b border-slate-200 text-center tabular-nums">Unit Price</th>
                  <th className="px-2 py-1 font-medium border-b border-slate-200 text-center">Quantity</th>
                  <th className="px-2 py-1 font-medium border-b border-slate-200 text-center">Cart</th>
                </tr>
              </thead>
              <tbody>
                {group.products.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-2 py-3 text-center text-slate-400">
                      No models available in this series yet.
                    </td>
                  </tr>
                )}
                {group.products.map((product: Product) => {
                  const qty = getQty(product);
                  const adding = !!state.addingProductIds[product.id];
                  return (
                    <tr key={product.id} data-product-id={product.id}
                      className={`border-b border-slate-100 transition-colors ${adding ? "bg-amber-50" : "hover:bg-amber-50/30"}`}>
                      <td className="px-2 py-1 align-top">
                        <div className="text-slate-900 leading-tight truncate">
                          <Highlight text={product.name} query={searchQuery} />
                        </div>
                      </td>
                      <td className="px-2 py-1 text-slate-700 font-semibold align-top">
                        <Highlight text={product.model} query={searchQuery} />
                      </td>
                      <td className="px-2 py-1 text-slate-500 align-top">
                        <div className="line-clamp-2 leading-tight">
                          <Highlight text={product.description || "-"} query={searchQuery} />
                        </div>
                      </td>
                      <td className="px-2 py-1 text-slate-600 text-center align-top">{product.unit}</td>
                      <td className="px-2 py-1 text-center tabular-nums text-slate-600 align-top">{product.moq}</td>
                      <td className="px-2 py-1 text-slate-600 text-center align-top">
                        <div className="line-clamp-2 leading-tight">
                          {product.condition ?? <span className="text-slate-400 italic">-</span>}
                        </div>
                      </td>
                      <td className="px-2 py-1 text-slate-600 text-center align-top">
                        <span className={`inline-block leading-tight whitespace-nowrap ${
                          product.stockStatus === "in_stock" ? "text-green-700"
                          : product.stockStatus === "out_of_stock" ? "text-rose-600"
                          : "text-amber-700"
                        }`}>
                          {formatStockStatus(product.stockStatus, product.leadTime)}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-center pl-2 tabular-nums align-top">
                        <span className="font-semibold text-slate-900">${product.price.toFixed(2)}</span>
                      </td>
                      <td className="px-2 py-1 align-top">
                        <div className="flex items-center justify-center gap-0.5">
                          <button type="button" aria-label="Decrease quantity" disabled={adding || qty <= product.moq}
                            onClick={() => updateQty(product, -1)} className={qtyBtn}>
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <input type="text" inputMode="numeric" value={qty} disabled={adding}
                            onChange={(e) => onQtyChange(product, e.target.value)}
                            className="w-9 text-center border border-slate-300 rounded py-0.5 text-[11px] focus:outline-none focus:border-amber-400 disabled:bg-slate-50 disabled:opacity-80 mx-0.5 tabular-nums" />
                          <button type="button" aria-label="Increase quantity" disabled={adding}
                            onClick={() => updateQty(product, +1)} className={qtyBtn}>
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-1 text-center align-top">
                        <button type="button" onClick={() => handleAdd(product)} disabled={adding || !product.id}
                          className="inline-flex items-center justify-center gap-0.5 px-1.5 py-1 rounded text-[10px] font-medium transition-colors w-full bg-green-700 text-white hover:bg-green-800 disabled:bg-green-700/70 enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
                          {adding ? (
                            <><Loader2 className="w-2.5 h-2.5 animate-spin" aria-hidden /><span className="truncate">Adding…</span></>
                          ) : (
                            <><ShoppingCart className="w-2.5 h-2.5 shrink-0" /><span className="truncate">Add</span></>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
