﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { type ReactNode } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import type { Prisma } from "@/../prisma/generated/client";
import { BatchActionButtons } from "./BatchActionButtons";
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
  stockStatus: string;
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
  stockStatus: string;
  leadTime: string | null;
  series: { seriesName: string; brand: { brandName: string } | null } | null;
}

interface PriceBatchDetailProps {
  batch: PriceBatchDetailItem;
  items: PriceItemRow[];
  modelPrices: PriceModelPrice[];
}

function StockBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] rounded capitalize ${
        status === "in_stock"
          ? "bg-emerald-50 text-emerald-700"
          : status === "lead_time"
            ? "bg-amber-50 text-amber-700"
            : "bg-rose-50 text-rose-700"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

// 6 列价格表头（已移除 Markup %、Sell Price、Lead Time）
const PRICE_HEADERS = [
  "Series",
  "Model",
  "Price",
  "MOQ",
  "Cond.",
  "Stock",
] as const;

export function PriceBatchDetail({ batch, items, modelPrices }: PriceBatchDetailProps) {
  const isPending = batch.approvalStatus === "pending";

  function renderRowCells(row: PriceItemRow | PriceModelPrice): ReactNode {
    const rowSeries = row.series;
    return (
      <>
        <td className="px-1.5 py-1 text-slate-600 text-[11px] whitespace-nowrap">
          {rowSeries ? (
            <>
              {rowSeries.brand?.brandName ? (
                <span className="text-slate-400">{rowSeries.brand.brandName} / </span>
              ) : null}
              <span className="font-medium text-slate-700">{rowSeries.seriesName}</span>
            </>
          ) : (
            <span className="text-slate-400 italic">—</span>
          )}
        </td>
        <td className="px-1.5 py-1 text-slate-700 text-[11px]">{row.model}</td>
        <td className="px-1.5 py-1 text-right text-slate-700 tabular-nums text-[11px]">{formatUSDSafe(row.costPrice)}</td>
        <td className="px-1.5 py-1 text-right text-slate-600 tabular-nums text-[11px]">{row.moq}</td>
        <td className="px-1.5 py-1 text-slate-600 text-[11px]">
          {row.condition ?? <span className="text-slate-400 italic">—</span>}
        </td>
        <td className="px-1.5 py-1"><StockBadge status={row.stockStatus} /></td>
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
        <BatchActionButtons
          importBatchId={batch.importBatchId}
          fileName={batch.fileName}
          approvalStatus={isPending ? "pending" : "approved"}
        />
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
