"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import type { Prisma } from "@/../prisma/generated/client";
import { applyBatchMarkup, applyItemMarkup, applyModelMarkup } from "@/app/actions/adminActions";
import { formatLeadtime } from "@/lib/cart-display";
import { formatUSDSafe } from "@/lib/format";

export interface PriceBatchDetailItem {
  importBatchId: string;
  fileName: string;
  sourceType: string;
  importedAt: Date;
  recordCount: number;
  errorCount: number;
  seriesId: string | null;
  approvalStatus: string;
  approvedAt: Date | null;
  series: { seriesName: string; brand: { brandName: string } | null } | null;
  uploaderEmail: string | null;
  approvedByEmail: string | null;
}

export interface PriceItemRow {
  itemId: string;
  slug: string;
  model: string;
  costPrice: Prisma.Decimal;
  sellPrice: Prisma.Decimal;
  markup: Prisma.Decimal | null;
  moq: number;
  condition: string | null;
  leadTime: string | null;
  series: { seriesName: string; brand: { brandName: string } | null } | null;
}

export interface PriceModelPrice {
  modelPriceId: string;
  model: string;
  costPrice: Prisma.Decimal;
  sellPrice: Prisma.Decimal;
  markup: Prisma.Decimal | null;
  moq: number;
  condition: string | null;
  leadTime: string | null;
  series: { seriesName: string; brand: { brandName: string } | null } | null;
}

interface PriceBatchDetailProps {
  batch: PriceBatchDetailItem;
  items: PriceItemRow[];
  modelPrices: PriceModelPrice[];
}

