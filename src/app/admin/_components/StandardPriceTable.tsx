"use client";

/**
 * Admin Model Prices 右侧 — 标准价格表（公开报价页的数据来源）
 *
 * 结构：系列分组可展开
 *   - 系列行：Series / Markup% (数字输入框，批量应用到该系列所有型号)
 *   - 展开后型号行：Model / Cost / Markup% / Sell Price / MOQ / Cond. / Stock
 *
 * Cost = 同系列已确认文件中该型号的最低 costPrice（服务端计算后传入）。
 *
 * 核心契约（遵循"单一展示字段"原则）：
 *   - Sell Price 只读 ModelPrice.sellPrice，前端不重算；
 *   - Markup 修改由 applySeriesMarkup / applyModelMarkup server action 完成，
 *     服务端重算 sellPrice 后 router.refresh()。
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronDown } from "lucide-react";
import { applySeriesMarkup, applyModelMarkup } from "@/app/actions/adminActions";
import { formatLeadtime } from "@/lib/cart-display";
import { formatUSDOrNull } from "@/lib/format";

export interface StandardPriceRow {
  modelPriceId: string;
  model: string;
  productName: string;
  costPrice: string;       // ModelPrice 自身成本
  sellPrice: string;
  markup: string | null;
  moq: number;
  condition: string | null;
  leadTime: string | null;
  minConfirmedCost: string | null; // 同型号已确认文件最低成本价
}

export interface StandardPriceSeriesGroup {
  seriesId: string;
  seriesName: string;
  brandName: string;
  items: StandardPriceRow[];
}

// 内联 Markup 数字输入框，失焦自动提交
function MarkupInput({
  value,
  onCommit,
}: {
  value: number | null;
  onCommit: (percent: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState<string>(value !== null ? String(value) : "");
  const [pending, startTransition] = useTransition();

  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      max={1000}
      step={0.1}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const v = draft.trim() === "" ? 0 : Number(draft);
        if (!Number.isFinite(v) || v < 0 || v > 1000) {
          setDraft(value !== null ? String(value) : "");
          return;
        }
        startTransition(async () => {
          await onCommit(v);
        });
      }}
      disabled={pending}
      className="w-14 px-1 py-0.5 text-right text-[11px] tabular-nums border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
      placeholder="0"
    />
  );
}

interface StandardPriceTableProps {
  groups: StandardPriceSeriesGroup[];
}

export function StandardPriceTable({ groups }: StandardPriceTableProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (groups.length === 0) {
    return (
      <div className="py-8 text-center text-[11px] text-slate-400">
        No standard prices yet. Confirm an imported price file to populate this table.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* 系列列表头 */}
      <div className="flex items-center gap-2 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md">
        <span className="w-3.5 shrink-0" />
        <span className="flex-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Series</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-right w-[4.5rem]">Markup%</span>
      </div>
      {groups.map((g) => {
        const isOpen = expanded.has(g.seriesId);
        return (
          <div key={g.seriesId} className="bg-white border border-slate-200 rounded-md overflow-hidden">
            {/* 系列行：Series + Markup%（批量） */}
            <div className="flex items-center gap-2 px-2 py-0.5 bg-slate-50 border-b border-slate-200">
              <button
                type="button"
                onClick={() => toggle(g.seriesId)}
                className="shrink-0 text-slate-500 hover:text-slate-700"
                aria-label={isOpen ? "Collapse" : "Expand"}
              >
                {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              <span
                className="flex-1 text-[11px] font-semibold text-slate-700 truncate"
                title={`${g.brandName} / ${g.seriesName}`}
              >
                {g.brandName} · {g.seriesName}
                <span className="ml-1 text-[10px] font-normal text-slate-400">
                  ({g.items.length})
                </span>
              </span>
              <MarkupInput
                value={null}
                onCommit={async (percent) => {
                  const fd = new FormData();
                  fd.set("seriesId", g.seriesId);
                  fd.set("markupPercent", String(percent));
                  await applySeriesMarkup(fd);
                  router.refresh();
                }}
              />
              <span className="text-[10px] text-slate-400">%</span>
            </div>

            {/* 展开：型号明细 */}
            {isOpen && (
              <div className="overflow-auto max-h-64">
                <table className="w-full min-w-[560px] text-[11px]">
                  <thead className="bg-white text-slate-500 text-[10px] uppercase tracking-wide border-b border-slate-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-0.5 text-left">Model</th>
                      <th className="px-2 py-0.5 text-right">Price</th>
                      <th className="px-2 py-0.5 text-right">Markup</th>
                      <th className="px-2 py-0.5 text-right">Sell Price</th>
                      <th className="px-2 py-0.5 text-right">MOQ</th>
                      <th className="px-2 py-0.5 text-left">Cond.</th>
                      <th className="px-2 py-0.5 text-left">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {g.items.map((r) => (
                      <tr key={r.modelPriceId} className="hover:bg-slate-50">
                        <td className="px-2 py-0.5 text-slate-800" title={`${r.productName} · ${r.model}`}>
                          <span className="block truncate max-w-[120px]">{r.model}</span>
                        </td>
                        <td className="px-2 py-0.5 text-right text-slate-600 tabular-nums whitespace-nowrap">
                          {formatUSDOrNull(r.minConfirmedCost ?? r.costPrice)}
                        </td>
                        <td className="px-2 py-0.5 text-right">
                          <MarkupInput
                            value={r.markup !== null ? Number(r.markup) : null}
                            onCommit={async (percent) => {
                              const fd = new FormData();
                              fd.set("modelPriceId", r.modelPriceId);
                              fd.set("markupPercent", String(percent));
                              await applyModelMarkup(fd);
                              router.refresh();
                            }}
                          />
                        </td>
                        <td className="px-2 py-0.5 text-right text-slate-800 font-semibold tabular-nums whitespace-nowrap">
                          {formatUSDOrNull(r.sellPrice)}
                        </td>
                        <td className="px-2 py-0.5 text-right text-slate-600 tabular-nums">{r.moq}</td>
                        <td className="px-2 py-0.5 text-slate-600">
                          {r.condition ? <span className="block truncate max-w-[80px]" title={r.condition}>{r.condition}</span> : <span className="text-slate-400 italic">-</span>}
                        </td>
                        <td className="px-2 py-0.5 whitespace-nowrap">
                          <span className={`text-[10px] ${
                            (r.leadTime ?? "").toLowerCase().includes("out of stock") ? "text-rose-600"
                            : (r.leadTime ?? "").toLowerCase().includes("in stock") ? "text-green-700"
                            : "text-amber-700"
                          }`}>
                            {formatLeadtime(r.leadTime)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
