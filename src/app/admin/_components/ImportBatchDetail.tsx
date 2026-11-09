import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import type { Prisma } from "@/../prisma/generated/client";
import { SelfOrderToggle } from "./SelfOrderToggle";

export interface BatchDetailItem {
  importBatchId: string;
  fileName: string;
  sourceType: string;
  importedAt: Date;
  recordCount: number;
  errorCount: number;
  seriesId: string | null;
  approvalStatus: string;
  /** 文件级 Self 主开关：true = 本文件全部型号可自助下单 */
  selfOrderAll: boolean;
  approvedAt: Date | null;
  series: { seriesName: string; brand: { brandName: string } | null } | null;
  uploaderEmail: string | null;
  approvedByEmail: string | null;
}

/** 行级系列（CSV 每行 Series 列解析），与批次级 series 独立 */
export interface BatchRowSeries {
  seriesName: string;
  brand: { brandName: string } | null;
}

export interface BatchItemRow {
  itemId: string;
  productName: string;
  model: string;
  description: string | null;
  origin: string | null;
  certification: string | null;
  length: Prisma.Decimal | null;
  width: Prisma.Decimal | null;
  height: Prisma.Decimal | null;
  diameter: Prisma.Decimal | null;
  dimensionUnit: string | null;
  weight: Prisma.Decimal | null;
  packingWeight: Prisma.Decimal | null;
  weightUnit: string | null;
  batteryAttributes: string | null;
  datasheetLink: string | null;
  brandName: string | null;
  series: BatchRowSeries | null;
  /** 行级 Self：true = 该型号可自助下单 */
  selfOrder: boolean;
}

export interface BatchModelPrice {
  modelPriceId: string;
  productName: string;
  model: string;
  description: string | null;
  origin: string | null;
  certification: string | null;
  length: Prisma.Decimal | null;
  width: Prisma.Decimal | null;
  height: Prisma.Decimal | null;
  diameter: Prisma.Decimal | null;
  dimensionUnit: string | null;
  weight: Prisma.Decimal | null;
  packingWeight: Prisma.Decimal | null;
  weightUnit: string | null;
  batteryAttributes: string | null;
  datasheetLink: string | null;
  brandName: string | null;
  series: BatchRowSeries | null;
  /** 行级 Self：true = 该型号可自助下单 */
  selfOrder: boolean;
}

interface ImportBatchDetailProps {
  batch: BatchDetailItem;
  /** pending 状态下读取的暂存行；approved 状态下为空数组 */
  items: BatchItemRow[];
  /** approved 状态下读取的线上价格行；pending 状态下为空数组 */
  modelPrices: BatchModelPrice[];
  backHref: string;
}

