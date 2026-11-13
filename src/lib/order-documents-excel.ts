// 订单单据 Excel：PI、销售合同、商业发票、装箱单分别放在四个工作表。
import { Workbook, type Worksheet, type Row } from "exceljs";
import {
  buyerLines,
  incotermsLine,
  itemHsCode,
  paymentLabel,
  sellerLines,
  type DocumentOrder,
} from "@/lib/order-documents";
import { DEFAULT_ORDER_TERMS } from "@/lib/order-terms";

type DocumentKind = "pi" | "contract" | "ci" | "packing";

const DOCUMENTS: Array<{
  kind: DocumentKind;
  sheetName: string;
  title: string;
  numberLabel: string;
}> = [
  { kind: "pi", sheetName: "PI", title: "PROFORMA INVOICE", numberLabel: "PI No." },
  { kind: "contract", sheetName: "Sales Contract", title: "SALES CONTRACT", numberLabel: "Contract No." },
  { kind: "ci", sheetName: "CI", title: "COMMERCIAL INVOICE", numberLabel: "Invoice No." },
  { kind: "packing", sheetName: "Packing List", title: "PACKING LIST", numberLabel: "P/L No." },
];

function fmtDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function styleHeader(row: Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF336633" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFBFC7BF" } },
      bottom: { style: "thin", color: { argb: "FFBFC7BF" } },
      left: { style: "thin", color: { argb: "FFBFC7BF" } },
      right: { style: "thin", color: { argb: "FFBFC7BF" } },
    };
  });
}

function addMergedText(sheet: Worksheet, lastColumn: number, text: string, bold = false) {
  const row = sheet.addRow([text]);
  sheet.mergeCells(row.number, 1, row.number, lastColumn);
  row.getCell(1).alignment = { vertical: "top", wrapText: true };
  row.font = { bold };
  row.height = Math.max(20, Math.ceil(text.length / 115) * 16);
  return row;
}

function addLabelValue(sheet: Worksheet, lastColumn: number, label: string, value: string) {
  const row = sheet.addRow([label, value || "-"]);
  sheet.mergeCells(row.number, 2, row.number, lastColumn);
  row.getCell(1).font = { bold: true };
  row.getCell(2).alignment = { wrapText: true, vertical: "top" };
}

function addParties(sheet: Worksheet, order: DocumentOrder, lastColumn: number) {
  const split = Math.floor(lastColumn / 2);
  const labels = sheet.addRow(["Seller", "", "Buyer"]);
  sheet.mergeCells(labels.number, 1, labels.number, split);
  sheet.mergeCells(labels.number, split + 1, labels.number, lastColumn);
  labels.getCell(1).font = { bold: true };
  labels.getCell(split + 1).font = { bold: true };

  const values = sheet.addRow([sellerLines().join("\n"), "", buyerLines(order).join("\n")]);
  sheet.mergeCells(values.number, 1, values.number, split);
  sheet.mergeCells(values.number, split + 1, values.number, lastColumn);
  values.getCell(1).alignment = { vertical: "top", wrapText: true };
  values.getCell(split + 1).alignment = { vertical: "top", wrapText: true };
  values.height = Math.max(sellerLines().length, buyerLines(order).length) * 16 + 8;
}

function addItems(sheet: Worksheet, order: DocumentOrder, packing: boolean) {
  const headers = packing
    ? ["No.", "Brand", "Model", "Condition", "HS Code", "Qty"]
    : ["No.", "Brand", "Model", "Condition", "HS Code", "Qty", "Unit Price", "Amount"];
  styleHeader(sheet.addRow(headers));

  for (const [index, item] of order.items.entries()) {
    const common = [
      index + 1,
      item.brand || "-",
      item.model || item.productName,
      item.condition || "-",
      itemHsCode(order, item),
      item.quantity,
    ];
    const row = sheet.addRow(packing ? common : [...common, item.unitPrice, item.subtotal]);
    row.eachCell((cell) => {
      cell.border = { bottom: { style: "hair", color: { argb: "FFD9D9D9" } } };
      cell.alignment = { vertical: "top", wrapText: true };
    });
    if (!packing) {
      row.getCell(7).numFmt = "#,##0.00";
      row.getCell(8).numFmt = "#,##0.00";
    }
  }
}

function addTotals(sheet: Worksheet, order: DocumentOrder, packing: boolean) {
  const lastColumn = packing ? 6 : 8;
  if (packing) {
    const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const row = sheet.addRow([]);
    row.getCell(lastColumn - 1).value = "Total Quantity";
    row.getCell(lastColumn - 1).font = { bold: true };
    row.getCell(lastColumn).value = quantity;
    row.getCell(lastColumn).font = { bold: true };
    return;
  }

  const rows: Array<[string, number]> = [
    ["Subtotal", order.subtotal],
    ["All Charges", order.shippingCost + order.taxAmount],
  ];
  if (order.discountAmount > 0) rows.push(["Discount", -order.discountAmount]);
  rows.push(["TOTAL", order.totalAmount]);

  for (const [label, value] of rows) {
    const row = sheet.addRow([]);
    row.getCell(lastColumn - 1).value = label;
    row.getCell(lastColumn).value = value;
    row.getCell(lastColumn).numFmt = "#,##0.00";
    if (label === "TOTAL") {
      row.getCell(lastColumn - 1).font = { bold: true };
      row.getCell(lastColumn).font = { bold: true };
    }
  }
}

