import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth-admin";
import {
  toDecimal,
  normalizeLeadtime,
  validateFieldLengths,
  GENERIC_BRAND_NAME,
  OTHERS_SERIES_NAME,
  isSpecialCategoryName,
} from "@/lib/import-price";
import {
  buildHeaderIndex,
  loadActiveSeriesMap,
  normNavKey,
  normCategoryKey,
  parseUploadFile,
} from "@/lib/import-price-upload";
import { slugify } from "@/lib/db/types";

export const dynamic = "force-dynamic";

function toInt(value: string | undefined, fallback = 1): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

type RowError = { row: number; message: string };

export async function POST(request: Request) {
  // 1. Admin auth
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse multipart/form-data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, message: "File is required (field: file). Accepts .xlsx / .xls / .csv" }, { status: 400 });
  }

  // 2.1 系列可选：表单可选预选系列；未选时从 CSV Series 列逐行解析
  const seriesId = (formData.get("seriesId") ?? "").toString().trim();
  let targetSeries: { seriesId: string; seriesName: string; slug: string; isActive: boolean; brand: { brandId: string; brandName: string; supplierId: string | null } | null } | null = null;
  if (seriesId) {
    targetSeries = await prisma.series.findUnique({
      where: { seriesId },
      include: { brand: { select: { brandId: true, brandName: true, supplierId: true } } },
    });
    if (!targetSeries || !targetSeries.isActive) {
      return NextResponse.json(
        { success: false, message: "Selected series does not exist. Please refresh the page and choose a valid series." },
        { status: 400 },
      );
    }
  }

  // 2.2 批次类型：product_info（产品属性 17 列）| price（价格 9 列）
  const batchTypeRaw = (formData.get("batchType") ?? "product_info").toString().trim().toLowerCase();
  const batchType: "product_info" | "price" = batchTypeRaw === "price" ? "price" : "product_info";

  // 系列解析映射：CSV 若带 Series 列则逐行解析（名称/slug，大小写不敏感），否则回退到表单所选系列
  // Category 解析映射：Category 列必填且仅允许系统已有启用品类（名称/slug，大小写+空格不敏感）
  const [seriesMap, navCategories] = await Promise.all([
    loadActiveSeriesMap(),
    prisma.category.findMany({
      where: { isActive: true },
      select: { categoryId: true, categoryName: true, slug: true },
    }),
  ]);
  const categoryMap = new Map<string, string>();
  // 归一化品类名 → 原名（规范化回填用）
  const categoryNamesByKey = new Map<string, string>();
  for (const c of navCategories) {
    // 品类键忽略 <>()（）：CSV 写 "Discontinued" 也能匹配导航里的 "<Discontinued>"
    if (!categoryMap.has(normCategoryKey(c.categoryName))) categoryMap.set(normCategoryKey(c.categoryName), c.categoryId);
    if (c.slug && !categoryMap.has(c.slug)) categoryMap.set(c.slug, c.categoryId);
    categoryNamesByKey.set(normCategoryKey(c.categoryName), c.categoryName);
  }

  const parsed = await parseUploadFile(file);
  if ("error" in parsed) {
    return NextResponse.json({ success: false, message: parsed.error }, { status: 400 });
  }
  const { fileName, rows } = parsed;

  // 3. Resolve header with aliases + duplicate column detection
  const { idx, origHeader, dupError } = buildHeaderIndex(rows);
  if (dupError) {
    return NextResponse.json({ success: false, message: dupError }, { status: 400 });
  }

  // 管理者导入：必需列为 名称 + 型号 + 品类（产品描述等可选）
  // price 批次必填：Category + Model + Unit Price（成本价，Cost Price 或 Unit Price 列均可）；product_info 批次必填：Category + Name + Model
  const REQUIRED = batchType === "price"
    ? ["category", "model"]
    : ["category", "productname", "model"];
  const missing = REQUIRED.filter((c) => !(c in idx));
  if (batchType === "price" && !("costprice" in idx) && !("unitprice" in idx)) {
    missing.push("unitprice");
  }
  if (missing.length > 0) {
    const hint = batchType === "price"
      ? "Required: Category, Model, Price. Optional: Series (existing series name, or a new one to be created on confirm), Brand (optional — rows with a Series but no Brand are auto-assigned to the existing Generic brand), Condition, Lead Time (In stock / Out of stock / lead-time text such as 3-5 days), Markup, Sell Price, MOQ, Stock Status. Category must already exist in the Category navigation; new Brand/Series names are auto-created on confirm. Name lengths: Brand/Series/Product ≤ 15 chars, Description ≤ 150 chars. Legacy headers (Unit Price, Product Condition) are also accepted."
      : "Required: Category, Name, Model. Optional: Series (existing or new), Brand (optional — a Series without Brand is auto-assigned to the existing Generic brand; Brand without Series lists all models under the brand), Description, Origin, Certifications, Length, Width, Height, Diameter, Dimension Unit, Weight, Packing Weight, Weight Unit, Battery Attributes, Datasheet Link, Unit Price, MOQ, Unit, Stock Status, Lead Time, Cost Price, Product Condition. Category must already exist in the Category navigation; new Brand/Series names are auto-created on confirm. Name lengths: Brand/Series/Product ≤ 15 chars, Description ≤ 150 chars.";
    return NextResponse.json({
      success: false,
      message: `Missing required column(s): ${missing.join(", ")}. ${hint} Recognized headers from your file: ${rows[0].map((h) => `"${h}"`).join(", ")}.`,
    }, { status: 400 });
  }

  // 4. 创建导入批次 — approvalStatus=pending，仅写暂存表，待管理员确认后才上线
  const batch = await prisma.importBatch.create({
    data: {
      fileName,
      sourceType: "admin",
      batchType,
      adminId: session.adminId,
      seriesId: targetSeries?.seriesId ?? null,
      approvalStatus: "pending",
      recordCount: 0,
      errorCount: 0,
    },
    select: { importBatchId: true },
  });

  // 5. Process rows — 仅写入 ImportBatchItem 暂存表，不直接写 ModelPrice/Product/SupplierQuote
  const errors: RowError[] = [];
  let successCount = 0;
  let failureCount = 0;
  const seenSlugs = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rowNumber = r + 1;

    if (row.length === 0 || (row.length === 1 && row[0].trim() === "")) continue;

    const productName = (row[idx["productname"]] ?? "").trim();
    const model = (row[idx["model"]] ?? "").trim();
    const description = (row[idx["description"]] ?? "").trim() || null;
    const origin = (row[idx["origin"]] ?? "").trim() || null;
    const certification = (row[idx["certification"]] ?? "").trim() || null;
    const seriesStr = (row[idx["series"]] ?? "").trim();
    const condition = (row[idx["condition"]] ?? "").trim() || null;
    const costPriceRaw = (row[idx["costprice"]] ?? "").trim() || (row[idx["unitprice"]] ?? "").trim();
    // Sell Price 可选：缺省时回退为 Unit Price（成本价），管理员可在批次详情用 Markup (%) 加价生成售价
    const sellPriceRaw = (row[idx["sellprice"]] ?? "").trim() || costPriceRaw;
    const markupRaw = (row[idx["markup"]] ?? "").trim();
    const moqRaw = (row[idx["moq"]] ?? "").trim();
    const unit = (row[idx["unit"]] ?? "").trim() || "PCS";
    // Leadtime 归一化为单一字段：空 → "In Stock"；缺货/现货关键词 → 标准文案；否则保留原文
    const leadTime = normalizeLeadtime(row[idx["leadtime"]]);
    // 新增物理属性 / 资源链接字段（全部可选；Decimal 字段用 toDecimal，String 字段 trim||null）
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
    let rowBrandName = (row[idx["brandname"]] ?? "").trim() || null;
    const categoryStr = (row[idx["category"]] ?? "").trim() || null;
    const length = lengthRaw ? toDecimal(lengthRaw) : null;
    const width = widthRaw ? toDecimal(widthRaw) : null;
    const height = heightRaw ? toDecimal(heightRaw) : null;
    const diameter = diameterRaw ? toDecimal(diameterRaw) : null;
    const weight = weightRaw ? toDecimal(weightRaw) : null;
    const packingWeight = packingWeightRaw ? toDecimal(packingWeightRaw) : null;

    // price 批次 productName 可选（留空时用 model 占位）；product_info 批次 productName 必填
    const finalProductName = batchType === "price"
      ? (productName || model)
      : productName;
    if (!finalProductName || !model) {
      failureCount++;
      errors.push({ row: rowNumber, message: batchType === "price" ? "Missing required field (model)" : "Missing required field (name or model)" });
      continue;
    }

    // Category 列必填：必须是导航内已存在类目（大小写/空格不敏感），空值/不存在都无法上线
    if (!categoryStr) {
      failureCount++;
      errors.push({ row: rowNumber, message: "Category is required. Use an existing category name from the Category navigation." });
      continue;
    }
    if (!categoryMap.has(normCategoryKey(categoryStr))) {
      failureCount++;
      errors.push({ row: rowNumber, message: `Category "${categoryStr}" not found in the system. Please use an existing category name from the Category navigation.` });
      continue;
    }
    // 统一规范化为导航原名（如 " p l c " → "PLC"），保证暂存数据与导航一致
    const effectiveCategory = categoryNamesByKey.get(normCategoryKey(categoryStr)) ?? categoryStr;
    const specialCategory = isSpecialCategoryName(effectiveCategory);

    // 两种类目的分支规则：
    // 特殊类目（导航名含 <>/( )）：
    //   - Series 列一律忽略（有值/空值都不导入、不建系列），行统一归到「该品牌在本类目的固定系列」（系列名 = 品牌名）
    //   - 无 Brand → Generic + (Others)，页面末尾统一展示
    // 普通类目：
    //   - Series 必填；已存在系列直接归属，不存在则暂存新建
    //   - Series 有值 + Brand 空 → 自动填充已有 Generic 品牌
    let rowSeriesId: string | null = null;
    let stagedSeriesName: string | null = null;
    if (specialCategory) {
      // 特殊类目：Series 列一律忽略，不暂存系列；只按品牌归属（Brand 空 → Generic）
      if (!rowBrandName) rowBrandName = GENERIC_BRAND_NAME;
    } else if (!seriesStr) {
      failureCount++;
      errors.push({ row: rowNumber, message: `Series is required for normal category "${effectiveCategory}". Only special categories (name contains <>/()) may leave Series empty.` });
      continue;
    } else {
      rowSeriesId = seriesMap.get(normNavKey(seriesStr)) ?? null;
      if (!rowSeriesId) {
        stagedSeriesName = seriesStr;
        if (!rowBrandName) rowBrandName = GENERIC_BRAND_NAME;
      }
    }
    const itemSeriesId = rowSeriesId;

    // 字段长度上限：Brand/Series/Product ≤ 15 字符、Description ≤ 150 字符
    // （仅校验将写入/新建的名称；匹配到系统已有系列的行不校验 Series 长度）
    const lengthError = validateFieldLengths({
      brandname: rowBrandName,
      series: stagedSeriesName,
      productname: finalProductName,
      description,
    });
    if (lengthError) {
      failureCount++;
      errors.push({ row: rowNumber, message: lengthError });
      continue;
    }

    const slug = slugify(model);
    if (!slug) {
      failureCount++;
      errors.push({ row: rowNumber, message: `Could not generate slug from model "${model}"` });
      continue;
    }

    // 同一批次内 slug 唯一（@@unique([importBatchId, slug])）
    if (seenSlugs.has(slug)) {
      failureCount++;
      errors.push({ row: rowNumber, message: `Duplicate model "${model}" within the same file — slug "${slug}" already staged.` });
      continue;
    }

    // 解析价格（可选，无价格时暂存为 0；确认上线时根据 sellPrice>0 决定是否创建 ModelPrice）
    const costPrice = costPriceRaw ? toDecimal(costPriceRaw) : null;
    const sellPrice = sellPriceRaw ? toDecimal(sellPriceRaw) : null;
    const markup = markupRaw ? toDecimal(markupRaw) : null;
    // price 批次每行 Unit Price 必填（成本价）
    if (batchType === "price" && !costPriceRaw) {
      failureCount++;
      errors.push({ row: rowNumber, message: "Missing Unit Price (cost price) for this row." });
      continue;
    }
    if (costPriceRaw && costPrice === null) {
      failureCount++;
      errors.push({ row: rowNumber, message: `Column "${origHeader["costprice"] ?? origHeader["unitprice"] ?? "Unit Price"}" contains "${costPriceRaw}" which is not a valid number. If this column is not the cost price, please fix the header row (Row 1).` });
      continue;
    }
    if (sellPriceRaw && sellPrice === null) {
      failureCount++;
      errors.push({ row: rowNumber, message: `Column "${origHeader["sellprice"] ?? "Unit Price"}" contains "${sellPriceRaw}" which is not a valid number. If this column is not the unit price (e.g. it holds a unit like "pcs"), please check the header row (Row 1) and column order.` });
      continue;
    }
    if (markupRaw && markup === null) {
      failureCount++;
      errors.push({ row: rowNumber, message: `Column "${origHeader["markup"] ?? "Markup (%)"}" contains "${markupRaw}" which is not a valid number.` });
      continue;
    }
    // 校验物理属性 Decimal 字段：仅 product_info 批次需要（price 批次无物理属性列）
    if (batchType === "product_info") {
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
        failureCount++;
        errors.push({ row: rowNumber, message: `Column "${header}" contains "${raw}" which is not a valid number. Please fix the value or check the header row (Row 1).` });
        continue;
      }
    }

    try {
      await prisma.importBatchItem.create({
        data: {
          importBatchId: batch.importBatchId,
          rowNumber,
          seriesId: itemSeriesId,
          seriesName: stagedSeriesName,
          categoryName: effectiveCategory,
          productName: finalProductName,
          model,
          slug,
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
          brandName: rowBrandName,
          unit,
          costPrice: costPrice ?? 0,
          sellPrice: sellPrice ?? 0,
          markup,
          moq: toInt(moqRaw, 1),
          condition,
          leadTime,
        },
      });
      seenSlugs.add(slug);
      successCount++;
    } catch (err) {
      failureCount++;
      errors.push({ row: rowNumber, message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  // 更新批次统计
  await prisma.importBatch.update({
    where: { importBatchId: batch.importBatchId },
    data: { recordCount: successCount, errorCount: failureCount },
  });

  // 同一管理员上传同名文件（同批次类型）仅保留最新批次：删除更早批次。
  // 暂存行随批次级联删除；已上线 ModelPrice/Product 外键为 ON DELETE SET NULL，线上数据不丢，
  // 待新批次确认后按 slug 重新关联。
  await prisma.importBatch.deleteMany({
    where: {
      fileName,
      batchType,
      adminId: session.adminId,
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