// 非货币 Decimal 显示（长度/重量等物理属性，去掉无意义尾零）
function formatNumber(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (Number.isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(num);
}

// 字符串字段空值显示
function formatText(value: string | null): ReactNode {
  if (!value) return <span className="text-slate-400 italic">—</span>;
  return value;
}

// Datasheet Link 显示为可点击链接
function formatLink(value: string | null): ReactNode {
  if (!value) return <span className="text-slate-400 italic">—</span>;
  const href = value.startsWith("http") ? value : `https://${value}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:text-blue-800 underline truncate inline-block max-w-[140px]"
      title={value}
    >
      {value}
    </a>
  );
}

// 表头：18 列模板字段（Self 紧随 Model No. 之后）
const TABLE_HEADERS = [
  "Brand",
  "Series",
  "Product",
  "Model No.",
  "Self",
  "Description",
  "Origin",
  "Certifications",
  "Length",
  "Width",
  "Height",
  "Diameter",
  "Dim. Unit",
  "Weight",
  "Pack. Weight",
  "Wt. Unit",
  "Battery Attr.",
  "Datasheet",
] as const;

export function ImportBatchDetail({ batch, items, modelPrices, backHref }: ImportBatchDetailProps) {
  const isPending = batch.approvalStatus === "pending";

  // 渲染一行 18 列数据（Series 取行级系列；Brand 列为 CSV 行内 brandName）
  function renderRowCells(row: BatchItemRow | BatchModelPrice): ReactNode {
    const isStaged = "itemId" in row;
    return (
      <>
        <td className="px-1.5 py-1 text-slate-600 text-[11px]">{formatText(row.brandName)}</td>
        <td className="px-1.5 py-1 text-slate-600 text-[11px] whitespace-nowrap">
          {row.series ? (
            <span className="font-medium text-slate-700">{row.series.seriesName}</span>
          ) : (
            <span className="text-slate-400 italic">—</span>
          )}
        </td>
        <td className="px-1.5 py-1 text-slate-600 text-[11px]">{formatText(row.productName)}</td>
        <td className="px-1.5 py-1 text-slate-700 text-[11px] whitespace-nowrap">{row.model}</td>
        <td className="px-1.5 py-1">
          <SelfOrderToggle
            scope="row"
            importBatchId={batch.importBatchId}
            itemId={isStaged ? row.itemId : undefined}
            modelPriceId={isStaged ? undefined : row.modelPriceId}
            active={batch.selfOrderAll || row.selfOrder}
            disabled={batch.selfOrderAll}
          />
        </td>
        <td className="px-1.5 py-1 text-slate-600 text-[11px] max-w-[180px]">
          <span className="block truncate" title={row.description ?? undefined}>{formatText(row.description)}</span>
        </td>
        <td className="px-1.5 py-1 text-slate-600 text-[11px]">{formatText(row.origin)}</td>
        <td className="px-1.5 py-1 text-slate-600 text-[11px]">{formatText(row.certification)}</td>
        <td className="px-1.5 py-1 text-left text-slate-600 tabular-nums text-[11px]">{formatNumber(row.length)}</td>
        <td className="px-1.5 py-1 text-left text-slate-600 tabular-nums text-[11px]">{formatNumber(row.width)}</td>
        <td className="px-1.5 py-1 text-left text-slate-600 tabular-nums text-[11px]">{formatNumber(row.height)}</td>
        <td className="px-1.5 py-1 text-left text-slate-600 tabular-nums text-[11px]">{formatNumber(row.diameter)}</td>
        <td className="px-1.5 py-1 text-slate-600 text-[11px]">{formatText(row.dimensionUnit)}</td>
        <td className="px-1.5 py-1 text-left text-slate-600 tabular-nums text-[11px]">{formatNumber(row.weight)}</td>
        <td className="px-1.5 py-1 text-left text-slate-600 tabular-nums text-[11px]">{formatNumber(row.packingWeight)}</td>
        <td className="px-1.5 py-1 text-slate-600 text-[11px]">{formatText(row.weightUnit)}</td>
        <td className="px-1.5 py-1 text-slate-600 text-[11px]">{formatText(row.batteryAttributes)}</td>
        <td className="px-1.5 py-1 text-slate-600 text-[11px]">{formatLink(row.datasheetLink)}</td>
      </>
    );
  }

  return (
    <div className="space-y-3">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to files
      </Link>
      {/* 标题行：左侧文件名 / 中间文件级 Self 开关（对本文件全部型号生效） */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <h1 className="text-base font-semibold text-slate-900 flex items-center gap-1.5 min-w-0">
          <Trash2 className="w-4 h-4 text-slate-300 shrink-0" />
          <span className="truncate">{batch.fileName}</span>
        </h1>
        <div className="justify-self-center">
          <SelfOrderToggle
            scope="batch"
            importBatchId={batch.importBatchId}
            active={batch.selfOrderAll}
          />
        </div>
        <div />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-[11px]">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
              <tr>
                {TABLE_HEADERS.map((h) => (
                  <th key={h} className="px-1.5 py-1 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isPending ? (
                items.length === 0 ? (
                  <tr>
                    <td colSpan={TABLE_HEADERS.length} className="px-3 py-6 text-center text-slate-400">
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
                  <td colSpan={TABLE_HEADERS.length} className="px-3 py-6 text-center text-slate-400">
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
