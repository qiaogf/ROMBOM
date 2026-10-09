import { PrismaClient } from "./generated/client";
import fs from "fs";
import path from "path";
import XLSX from "xlsx";

const prisma = new PrismaClient();

function parseCSV(content: string): Record<string, string>[] {
  const lines = content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim());

  if (lines.length === 0) return [];

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h.trim()] = (values[i] || "").trim();
    });
    return row;
  });
}

async function parseExcel(filePath: string, sheetName?: string): Promise<Record<string, string>[]> {
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const targetSheet = sheetName && workbook.SheetNames.includes(sheetName)
    ? sheetName
    : workbook.SheetNames[0];
  const sheet = workbook.Sheets[targetSheet];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return rows.map((row) => {
    const obj = row as Record<string, unknown>;
    const result: Record<string, string> = {};
    for (const key of Object.keys(obj)) {
      result[key.trim()] = String(obj[key] ?? "").trim();
    }
    return result;
  });
}

async function readDataFile(filePath: string, sheetName?: string): Promise<Record<string, string>[]> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".xlsx" || ext === ".xls") {
    return parseExcel(filePath, sheetName);
  }
  const content = fs.readFileSync(filePath, "utf-8");
  return parseCSV(content);
}

const sheetMap: Record<string, string> = {
  categories: "类目",
  brands: "品牌",
  products: "商品",
  quotes: "价格表",
};

function toInt(v: string | undefined, d = 0): number {
  if (!v) return d;
  const n = globalThis.parseInt(v, 10);
  return isNaN(n) ? d : n;
}

function toFloat(v: string | undefined, d = 0): number {
  if (!v) return d;
  const n = globalThis.parseFloat(v);
  return isNaN(n) ? d : n;
}

function toBoolean(v: string | undefined): boolean {
  return v === "true" || v === "1" || v?.toLowerCase() === "yes";
}