/** Leadtime 徽标：按文本判断颜色（缺货红 / 现货绿 / 交期琥珀） */
function StockBadge({ leadTime }: { leadTime: string | null }) {
  const t = (leadTime ?? "").toLowerCase();
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] rounded ${
        t.includes("out of stock")
          ? "bg-rose-50 text-rose-700"
          : t.includes("in stock")
            ? "bg-emerald-50 text-emerald-700"
            : "bg-amber-50 text-amber-700"
      }`}
    >
      {formatLeadtime(leadTime)}
    </span>
  );
}

/**
 * 安全取数：Prisma.Decimal 经 RSC 序列化后可能退化为 {s,e,d} 平面对象（原型丢失，
 * Number() 会得 NaN）。兼容 数字 / 字符串 / 真Decimal / 序列化退化对象 四种形态。
 */
function decimalToNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return Number.isNaN(n) ? 0 : n;
  }
  if (value && typeof value === "object") {
    const obj = value as { s?: number; e?: number; d?: number[] };
    if (Array.isArray(obj.d) && typeof obj.e === "number") {
      const sign = obj.s === -1 ? -1 : 1;
      const digits = obj.d.join("");
      return sign * Number(digits) * Math.pow(10, obj.e - (obj.d.length - 1));
    }
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** 行级 Markup 显示值：null → 空串（占位符 0），否则输出数值字符串 */
function markupDisplay(markup: Prisma.Decimal | null): string {
  return markup !== null ? String(decimalToNumber(markup)) : "";
}

const PRICE_HEADERS = [
  "Model",
  "UnitPrice",
  "Markup %",
  "ListPrice",
  "Condition",
  "Leadtime",
] as const;

export function PriceBatchDetail({ batch, items, modelPrices }: PriceBatchDetailProps) {
  const isPending = batch.approvalStatus === "pending";
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [batchMarkup, setBatchMarkup] = useState("");
  const [rowDrafts, setRowDrafts] = useState<Record<string, string>>({});

  const keyOf = (row: PriceItemRow | PriceModelPrice) =>
    isPending ? (row as PriceItemRow).itemId : (row as PriceModelPrice).modelPriceId;

  function effectiveMarkup(row: PriceItemRow | PriceModelPrice): number {
    const draft = rowDrafts[keyOf(row)];
    if (draft !== undefined && draft.trim() !== "") {
      const n = Number(draft);
      if (Number.isFinite(n) && n >= 0 && n <= 1000) return n;
    }
    return row.markup !== null ? decimalToNumber(row.markup) : 0;
  }

  // ListPrice 实时预览 = UnitPrice(costPrice) × (1 + markup / 100)
  function listPriceOf(row: PriceItemRow | PriceModelPrice): number {
    return decimalToNumber(row.costPrice) * (1 + effectiveMarkup(row) / 100);
  }

  function commitRowMarkup(row: PriceItemRow | PriceModelPrice) {
    const key = keyOf(row);
    const draft = rowDrafts[key]?.trim() ?? "";
    // 空值按 0 提交；越界（<0 或 >1000）回滚到草稿原值
    const percent = draft === "" ? 0 : Number(draft);
    if (!Number.isFinite(percent) || percent < 0 || percent > 1000) {
      setRowDrafts((prev) => ({ ...prev, [key]: markupDisplay(row.markup) }));
      return;
    }
    startSaving(async () => {
      const fd = new FormData();
      if (isPending) fd.set("itemId", (row as PriceItemRow).itemId);
      else fd.set("modelPriceId", (row as PriceModelPrice).modelPriceId);
      fd.set("markupPercent", String(percent));
      const res = isPending ? await applyItemMarkup(fd) : await applyModelMarkup(fd);
      if (res.success) router.refresh();
    });
  }

  function commitBatchMarkup() {
    const draft = batchMarkup.trim();
    // 整批空值失焦不提交（避免意外清零全清单）
    if (draft === "") return;
    const percent = Number(draft);
    if (!Number.isFinite(percent) || percent < 0 || percent > 1000) {
      setBatchMarkup("");
      return;
    }
    startSaving(async () => {
      const fd = new FormData();
      fd.set("importBatchId", batch.importBatchId);
      fd.set("markupPercent", String(percent));
      const res = await applyBatchMarkup(fd);
      if (res.success) {
        setBatchMarkup("");
        router.refresh();
      }
    });
  }

  // 表体 6 个 td 与 PRICE_HEADERS 严格一一对应
  function renderRowCells(row: PriceItemRow | PriceModelPrice): ReactNode {
    const key = keyOf(row);
    return (
      <>
        <td className="px-1.5 py-1 text-slate-700 text-[11px] font-medium">{row.model}</td>
        <td className="px-1.5 py-1 text-left text-slate-700 tabular-nums text-[11px]">
          {formatUSDSafe(decimalToNumber(row.costPrice))}
        </td>
        <td className="px-1.5 py-1">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={1000}
            step={0.1}
            value={rowDrafts[key] ?? markupDisplay(row.markup)}
            onChange={(e) => setRowDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
            onBlur={() => commitRowMarkup(row)}
            disabled={saving}
            className="w-16 px-1 py-0.5 text-right text-[11px] tabular-nums border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
            placeholder="0"
          />
        </td>
        <td className="px-1.5 py-1 text-left text-slate-900 tabular-nums text-[11px] font-semibold">
          {formatUSDSafe(listPriceOf(row))}
        </td>
        <td className="px-1.5 py-1 text-slate-600 text-[11px]">
          {row.condition ?? <span className="text-slate-400 italic">—</span>}
        </td>
        {/* Leadtime 统一文本（空值回退 In Stock） */}
        <td className="px-1.5 py-1 text-slate-600 text-[11px] whitespace-nowrap">
          <StockBadge leadTime={row.leadTime} />
        </td>
      </>
    );
  }

  return (
    <div className="space-y-3">
      <a
        href="/admin/model-price"
        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to files
      </a>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900 flex items-center gap-1.5">
            <Trash2 className="w-4 h-4 text-slate-300" />
            {batch.fileName}
          </h1>
        </div>
        {/* 清单整体 Markup %：失焦提交 applyBatchMarkup（服务端按每行 costPrice 重算 sellPrice） */}
        <div className="flex items-center gap-2">
          <label htmlFor="batch-markup" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Markup %
          </label>
          <input
            id="batch-markup"
            type="number"
            inputMode="decimal"
            min={0}
            max={1000}
            step={0.1}
            value={batchMarkup}
            onChange={(e) => setBatchMarkup(e.target.value)}
            onBlur={commitBatchMarkup}
            disabled={saving}
            className="w-20 px-1.5 py-1 text-right text-[11px] tabular-nums border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
            placeholder="0"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-[11px]">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
              <tr>
                {PRICE_HEADERS.map((h) => (
                  <th key={h} className="px-1.5 py-1 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isPending ? (
                items.length === 0 ? (
                  <tr>
                    <td colSpan={PRICE_HEADERS.length} className="px-4 py-8 text-center text-slate-400">
                      No staged rows in this file.
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={it.itemId} className="hover:bg-slate-50">
                      {renderRowCells(it)}
                    </tr>
                  ))
                )
              ) : modelPrices.length === 0 ? (
                <tr>
                  <td colSpan={PRICE_HEADERS.length} className="px-4 py-8 text-center text-slate-400">
                    No model prices in this file.
                  </td>
                </tr>
              ) : (
                modelPrices.map((mp) => (
                  <tr key={mp.modelPriceId} className="hover:bg-slate-50">
                    {renderRowCells(mp)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
