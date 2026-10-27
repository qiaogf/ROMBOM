import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSupplierSession } from "@/lib/auth-admin";
import { toDecimal, normalizeLeadtime } from "@/lib/import-price";
import {
  buildHeaderIndex,
  loadActiveSeriesMap,
  parseUploadFile,
} from "@/lib/import-price-upload";
import { slugify } from "@/lib/db/types";

export const dynamic = "force-dynamic";

// 用户要求的列：Series、Model、Unit Price、MOQ、Product Condition、Lead Time
// Unit Price = Cost Price（供应商报价）；Sell Price 初始等于 Cost Price，由管理员 Markup 加价后生成
// 兼容旧模板：productname / costprice / sellprice / unit / description 列可存在（缺 Name 列时 Name 回退取 Model）
// 列名大小写不敏感
// 新模板（与 Admin Price 模板一致）：Brand, Series, Model, Price, Condition, Leadtime
//   - Price → unitprice（canonical 别名已含 "price"）
//   - 无 MOQ 列时默认 1；Leadtime 列经 normalizeLeadtime 归一化为单一 leadTime

export async function POST(request: Request) {
  const session = await getSupplierSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid form data." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { success: false, message: "File is required. (.xlsx / .xls / .csv)" },
      { status: 400 },
    );
  }

  // 系列由 CSV 每行 Series 列指定（名称或 slug，大小写不敏感），必须为系统中已存在的启用系列
  const seriesMap = await loadActiveSeriesMap();

  const parsed = await parseUploadFile(file);
  if ("error" in parsed) {
    return NextResponse.json(
      { success: false, message: parsed.error },
      { status: 400 },
    );
  }
  const { fileName, rows } = parsed;

  // ---- resolve header with aliases + duplicate column detection ----
  const { idx, origHeader, dupError } = buildHeaderIndex(rows);
  if (dupError) {
    return NextResponse.json(
      { success: false, message: dupError },
      { status: 400 },
    );
  }

  // 新模板仅要求 Series/Model/Price；MOQ 缺省 1，Leadtime 列归一化写入
  const REQUIRED = ["series", "model", "unitprice"];

  const missing = REQUIRED.filter((c) => !(c in idx));
  if (missing.length > 0) {
    return NextResponse.json(
      {
        success: false,
        message: `Missing required column(s): ${missing.join(", ")}. Required: Series, Model, Price. Recognized headers from your file: ${rows[0].map((h) => `"${h}"`).join(", ")}.`,
      },
      { status: 400 },
    );
  }

  // 创建导入批次 — approvalStatus=pending，仅写暂存表，待管理员确认后才上线
  // batch.seriesId 取第一行成功解析的 Series；确认上线时以每行 item.seriesId 为准
  const batch = await prisma.importBatch.create({
    data: {
      fileName,
      sourceType: "supplier",
      batchType: "price",
      supplierId: session.supplierId,
      approvalStatus: "pending",
      recordCount: 0,
      errorCount: 0,
    },
    select: { importBatchId: true },
  });

  const dataRows = rows.slice(1).filter((r) => r.some((c) => c.trim() !== ""));
  const errors: string[] = [];
  let successCount = 0;
  let failureCount = 0;
  const seenSlugs = new Set<string>();
  let firstSeriesId: string | null = null;

  for (let r = 0; r < dataRows.length; r++) {
    const row = dataRows[r];
    const rowNum = r + 2;

    const seriesStr = (row[idx["series"]] ?? "").trim();
    const productName = (row[idx["productname"]] ?? "").trim();
    const model = (row[idx["model"]] ?? "").trim();
    const condition = (row[idx["condition"]] ?? "").trim() || null;
    const costPriceStr = (row[idx["costprice"]] ?? "").trim() || (row[idx["unitprice"]] ?? "").trim();
    const sellPriceStr = (row[idx["sellprice"]] ?? "").trim() || costPriceStr;
    const markupStr = (row[idx["markup"]] ?? "").trim();
    const moqStr = (row[idx["moq"]] ?? "").trim();
    // Leadtime 归一化为单一字段：空 → "In Stock"；缺货/现货关键词 → 标准文案；否则保留原文
    const leadTime = normalizeLeadtime(row[idx["leadtime"]]);
    const unit = (row[idx["unit"]] ?? "").trim() || "pcs";
    const description = (row[idx["description"]] ?? "").trim() || null;
    const origin = (row[idx["origin"]] ?? "").trim() || null;
    const certification = (row[idx["certification"]] ?? "").trim() || null;
    // 新增物理属性 / 资源链接字段（可选；Decimal 字段解析后单独校验）
    const lengthRaw = (row[idx["length"]] ?? "").trim();
    const widthRaw = (row[idx["width"]] ?? "").trim();
    const heightRaw = (row[idx["height"]] ?? "").trim();
    const diameterRaw = (row[idx["diameter"]] ?? "").trim();
    const dimensionUnit = (row[idx["dimensionunit"]] ?? "").trim() || null;
    const weightRaw = (row[idx["weight"]] ?? "").trim();
    const packingWeightRaw = (row[idx["packingweight"]] ?? "").trim();
    const weightUnit = (row[idx["weightunit"]] ?? "").trim() || null;
    const batteryAttributes = (row[idx["batteryattributes"]] ?? "").trim() || null;
    const datasheetLink = (row[idx["datasheetlink"]] ?? "").trim() || null;
    const brandName = (row[idx["brandname"]] ?? "").trim() || null;
    const length = lengthRaw ? toDecimal(lengthRaw) : null;
    const width = widthRaw ? toDecimal(widthRaw) : null;
    const height = heightRaw ? toDecimal(heightRaw) : null;
    const diameter = diameterRaw ? toDecimal(diameterRaw) : null;
    const weight = weightRaw ? toDecimal(weightRaw) : null;
    const packingWeight = packingWeightRaw ? toDecimal(packingWeightRaw) : null;

    try {
      if (!seriesStr) {
        throw new Error('Column "Series" is empty. Each row must specify an existing series name.');
      }
      const seriesKey = seriesStr.toLowerCase().replace(/\s+/g, " ").trim();
      const rowSeriesId = seriesMap.get(seriesKey);
      if (!rowSeriesId) {
        throw new Error(`Series "${seriesStr}" not found in the system. Please use "Brand Series" (e.g. Siemens S7-1200), a series name, or a slug.`);
      }
      if (!model) {
        throw new Error("Model is required.");
      }
      const effectiveProductName = productName || model; // 新模板无 Name 列，Name 回退为 Model
      const sellPrice = toDecimal(sellPriceStr);
      const costPrice = toDecimal(costPriceStr);
      const markup = markupStr ? toDecimal(markupStr) : null;
      const moq = parseInt(moqStr || "1", 10);
      if (costPrice === null || costPrice < 0) {
        throw new Error(`Column "${origHeader["costprice"] ?? origHeader["unitprice"] ?? "Unit Price"}" contains "${costPriceStr}" which is not a valid number. Please check the header row (Row 1) and column order.`);
      }
      if (sellPrice === null || sellPrice < 0) {
        throw new Error(`Column "${origHeader["sellprice"] ?? "Sell Price"}" contains "${sellPriceStr}" which is not a valid number. Please check the header row (Row 1) and column order.`);
      }
      if (markupStr && markup === null) {
        throw new Error(`Column "${origHeader["markup"] ?? "Markup (%)"}" contains "${markupStr}" which is not a valid number.`);
      }
      if (Number.isNaN(moq) || moq < 1) {
        throw new Error(`Column "${origHeader["moq"] ?? "MOQ"}" contains "${moqStr}" which is not a valid quantity.`);
      }
      // 校验物理属性 Decimal 字段：填了非数字 → 报错
      const numChecks: Array<[string, string, number | null]> = [
        [origHeader["length"] ?? "Length", lengthRaw, length],
        [origHeader["width"] ?? "Width", widthRaw, width],
        [origHeader["height"] ?? "Height", heightRaw, height],
        [origHeader["diameter"] ?? "Diameter", diameterRaw, diameter],
        [origHeader["weight"] ?? "Weight", weightRaw, weight],
        [origHeader["packingweight"] ?? "Packing Weight", packingWeightRaw, packingWeight],
      ];
      const badNum = numChecks.find(([, raw, parsed]) => raw && parsed === null);
      if (badNum) {
        const [header, raw] = badNum;
        throw new Error(`Column "${header}" contains "${raw}" which is not a valid number. Please fix the value or check the header row (Row 1).`);
      }
      const modelSlug = slugify(model);
      if (!modelSlug) throw new Error(`Could not derive slug from model: ${model}`);

      // 同一批次内 slug 唯一（@@unique([importBatchId, slug])）
      if (seenSlugs.has(modelSlug)) {
        throw new Error(`Duplicate model "${model}" within the same file — slug "${modelSlug}" already staged.`);
      }

      // 仅写入 ImportBatchItem 暂存表，不直接写 ModelPrice/Product/SupplierQuote
      await prisma.importBatchItem.create({
        data: {
          importBatchId: batch.importBatchId,
          rowNumber: rowNum,
          seriesId: rowSeriesId,
          productName: effectiveProductName,
          model,
          slug: modelSlug,
          description,
          origin,
          certification,
          length,
          width,
          height,
          diameter,
          dimensionUnit,
          weight,
          packingWeight,
          weightUnit,
          batteryAttributes,
          datasheetLink,
          brandName,
          unit,
          costPrice,
          sellPrice,
          markup,
          moq,
          condition,
          leadTime,
        },
      });
      if (firstSeriesId === null) firstSeriesId = rowSeriesId;
      seenSlugs.add(modelSlug);
      successCount++;
    } catch (err) {
      failureCount++;
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Row ${rowNum} (model=${model || "?"}): ${msg}`);
    }
  }

  // 更新批次统计与文件归属系列（取第一行成功解析的 Series）
  await prisma.importBatch.update({
    where: { importBatchId: batch.importBatchId },
    data: { recordCount: successCount, errorCount: failureCount, seriesId: firstSeriesId },
  });

  // 同一供应商上传同名价格文件仅保留最新批次：删除更早批次。
  // 暂存行随批次级联删除；已上线 ModelPrice/Product 外键为 ON DELETE SET NULL，线上数据不丢，
  // 待新批次确认后按 slug 重新关联。
  await prisma.importBatch.deleteMany({
    where: {
      fileName,
      batchType: "price",
      supplierId: session.supplierId,
      importBatchId: { not: batch.importBatchId },
    },
  });

  return NextResponse.json({
    success: true,
    successCount,
    failureCount,
    errors,
    headerMapping: origHeader,
    message: "File staged successfully. An admin must confirm this batch before prices go live.",
  });
}