function toDate(v: string | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

async function importCategories(filePath: string, sheetName?: string) {
  console.log("\n📂 导入类目数据...");
  const rows = await readDataFile(filePath, sheetName);
  let created = 0;

  for (const row of rows) {
    const categoryName = row["categoryName"] || row["类目名称"];
    if (!categoryName) continue;

    const existing = await prisma.category.findFirst({
      where: { categoryName },
    });

    // Generate slug from categoryName
    const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const briefDesc = row["briefDesc"] || row["简短介绍"] || null;

    if (existing) {
      await prisma.category.update({
        where: { categoryId: existing.categoryId },
        data: {
          parentId: row["parentId"] || row["父类目ID"] || "0",
          level: toInt(row["level"] || row["层级"], 1),
          sortOrder: toInt(row["sort"] || row["排序"] || row["sortOrder"], 0),
          isActive: toBoolean(row["active"] || row["是否启用"] || row["isActive"] || "true"),
          briefDesc,
        },
      });
      console.log(`  🔄 更新: ${categoryName}`);
    } else {
      const result = await prisma.category.create({
        data: {
          categoryName,
          parentId: row["parentId"] || row["父类目ID"] || "0",
          level: toInt(row["level"] || row["层级"], 1),
          slug,
          briefDesc,
          sortOrder: toInt(row["sort"] || row["排序"] || row["sortOrder"], 0),
          isActive: toBoolean(row["active"] || row["是否启用"] || row["isActive"] || "true"),
        },
      });
      created++;
      console.log(`  ✅ ${categoryName} (${result.categoryId})`);
    }
  }
  console.log(`  📊 共处理 ${created} 条类目`);
}

async function importBrands(filePath: string, sheetName?: string) {
  console.log("\n🏷️  导入品牌数据...");
  const rows = await readDataFile(filePath, sheetName);
  let created = 0;

  // 确保存在默认供应商（Brand 必须归属一个供应商）
  let defaultSupplier = await prisma.supplier.findFirst();
  if (!defaultSupplier) {
    defaultSupplier = await prisma.supplier.create({
      data: { supplierName: "Default Supplier", email: "default@supplier.local", passwordHash: "disabled" },
    });
  }
  const defaultSupplierId = defaultSupplier.supplierId;

  for (const row of rows) {
    const brandName = row["brandName"] || row["品牌名称"];
    if (!brandName) continue;

    // Generate slug from brandName
    const slug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const existing = await prisma.brand.findFirst({
      where: { brandName },
    });

    if (existing) {
      await prisma.brand.update({
        where: { brandId: existing.brandId },
        data: {
          slug,
          logo: row["logo"] || row["Logo"] || undefined,
          description: row["description"] || row["简短介绍"] || undefined,
        },
      });
      console.log(`  🔄 更新: ${brandName}`);
    } else {
      const result = await prisma.brand.create({
        data: {
          brandName,
          slug,
          logo: row["logo"] || row["Logo"],
          description: row["description"] || row["简短介绍"],
          supplierId: defaultSupplierId,
        },
      });
      created++;
      console.log(`  ✅ ${brandName} (${result.brandId})`);
    }
  }
  console.log(`  📊 共处理 ${created} 条品牌`);
}

async function importProducts(filePath: string, sheetName?: string) {
  console.log("\n📦 导入商品数据...");
  const rows = await readDataFile(filePath, sheetName);
  let created = 0;

  for (const row of rows) {
    const productName = row["productName"] || row["商品名称"];
    const categoryName = row["categoryName"] || row["类目名称"];
    const brandName = row["brandName"] || row["品牌名称"];
    const model = row["model"] || row["料号"];
    if (!productName || !categoryName || !brandName) {
      console.log(`  ⚠️  跳过: 缺少必要字段 (productName/categoryName/brandName)`);
      continue;
    }

    const category = await prisma.category.findFirst({
      where: { categoryName },
    });
    if (!category) {
      console.log(`  ⚠️  跳过: 类目 "${categoryName}" 不存在`);
      continue;
    }

    const brand = await prisma.brand.findUnique({
      where: { brandName },
    });
    if (!brand) {
      console.log(`  ⚠️  跳过: 品牌 "${brandName}" 不存在`);
      continue;
    }

    const imagesStr = row["images"] || row["图片"] || "";
    const images = imagesStr
      ? JSON.stringify(imagesStr.split("|").map((s) => s.trim()).filter(Boolean))
      : "[]";

    const result = await prisma.product.create({
      data: {
        productName,
        model: model || "",
        description: row["description"] || row["描述"],
        unit: row["unit"] || row["单位"] || "pcs",
        status: (row["status"] || row["状态"] || "off_sale") as "on_sale" | "off_sale",
        thumbnail: row["thumbnail"] || row["缩略图"] || undefined,
        images,
        sortOrder: toInt(row["sortOrder"] || row["排序"], 0),
        category: { connect: { categoryId: category.categoryId } },
        brand: { connect: { brandId: brand.brandId } },
      },
    });
    created++;
    console.log(`  ✅ ${productName} (${result.productId})`);
  }
  console.log(`  📊 共处理 ${created} 条商品`);
}

async function importSupplierQuotes(filePath: string, sheetName?: string) {
  console.log("\n💰 导入供应商报价数据...");
  const rows = await readDataFile(filePath, sheetName);
  let created = 0;

  for (const row of rows) {
    const productName = row["productName"] || row["商品名称"];
    const supplierName = row["supplierName"] || row["供应商名称"];
    if (!productName || !supplierName) {
      console.log(`  ⚠️  跳过: 缺少 productName 或 supplierName`);
      continue;
    }

    const product = await prisma.product.findFirst({
      where: { productName },
    });
    if (!product) {
      console.log(`  ⚠️  跳过: 商品 "${productName}" 不存在`);
      continue;
    }

    let supplier = await prisma.supplier.findFirst({
      where: { supplierName },
    });
    if (!supplier) {
      supplier = await prisma.supplier.create({
        data: {
          supplierName,
          email: `${Date.now()}@supplier.local`,
          passwordHash: "disabled",
          contactInfo: row["contactInfo"] || row["联系信息"],
        },
      });
      console.log(`  🆕 创建供应商: ${supplierName}`);
    }

    const costPrice = toFloat(row["costPrice"] || row["成本价"]);
    const sellPrice = toFloat(row["sellPrice"] || row["销售价"]);
    const moq = toInt(row["moq"] || row["MOQ"], 1);

    const result = await prisma.supplierQuote.create({
      data: {
        costPrice,
        sellPrice,
        moq,
        stockStatus: (row["stockStatus"] || row["库存状态"] || "in_stock") as "in_stock" | "lead_time" | "out_of_stock",
        leadTime: row["leadTime"] || row["交货周期"],
        validUntil: toDate(row["validUntil"] || row["有效期"]),
        isDefault: toBoolean(row["isDefault"] || row["是否默认"] || "false"),
        supplier: { connect: { supplierId: supplier.supplierId } },
        product: { connect: { productId: product.productId } },
      },
    });
    created++;
    console.log(`  ✅ ${productName} @ ${supplierName} (${result.quoteId}) 成本:¥${costPrice} 销售:¥${sellPrice}`);
  }
  console.log(`  📊 共处理 ${created} 条报价`);
}

async function exportToExcel() {
  const exportDir = path.resolve("prisma", "exports");
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputFile = path.join(exportDir, `export-${timestamp}.xlsx`);

  const workbook = XLSX.utils.book_new();

  console.log("\n📊 导出数据库到 Excel...");

  const categories = await prisma.category.findMany();
  const catSheet = XLSX.utils.json_to_sheet(categories.map(c => ({
    categoryId: c.categoryId, categoryName: c.categoryName,
    parentId: c.parentId, level: c.level, slug: c.slug, briefDesc: c.briefDesc || "", sortOrder: c.sortOrder, isActive: c.isActive
  })));
  XLSX.utils.book_append_sheet(workbook, catSheet, "类目");
  console.log(`  📂 类目: ${categories.length} 条`);

  const brands = await prisma.brand.findMany();
  const brandSheet = XLSX.utils.json_to_sheet(brands.map(b => ({
    brandId: b.brandId, brandName: b.brandName, slug: b.slug, logo: b.logo || "", description: b.description || ""
  })));
  XLSX.utils.book_append_sheet(workbook, brandSheet, "品牌");
  console.log(`  🏷️  品牌: ${brands.length} 条`);

  const products = await prisma.product.findMany();
  const prodSheet = XLSX.utils.json_to_sheet(products.map(p => {
    let imgList: string[] = [];
    try { imgList = JSON.parse(p.images || "[]"); } catch { imgList = []; }
    return {
      productId: p.productId, productName: p.productName, model: p.model,
      description: p.description || "", unit: p.unit, status: p.status,
      thumbnail: p.thumbnail || "", images: imgList.join("|"),
      sortOrder: p.sortOrder, categoryId: p.categoryId, brandId: p.brandId
    };
  }));
  XLSX.utils.book_append_sheet(workbook, prodSheet, "商品");
  console.log(`  📦 商品: ${products.length} 条`);

  const quotes = await prisma.supplierQuote.findMany();
  const quoteSheet = XLSX.utils.json_to_sheet(quotes.map(q => ({
    quoteId: q.quoteId, supplierId: q.supplierId, productId: q.productId,
    costPrice: String(q.costPrice), sellPrice: String(q.sellPrice),
    moq: q.moq, stockStatus: q.stockStatus, leadTime: q.leadTime || "",
    validUntil: q.validUntil ? q.validUntil.toISOString() : "", isDefault: q.isDefault, isValid: q.isValid
  })));
  XLSX.utils.book_append_sheet(workbook, quoteSheet, "供应商报价");
  console.log(`  💰 报价: ${quotes.length} 条`);

  XLSX.writeFile(workbook, outputFile);
  console.log(`\n✅ 导出完成: ${outputFile}`);
}

async function generateTemplates() {
  const templatesDir = path.resolve("prisma", "templates");
  if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true });

  console.log("\n📝 生成 Excel 模板文件...");

  const categories = [
    { categoryName: "Electronics", parentId: "0", level: 1, sortOrder: 1, isActive: "true" },
    { categoryName: "Mobile Phones", parentId: "Electronics", level: 2, sortOrder: 1, isActive: "true" },
  ];
  const catWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(catWb, XLSX.utils.json_to_sheet(categories), "类目");
  XLSX.writeFile(catWb, path.join(templatesDir, "categories_template.xlsx"));

  const brands = [
    { brandName: "Apple", logo: "", description: "Apple Inc." },
    { brandName: "Samsung", logo: "", description: "Samsung Electronics" },
  ];
  const brandWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(brandWb, XLSX.utils.json_to_sheet(brands), "品牌");
  XLSX.writeFile(brandWb, path.join(templatesDir, "brands_template.xlsx"));

  const products = [
    { productName: "iPhone 15 Pro Max", model: "A3108", categoryName: "Mobile Phones", brandName: "Apple", description: "Latest iPhone", unit: "pcs", status: "on_sale" },
  ];
  const prodWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(prodWb, XLSX.utils.json_to_sheet(products), "商品");
  XLSX.writeFile(prodWb, path.join(templatesDir, "products_template.xlsx"));

  const quotes = [
    { productName: "iPhone 15 Pro Max", supplierName: "Apple Official", costPrice: "899", sellPrice: "1199", moq: 1, stockStatus: "in_stock", leadTime: "7-14 days" },
  ];
  const quoteWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(quoteWb, XLSX.utils.json_to_sheet(quotes), "报价");
  XLSX.writeFile(quoteWb, path.join(templatesDir, "quotes_template.xlsx"));

  console.log("✅ 模板文件已生成:");
  console.log("   prisma/templates/categories_template.xlsx");
  console.log("   prisma/templates/brands_template.xlsx");
  console.log("   prisma/templates/products_template.xlsx");
  console.log("   prisma/templates/quotes_template.xlsx");
}