function addCommonTerms(sheet: Worksheet, order: DocumentOrder, lastColumn: number) {
  sheet.addRow([]);
  addLabelValue(sheet, lastColumn, "Incoterms", incotermsLine(order));
  addLabelValue(sheet, lastColumn, "Country of Origin", order.origin || "To be confirmed");
  addLabelValue(sheet, lastColumn, "Destination Country", order.shippingCountry || "-");
  addLabelValue(sheet, lastColumn, "Delivery Address", order.shippingAddress || "-");
}

function addKindSpecificTerms(sheet: Worksheet, order: DocumentOrder, kind: DocumentKind) {
  const lastColumn = kind === "packing" ? 6 : 8;
  if (kind !== "packing") {
    addLabelValue(sheet, lastColumn, "Payment Method", paymentLabel(order.paymentMethod));
    addLabelValue(sheet, lastColumn, "Payment Terms", order.paymentTerms || DEFAULT_ORDER_TERMS.paymentTerms);
  }
  if (kind === "pi") {
    addLabelValue(sheet, lastColumn, "Validity", "30 days from the date of issue");
    const bank = (process.env.SELLER_BANK_DETAILS ?? "").trim();
    if (bank) addLabelValue(sheet, lastColumn, "Beneficiary Bank Details", bank);
    sheet.addRow([]);
    addMergedText(
      sheet,
      lastColumn,
      "This proforma invoice is issued for payment purposes only. It is not a tax invoice and is not valid for customs clearance."
    );
  } else if (kind === "ci") {
    sheet.addRow([]);
    addMergedText(
      sheet,
      lastColumn,
      "We hereby certify that this invoice shows the actual price of the goods described and that all particulars are true and correct. The goods are of the origin stated above."
    );
  } else if (kind === "contract") {
    sheet.addRow([]);
    addMergedText(sheet, lastColumn, "Contract Terms", true);
    const clauses = [
      "1. Goods and Price: the goods, quantities and prices are as listed above.",
      `2. Payment: ${paymentLabel(order.paymentMethod)}; ${order.paymentTerms || DEFAULT_ORDER_TERMS.paymentTerms}. All amounts shall be paid in ${order.currency}.`,
      `3. Trade Terms and Delivery: Incoterms ${incotermsLine(order)}.`,
      "4. Packing and Marking: export-standard packing suitable for international carriage.",
      "5. Title and Risk: title passes upon receipt of payment in full; risk passes in accordance with the agreed Incoterms.",
      "6. Inspection and Claims: shortages, damage or defects must be reported in writing within 7 days of receipt.",
      "7. Force Majeure: neither party is liable for delay caused by events beyond its reasonable control.",
      "8. Default: the non-defaulting party may claim damages for a material breach.",
      "9. Governing Law and Arbitration: disputes shall first be resolved by friendly negotiation, then by arbitration in the Seller's jurisdiction.",
      "10. Entire Agreement: this Contract and its annexes constitute the entire agreement between the parties.",
    ];
    for (const clause of clauses) addMergedText(sheet, lastColumn, clause);
  }
}

/** 生成一个 XLSX 文件，四个工作表分别对应 PI / 合同 / CI / 装箱单。 */
export async function generateOrderDocumentsExcel(order: DocumentOrder): Promise<Buffer> {
  const workbook = new Workbook();
  workbook.creator = "MROBOM-TECH";
  workbook.created = order.createdAt;

  for (const definition of DOCUMENTS) {
    const packing = definition.kind === "packing";
    const lastColumn = packing ? 6 : 8;
    const sheet = workbook.addWorksheet(definition.sheetName, {
      views: [{ state: "frozen", ySplit: 7 }],
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    sheet.columns = packing
      ? [{ width: 7 }, { width: 18 }, { width: 34 }, { width: 18 }, { width: 16 }, { width: 10 }]
      : [
          { width: 7 },
          { width: 16 },
          { width: 28 },
          { width: 16 },
          { width: 15 },
          { width: 9 },
          { width: 16 },
          { width: 18 },
        ];

    const title = sheet.addRow([definition.title]);
    sheet.mergeCells(title.number, 1, title.number, lastColumn);
    title.font = { bold: true, size: 16, color: { argb: "FF336633" } };
    title.alignment = { horizontal: "center" };
    title.height = 26;

    const meta = sheet.addRow([definition.numberLabel, order.orderNumber, "", "Date", fmtDate(order.createdAt)]);
    meta.getCell(1).font = { bold: true };
    meta.getCell(4).font = { bold: true };
    if (!packing) {
      meta.getCell(6).value = "Currency";
      meta.getCell(6).font = { bold: true };
      meta.getCell(7).value = order.currency;
    }
    sheet.addRow([]);
    addParties(sheet, order, lastColumn);
    sheet.addRow([]);
    addItems(sheet, order, packing);
    addTotals(sheet, order, packing);
    addCommonTerms(sheet, order, lastColumn);
    addKindSpecificTerms(sheet, order, definition.kind);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
