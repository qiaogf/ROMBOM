// Shared upload pipeline helpers for the two import-price API routes
// (admin + supplier). Extracted in Phase 17 — pure moves, zero behavior change.
// Row-level validation intentionally stays in each route (rules differ).

import { prisma } from "@/lib/prisma";
import { parseCsv, parseExcel, resolveHeader } from "@/lib/import-price";

/** 加载启用系列的 名称(小写)/slug → seriesId 映射（逐行 Series 列解析用） */
export async function loadActiveSeriesMap(): Promise<Map<string, string>> {
  const activeSeries = await prisma.series.findMany({
    where: { isActive: true },
    select: { seriesId: true, seriesName: true, slug: true },
  });
  const seriesMap = new Map<string, string>();
  for (const s of activeSeries) {
    if (!seriesMap.has(s.seriesName.toLowerCase())) {
      seriesMap.set(s.seriesName.toLowerCase(), s.seriesId);
    }
    if (!seriesMap.has(s.slug)) {
      seriesMap.set(s.slug, s.seriesId);
    }
  }
  return seriesMap;
}

/**
 * 解析上传文件（.csv / .xlsx / .xls）。
 * 失败时返回 { error }（调用方返回 400）；空文件视为 "File is empty."
 */
export async function parseUploadFile(
  file: File
): Promise<{ fileName: string; rows: string[][] } | { error: string }> {
  const fileName = file.name || "upload.csv";
  const nameLower = fileName.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer()) as Buffer;

  let rows: string[][];
  if (nameLower.endsWith(".csv")) {
    rows = parseCsv(buffer.toString("utf-8"));
  } else if (nameLower.endsWith(".xlsx") || nameLower.endsWith(".xls")) {
    try {
      rows = await parseExcel(buffer);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to parse Excel." };
    }
  } else {
    return { error: "Unsupported file type. Please upload .xlsx, .xls, or .csv." };
  }

  if (rows.length === 0) {
    return { error: "File is empty." };
  }
  return { fileName, rows };
}

export interface HeaderIndex {
  idx: Record<string, number>;
  origHeader: Record<string, string>;
  dupError: string | null;
}

/**
 * 解析表头为 canonical 索引 + 原始表头映射（用于错误定位）。
 * 同一用途被多列命中时返回完整错误消息（会导致整列数据错位）。
 */
export function buildHeaderIndex(rows: string[][]): HeaderIndex {
  const header = rows[0].map(resolveHeader);
  const idx: Record<string, number> = {};
  // canonical → 原始表头文本（用于错误定位）
  const origHeader: Record<string, string> = {};
  header.forEach((h, i) => {
    if (!h) return;
    if (!(h in idx)) origHeader[h] = rows[0][i].trim();
    idx[h] = i;
  });

  // 重复列检测：同一用途被多列命中会导致整列数据错位
  const dupCounts: Record<string, number> = {};
  for (const h of header) { if (h) dupCounts[h] = (dupCounts[h] || 0) + 1; }
  const dupes = Object.entries(dupCounts).filter(([, c]) => c > 1).map(([h]) => h);
  const dupError = dupes.length > 0
    ? `Ambiguous column(s): ${dupes.join(", ")} — more than one column matched these headers. Please check Row 1 of your file: ${rows[0].map((h) => `"${h}"`).join(", ")}.`
    : null;

  return { idx, origHeader, dupError };
}
