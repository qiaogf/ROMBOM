"use client";

// Right panel: Specifications table for cart items.
// Extracted from CartContent.tsx (Phase 20) — pure move, zero behavior change.

import { toCartItemDisplay } from "@/lib/cart-display";
import type { CartWithItems } from "@/app/actions/cartActions";

interface Props {
  items: CartWithItems["items"];
  /** 游客不开放 Datasheet 下载（规格其余列正常展示） */
  isLoggedIn?: boolean;
}

export function CartSpecsPanel({ items, isLoggedIn = true }: Props) {
  return (
    <div className="border border-slate-200 rounded bg-white overflow-hidden lg:sticky lg:top-1">
      <div className="px-2 py-1.5 bg-slate-50 border-b border-slate-200">
        <h3 className="text-[12px] font-bold text-slate-900">Specifications</h3>
      </div>
      <div className="overflow-auto max-h-[65dvh]">
        <table className="w-full text-[11px] whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
            <tr>
              <th className="px-1.5 py-1 text-left font-bold">Model No.</th>
              <th className="px-1.5 py-1 text-left font-bold">Origin</th>
              <th className="px-1.5 py-1 text-left font-bold">Certifications</th>
              <th className="px-1.5 py-1 text-left font-bold">Datasheet</th>
              <th className="px-1.5 py-1 text-right font-bold">Length</th>
              <th className="px-1.5 py-1 text-right font-bold">Width</th>
              <th className="px-1.5 py-1 text-right font-bold">Height</th>
              <th className="px-1.5 py-1 text-right font-bold">Diameter</th>
              <th className="px-1.5 py-1 text-left font-bold">Dim. Unit</th>
              <th className="px-1.5 py-1 text-right font-bold">Weight</th>
              <th className="px-1.5 py-1 text-right font-bold">ack. Weight</th>
              <th className="px-1.5 py-1 text-left font-bold">Wt. Unit</th>
              <th className="px-1.5 py-1 text-left font-bold">Battery Attr.</th>
              <th className="px-1.5 py-1 text-right font-bold w-[6ch]">MOQ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const d = toCartItemDisplay(item);
              const link = d.datasheetLink;
              return (
                <tr key={item.itemId} className="hover:bg-slate-50">
                  <td className="px-1.5 py-1 font-medium text-slate-900">{d.model || "—"}</td>
                  <td className="px-1.5 py-1 text-slate-600">{d.origin || "—"}</td>
                  <td className="px-1.5 py-1 text-slate-600">{d.certification || "—"}</td>
                  <td className="px-1.5 py-1">
                    {!d.datasheetAvailable ? (
                      <span className="text-slate-400">—</span>
                    ) : isLoggedIn && link ? (
                      <a href={link} target="_blank" rel="noopener noreferrer" className="text-[#336633] underline hover:text-[#2d5a2d]">
                        Link
                      </a>
                    ) : (
                      // 游客：与登录用户同样显示 Link，点击跳登录；资料地址不下发到浏览器
                      <a
                        href="/auth/customer-login?redirect=/cart"
                        title="Login to view datasheet"
                        className="text-[#336633] underline hover:text-[#2d5a2d]"
                      >
                        Link
                      </a>
                    )}
                  </td>
                  <td className="px-1.5 py-1 text-right text-slate-600">{d.length ?? "—"}</td>
                  <td className="px-1.5 py-1 text-right text-slate-600">{d.width ?? "—"}</td>
                  <td className="px-1.5 py-1 text-right text-slate-600">{d.height ?? "—"}</td>
                  <td className="px-1.5 py-1 text-right text-slate-600">{d.diameter ?? "—"}</td>
                  <td className="px-1.5 py-1 text-slate-600">{d.dimensionUnit || "—"}</td>
                  <td className="px-1.5 py-1 text-right text-slate-600">{d.weight ?? "—"}</td>
                  <td className="px-1.5 py-1 text-right text-slate-600">{d.packingWeight ?? "—"}</td>
                  <td className="px-1.5 py-1 text-slate-600">{d.weightUnit || "—"}</td>
                  <td className="px-1.5 py-1 text-slate-600">{d.batteryAttributes || "—"}</td>
                  <td className="px-1.5 py-1 text-right text-slate-600">{d.moq}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