async function main() {
  const args = process.argv.slice(2);
  const type = args[0];
  const templatesDir = path.resolve("prisma", "templates");

  if (!type) {
    console.log("=".repeat(60));
    console.log("📥 Excel/CSV 数据导入导出工具");
    console.log("=".repeat(60));
    console.log("\n用法:");
    console.log("  pnpm import-csv <类型> [文件路径]   导入数据");
    console.log("  pnpm import-csv export              导出数据到 Excel");
    console.log("  pnpm import-csv template            生成 Excel 模板");
    console.log("\n类型: categories | brands | products | quotes | all");
    console.log("示例:");
    console.log("  pnpm import-csv categories data.xlsx  (支持 .xlsx/.xls/.csv)");
    console.log("  pnpm import-csv all                  (导入所有 CSV 模板)");
    console.log("  pnpm import-csv export                (导出全量数据)");
    console.log("  pnpm import-csv template              (生成 Excel 模板)");
    console.log("\n📁 模板目录: prisma/templates/");
    console.log("   categories.csv/xlsx  - 类目");
    console.log("   brands.csv/xlsx      - 品牌");
    console.log("   products.csv/xlsx    - 商品");
    console.log("   quotes.csv/xlsx      - 供应商价格表");
    process.exit(0);
  }

  if (type === "export") {
    await exportToExcel();
    return;
  }

  if (type === "template") {
    await generateTemplates();
    return;
  }

  const fileMap: Record<string, { defaultFile: string; import: (fp: string, sn?: string) => Promise<void> }> = {
    categories: {
      defaultFile: path.join(templatesDir, "categories.csv"),
      import: importCategories,
    },
    brands: {
      defaultFile: path.join(templatesDir, "brands.csv"),
      import: importBrands,
    },
    products: {
      defaultFile: path.join(templatesDir, "products.csv"),
      import: importProducts,
    },
    quotes: {
      defaultFile: path.join(templatesDir, "quotes.csv"),
      import: importSupplierQuotes,
    },
  };

  async function importFromCombinedExcel(filePath: string) {
    const wb = XLSX.read(fs.readFileSync(filePath), { type: "buffer" });
    
    const typeToSheet: Record<string, string> = {
      categories: "类目",
      brands: "品牌",
      products: "商品",
      quotes: "价格表",
    };

    const order = ["categories", "brands", "products", "quotes"];
    for (const t of order) {
      const sheetName = typeToSheet[t];
      if (wb.SheetNames.includes(sheetName)) {
        await fileMap[t].import(filePath, sheetName);
      } else {
        console.log(`\n⚠️  工作表 "${sheetName}" 不存在，跳过`);
      }
    }
  }

  if (type === "all") {
    console.log("🔄 开始全量导入...");
    const combinedTemplate = path.join(templatesDir, "B2B数据导入模板.xlsx");
    if (fs.existsSync(combinedTemplate)) {
      console.log("📋 检测到组合模板文件，按工作表导入...");
      await importFromCombinedExcel(combinedTemplate);
    } else {
      const order = ["categories", "brands", "products", "quotes"];
      for (const t of order) {
        const file = fileMap[t];
        const candidates = [file.defaultFile, file.defaultFile.replace(".csv", ".xlsx"), file.defaultFile.replace(".csv", ".xls")];
        let found = false;
        for (const c of candidates) {
          if (fs.existsSync(c)) {
            await file.import(c);
            found = true;
            break;
          }
        }
        if (!found) {
          console.log(`\n⚠️  ${file.defaultFile} 不存在，跳过`);
        }
      }
    }
    console.log("\n✅ 全量导入完成！");
  } else if (fileMap[type]) {
    const file = fileMap[type];
    const filePath = args[1] || file.defaultFile;
    if (!fs.existsSync(filePath)) {
      console.error(`❌ 文件不存在: ${filePath}`);
      process.exit(1);
    }
    const ext = path.extname(filePath).toLowerCase();
    const sheetName = ext === ".xlsx" || ext === ".xls" ? sheetMap[type] : undefined;
    await file.import(filePath, sheetName);
  } else {
    console.error(`❌ 未知类型: ${type}`);
    console.log("可选: categories | brands | products | quotes | all | export | template");
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("❌ 导入出错:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());