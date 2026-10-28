// Batch staged-items table — presentational server component extracted from
// supplier/import-price page.tsx (Phase 15). Pure rendering, no data fetching.

import type { Prisma } from "@/../prisma/generated/client";
import { formatLeadtime } from "@/lib/cart-display";
import { formatUSD } from "@/lib/price";

export type StagedItemRow = Prisma.ImportBatchItemGetPayload<{
  select: {
    itemId: true;
    model: true;
    productName: true;
    sellPrice: true;
    moq: true;
    condition: true;
    leadTime: true;
    seriesId: true;
  };
}>;

export type ItemSeriesInfo = Prisma.SeriesGetPayload<{
  select: { seriesId: true; seriesName: true; brand: { select: { brandName: true } } };
}>;

interface BatchItemsTableProps {
  stagedItems: StagedItemRow[];
  itemSeriesMap: Map<string, ItemSeriesInfo>;
}

export function BatchItemsTable({ stagedItems, itemSeriesMap }: BatchItemsTableProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[26%]" />
            <col className="w-[20ch]" />
            <col className="w-[11%]" />
            <col className="w-[19%]" />
            <col className="w-[13%]" />
          </colgroup>
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
            <tr>
              <th className="px-1.5 py-1 text-left">Series</th>
              <th className="px-1.5 py-1 text-left">Name</th>
              <th className="px-1.5 py-1 text-left">Model</th>
              <th className="px-1.5 py-1 text-right">Price</th>
              <th className="px-1.5 py-1 text-left">Condition</th>
              <th className="px-1.5 py-1 text-left">Leadtime</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stagedItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-6 text-center text-slate-400">
                  No rows in this batch.
                </td>
              </tr>
            ) : (
              stagedItems.map((it) => {
                const series = it.seriesId ? (itemSeriesMap.get(it.seriesId) ?? null) : null;
                // Leadtime 统一文本（空值回退 In Stock）
                const leadtimeText = formatLeadtime(it.leadTime);
                return (
                  <tr key={it.itemId} className="hover:bg-slate-50">
                    <td className="px-1.5 py-1 text-slate-600">
                      {series ? (
                        <span className="block max-w-[110px] truncate" title={`${series.brand?.brandName ?? ""} / ${series.seriesName}`}>
                          {series.brand?.brandName ? `${series.brand.brandName} / ` : ""}{series.seriesName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-1.5 py-1 text-slate-600" title={it.productName}>
                      <span className="block truncate">{it.productName}</span>
                    </td>
                    <td className="px-1.5 py-1 font-medium text-slate-800" title={it.model}>
                      <span className="block truncate">{it.model}</span>
                    </td>
                    <td className="px-1.5 py-1 text-right text-slate-700 tabular-nums">{formatUSD(it.sellPrice)}</td>
                    <td className="px-1.5 py-1 text-slate-600">
                      {it.condition ? <span className="block truncate" title={it.condition}>{it.condition}</span> : <span className="text-slate-400 italic">—</span>}
                    </td>
                    <td className="px-1.5 py-1 text-slate-700 whitespace-nowrap">{leadtimeText}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
