// 订单单据生成：形式发票（PI）、销售合同、商业发票（CI）、装箱单（PL）
// 四份单据合并为一个 PDF，数据全部取自当前订单真实快照。
// 使用 pdf-lib 标准字体（Helvetica），仅支持西文；非 Latin 字符降级为 "?"。

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { inferHsCode } from "@/lib/hs-code";
import { DEFAULT_ORDER_TERMS } from "@/lib/order-terms";

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const SELLER_NAME = "MROBOM-TECH";

/** 卖方主体信息：未配置的环境变量留空，单据上自动省略该行 */
const SELLER_INFO = {
  address: (process.env.SELLER_ADDRESS ?? "").trim(),
  phone: (process.env.SELLER_PHONE ?? "").trim(),
  email: (process.env.SELLER_EMAIL ?? "").trim(),
  taxId: (process.env.SELLER_TAX_ID ?? "").trim(),
  bank: (process.env.SELLER_BANK_DETAILS ?? "").trim(),
};

const TO_BE_CONFIRMED = "To be confirmed";

const COLOR_TEXT = rgb(0.1, 0.1, 0.1);
const COLOR_MUTED = rgb(0.45, 0.45, 0.45);
const COLOR_LINE = rgb(0.78, 0.78, 0.78);
const COLOR_HEAD_BG = rgb(0.94, 0.94, 0.94);

export interface DocumentOrderItem {
  productName: string;
  brand: string | null;
  model: string | null;
  condition: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  /** 行级 HS Code（管理者可改） */
  hsCode: string | null;
}

export interface DocumentOrder {
  orderNumber: string;
  createdAt: Date;
  currency: string;
  shippingName: string | null;
  shippingPhone: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingCountry: string | null;
  shippingZip: string | null;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: string | null;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  /** 订单统一 HS Code（管理者设定后对全部型号生效） */
  hsCode: string | null;
  customerNote: string | null;
  buyerEmail: string | null;
  buyerCompany: string | null;
  buyerTaxId: string | null;
  /** 货物原产国（来自价格行 origin，多个时显示 Mixed） */
  origin: string | null;
  items: DocumentOrderItem[];
}

/* ------------------------------- 文本工具 ------------------------------- */

/** 标准字体无法编码中文等字符，统一降级，避免 drawText 抛错 */
function sanitize(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph.trim()) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) out.push(line);
      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        line = word;
        continue;
      }
      // 超长单词按字符截断
      let chunk = "";
      for (const ch of word) {
        if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth && chunk) {
          out.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      line = chunk;
    }
    out.push(line);
  }
  return out.length ? out : [""];
}

function fitText(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}...`, size) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}...`;
}

function money(value: number, currency: string): string {
  return `${currency} ${value.toFixed(2)}`;
}

function fmtDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function paymentLabel(method: string | null): string {
  const map: Record<string, string> = {
    western_union: "Western Union",
    xtransfer: "XTransfer",
    airwallex: "Airwallex",
  };
  const effectiveMethod = method || DEFAULT_ORDER_TERMS.paymentMethod;
  return map[effectiveMethod] ?? sanitize(effectiveMethod);
}

/** 单据上的 HS Code：订单统一码优先，其次行级码，最后回落到系统推导值 */
export function itemHsCode(order: DocumentOrder, item: DocumentOrderItem): string {
  return (
    order.hsCode?.trim() ||
    item.hsCode?.trim() ||
    inferHsCode(item.productName, item.model) ||
    "-"
  );
}

/** Incoterms 行：Delivery Terms 去掉括号注释，再拼客户填写的 Port of Destination */
export function incotermsLine(order: DocumentOrder): string {
  const deliveryTerms = order.deliveryTerms || DEFAULT_ORDER_TERMS.deliveryTerms;
  const term = deliveryTerms.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const port = (order.customerNote ?? "").trim();
  if (!term) return TO_BE_CONFIRMED;
  return port ? `${term} ${port}` : term;
}

/* ------------------------------- PDF 写入器 ------------------------------- */

interface Column {
  label: string;
  width: number;
  align?: "left" | "right";
}

class Writer {
  private page: PDFPage;
  private y = 0;
  private readonly pages: PDFPage[] = [];

  constructor(
    private readonly pdf: PDFDocument,
    private readonly font: PDFFont,
    private readonly bold: PDFFont,
    private readonly runningLabel: string
  ) {
    this.page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.pages.push(this.page);
    this.y = PAGE_HEIGHT - MARGIN;
    this.runningHeader();
  }

  private runningHeader() {
    this.page.drawText(sanitize(this.runningLabel), {
      x: MARGIN,
      y: PAGE_HEIGHT - 28,
      size: 7,
      font: this.font,
      color: COLOR_MUTED,
    });
  }

  private startPage() {
    this.page = this.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.pages.push(this.page);
    this.y = PAGE_HEIGHT - MARGIN;
    this.runningHeader();
  }

  /** 单据标题 + 右侧 ORIGINAL 标记 + 分隔线 */
  heading(title: string, stamp = "ORIGINAL") {
    this.ensure(34);
    this.page.drawText(sanitize(title), {
      x: MARGIN,
      y: this.y - 18,
      size: 18,
      font: this.bold,
      color: COLOR_TEXT,
    });
    const stampSize = 8;
    const stampWidth = this.bold.widthOfTextAtSize(stamp, stampSize);
    this.page.drawText(stamp, {
      x: PAGE_WIDTH - MARGIN - stampWidth,
      y: this.y - 16,
      size: stampSize,
      font: this.bold,
      color: COLOR_MUTED,
    });
    this.y -= 26;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 1.1,
      color: COLOR_TEXT,
    });
    this.y -= 12;
  }

  /** 单据结束时统一补页脚页码（每份单据独立计数） */
  finalize() {
    const total = this.pages.length;
    this.pages.forEach((page, index) => {
      const marker = `${this.runningLabel.replace(/\s*·\s*/, " — ")}`;
      page.drawText(sanitize(marker), {
        x: MARGIN,
        y: 30,
        size: 7,
        font: this.font,
        color: COLOR_MUTED,
      });
      const label = `Page ${index + 1} of ${total}`;
      const width = this.font.widthOfTextAtSize(label, 7);
      page.drawText(label, {
        x: PAGE_WIDTH - MARGIN - width,
        y: 30,
        size: 7,
        font: this.font,
        color: COLOR_MUTED,
      });
    });
  }

  ensure(height: number) {
    if (this.y - height < MARGIN) this.startPage();
  }

  text(
    value: string,
    opts?: {
      size?: number;
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
      indent?: number;
      maxWidth?: number;
      gap?: number;
    }
  ) {
    const size = opts?.size ?? 9;
    const font = opts?.bold ? this.bold : this.font;
    const indent = opts?.indent ?? 0;
    const maxWidth = opts?.maxWidth ?? CONTENT_WIDTH - indent;
    const lineHeight = size * 1.45;
    for (const line of wrapText(sanitize(value), font, size, maxWidth)) {
      this.ensure(lineHeight);
      this.page.drawText(line, {
        x: MARGIN + indent,
        y: this.y - size,
        size,
        font,
        color: opts?.color ?? COLOR_TEXT,
      });
      this.y -= lineHeight;
    }
    this.y -= opts?.gap ?? 0;
  }

  hr(gap = 10) {
    this.ensure(2);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 0.6,
      color: COLOR_LINE,
    });
    this.y -= gap;
  }

  space(height: number) {
    this.ensure(height);
    this.y -= height;
  }

  parties(seller: string[], buyer: string[]) {
    const colWidth = CONTENT_WIDTH / 2 - 12;
    const blockHeight = (lines: string[]) =>
      lines.reduce((h, line) => h + wrapText(sanitize(line), this.font, 8.5, colWidth).length * 8.5 * 1.35, 0);
    const height = Math.max(blockHeight(seller), blockHeight(buyer)) + 20;
    this.ensure(height);
    const top = this.y;
    this.drawBlock("SELLER", seller, MARGIN, top, colWidth);
    this.drawBlock("BUYER", buyer, MARGIN + colWidth + 24, top, colWidth);
    this.y = top - height;
  }

  private drawBlock(label: string, lines: string[], x: number, top: number, width: number) {
    const size = 8.5;
    let y = top;
    this.page.drawText(label, { x, y: y - 7, size: 7, font: this.bold, color: COLOR_MUTED });
    y -= 13;
    for (const line of lines) {
      for (const wrapped of wrapText(sanitize(line), this.font, size, width)) {
        this.page.drawText(wrapped, { x, y: y - size, size, font: this.font, color: COLOR_TEXT });
        y -= size * 1.35;
      }
    }
  }

  table(columns: Column[], rows: string[][]) {
    const size = 8.5;
    const rowHeight = size * 1.95;

    this.ensure(rowHeight);
    this.page.drawRectangle({
      x: MARGIN,
      y: this.y - rowHeight,
      width: CONTENT_WIDTH,
      height: rowHeight,
      color: COLOR_HEAD_BG,
    });
    let x = MARGIN;
    for (const col of columns) {
      this.page.drawText(sanitize(col.label), {
        x: x + 4,
        y: this.y - rowHeight + size * 0.5,
        size: 7.5,
        font: this.bold,
        color: COLOR_TEXT,
      });
      x += col.width;
    }
    this.y -= rowHeight;

    for (const row of rows) {
      this.ensure(rowHeight);
      let cx = MARGIN;
      row.forEach((cell, index) => {
        const col = columns[index];
        if (!col) return;
        const display = fitText(sanitize(cell), this.font, size, col.width - 8);
        const width = this.font.widthOfTextAtSize(display, size);
        this.page.drawText(display, {
          x: col.align === "right" ? cx + col.width - 4 - width : cx + 4,
          y: this.y - rowHeight + size * 0.5,
          size,
          font: this.font,
          color: COLOR_TEXT,
        });
        cx += col.width;
      });
      this.page.drawLine({
        start: { x: MARGIN, y: this.y - rowHeight },
        end: { x: PAGE_WIDTH - MARGIN, y: this.y - rowHeight },
        thickness: 0.4,
        color: COLOR_LINE,
      });
      this.y -= rowHeight;
    }
  }

  totals(rows: Array<[string, string]>, strong: [string, string]) {
    const blockWidth = 230;
    const left = PAGE_WIDTH - MARGIN - blockWidth;
    const rowHeight = 16;

    for (const [label, value] of rows) {
      this.ensure(rowHeight);
      const size = 8.5;
      this.page.drawText(sanitize(label), { x: left, y: this.y - 11, size, font: this.font, color: COLOR_TEXT });
      const valueText = sanitize(value);
      const width = this.font.widthOfTextAtSize(valueText, size);
      this.page.drawText(valueText, {
        x: PAGE_WIDTH - MARGIN - width,
        y: this.y - 11,
        size,
        font: this.font,
        color: COLOR_TEXT,
      });
      this.y -= rowHeight;
    }

    this.ensure(rowHeight + 6);
    this.page.drawLine({
      start: { x: left, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 0.6,
      color: COLOR_LINE,
    });
    this.y -= 6;
    const size = 10;
    this.page.drawText(sanitize(strong[0]), { x: left, y: this.y - size, size, font: this.bold, color: COLOR_TEXT });
    const valueText = sanitize(strong[1]);
    const width = this.bold.widthOfTextAtSize(valueText, size);
    this.page.drawText(valueText, {
      x: PAGE_WIDTH - MARGIN - width,
      y: this.y - size,
      size,
      font: this.bold,
      color: COLOR_TEXT,
    });
    this.y -= 26;
  }

  signature(left: string, right?: string) {
    this.ensure(56);
    const colWidth = right ? CONTENT_WIDTH / 2 - 20 : CONTENT_WIDTH;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y - 20 },
      end: { x: MARGIN + colWidth, y: this.y - 20 },
      thickness: 0.6,
      color: COLOR_LINE,
    });
    this.page.drawText(sanitize(left), { x: MARGIN, y: this.y - 31, size: 7.5, font: this.font, color: COLOR_MUTED });
    if (right) {
      const x2 = MARGIN + colWidth + 40;
      this.page.drawLine({
        start: { x: x2, y: this.y - 20 },
        end: { x: PAGE_WIDTH - MARGIN, y: this.y - 20 },
        thickness: 0.6,
        color: COLOR_LINE,
      });
      this.page.drawText(sanitize(right), { x: x2, y: this.y - 31, size: 7.5, font: this.font, color: COLOR_MUTED });
    }
    this.y -= 46;
  }
}

/* ------------------------------- 数据整理 ------------------------------- */

export function sellerLines(): string[] {
  const lines = [SELLER_NAME];
  if (SELLER_INFO.address) lines.push(SELLER_INFO.address);
  if (SELLER_INFO.phone) lines.push(`Tel: ${SELLER_INFO.phone}`);
  if (SELLER_INFO.email) lines.push(SELLER_INFO.email);
  if (SELLER_INFO.taxId) lines.push(`Tax ID: ${SELLER_INFO.taxId}`);
  return lines;
}

export function buyerLines(order: DocumentOrder): string[] {
  const lines: string[] = [];
  if (order.shippingName) lines.push(order.shippingName);
  if (order.buyerCompany) lines.push(order.buyerCompany);
  if (order.shippingAddress) lines.push(order.shippingAddress);
  const cityLine = [order.shippingCity, order.shippingZip].filter(Boolean).join(" ");
  if (cityLine) lines.push(cityLine);
  if (order.shippingCountry) lines.push(order.shippingCountry);
  if (order.shippingPhone) lines.push(`Tel: ${order.shippingPhone}`);
  if (order.buyerEmail) lines.push(order.buyerEmail);
  if (order.buyerTaxId) lines.push(`Tax ID: ${order.buyerTaxId}`);
  return lines.length ? lines : ["-"];
}

function itemColumns(): Column[] {
  const fixed = [22, 62, 86, 58, 60, 28, 82];
  const amount = CONTENT_WIDTH - fixed.reduce((sum, width) => sum + width, 0);
  return [
    { label: "No.", width: fixed[0] },
    { label: "Brand", width: fixed[1] },
    { label: "Model", width: fixed[2] },
    { label: "Condition", width: fixed[3] },
    { label: "HS Code", width: fixed[4] },
    { label: "Qty", width: fixed[5], align: "right" },
    { label: "Unit Price", width: fixed[6], align: "right" },
    { label: "Amount", width: amount, align: "right" },
  ];
}

function itemRows(order: DocumentOrder): string[][] {
  return order.items.map((item, index) => [
    String(index + 1),
    item.brand || "-",
    item.model || item.productName,
    item.condition || "-",
    itemHsCode(order, item),
    String(item.quantity),
    money(item.unitPrice, order.currency),
    money(item.subtotal, order.currency),
  ]);
}

function totalRows(order: DocumentOrder): Array<[string, string]> {
  const rows: Array<[string, string]> = [["Subtotal", money(order.subtotal, order.currency)]];
  // All Charges：运费 + 税费的预估合计（PI / 合同 / CI 通用）
  const allCharges = order.shippingCost + order.taxAmount;
  rows.push(["All Charges", money(allCharges, order.currency)]);
  if (order.discountAmount > 0) rows.push(["Discount", `- ${money(order.discountAmount, order.currency)}`]);
  return rows;
}

/* ------------------------------- 四份单据 ------------------------------- */

function drawProformaInvoice(pdf: PDFDocument, font: PDFFont, bold: PDFFont, order: DocumentOrder) {
  const w = new Writer(pdf, font, bold, `Proforma Invoice · ${order.orderNumber}`);
  w.heading("PROFORMA INVOICE", "ORIGINAL — NOT A TAX INVOICE");
  w.text(`PI No.: ${order.orderNumber}`, { size: 9 });
  w.text(`Date: ${fmtDate(order.createdAt)}`, { size: 9 });
  w.text(`Currency: ${order.currency}`, { size: 9, gap: 8 });

  w.parties(sellerLines(), buyerLines(order));
  w.space(10);

  w.text("Goods Description", { size: 8, bold: true, color: COLOR_MUTED, gap: 4 });
  w.table(itemColumns(), itemRows(order));
  w.space(8);
  w.totals(totalRows(order), ["TOTAL", money(order.totalAmount, order.currency)]);
  w.space(4);

  w.text("Terms and Conditions", { size: 8, bold: true, color: COLOR_MUTED, gap: 4 });
  w.text(`Payment Method: ${paymentLabel(order.paymentMethod)}`, { size: 8.5 });
  w.text(`Payment Terms: ${order.paymentTerms ?? DEFAULT_ORDER_TERMS.paymentTerms}`, { size: 8.5 });
  w.text(`Incoterms: ${incotermsLine(order)}`, { size: 8.5 });
  w.text(`Country of Origin: ${order.origin ?? TO_BE_CONFIRMED}`, { size: 8.5 });
  w.text(`Destination Country: ${order.shippingCountry ?? "-"}`, { size: 8.5 });
  w.text(`Delivery Address: ${order.shippingAddress ?? "-"}`, { size: 8.5 });
  if (order.customerNote) w.text(`Port of Destination: ${order.customerNote}`, { size: 8.5 });
  w.text("Validity: 30 days from the date of issue.", { size: 8.5, gap: 6 });

  if (SELLER_INFO.bank) {
    w.text("Beneficiary Bank Details", { size: 8, bold: true, color: COLOR_MUTED, gap: 3 });
    w.text(SELLER_INFO.bank, { size: 8.5, gap: 6 });
  }

  w.text(
    "This proforma invoice is issued for payment purposes only. It is not a tax invoice and is not valid for customs " +
      "clearance. Title to the goods remains with the Seller until payment is received in full.",
    { size: 7.5, color: COLOR_MUTED, gap: 14 }
  );
  w.signature(`For and on behalf of ${SELLER_NAME}`, "Buyer's Acceptance");
  w.finalize();
}

function drawSalesContract(pdf: PDFDocument, font: PDFFont, bold: PDFFont, order: DocumentOrder) {
  const w = new Writer(pdf, font, bold, `Sales Contract · ${order.orderNumber}`);
  w.heading("SALES CONTRACT", "ORIGINAL");
  w.text(`Contract No.: ${order.orderNumber}`, { size: 9 });
  w.text(`Date: ${fmtDate(order.createdAt)}`, { size: 9 });
  w.text(`Currency: ${order.currency}`, { size: 9, gap: 8 });

  w.parties(sellerLines(), buyerLines(order));
  w.space(8);

  w.text(
    `This Sales Contract (the "Contract") is made between ${SELLER_NAME} (the "Seller") and the Buyer named above ` +
      `(the "Buyer") for the supply of the goods described below.`,
    { size: 8.5, gap: 8 }
  );

  w.text("1. Goods and Price", { size: 9, bold: true, gap: 4 });
  w.table(itemColumns(), itemRows(order));
  w.space(8);
  w.totals(totalRows(order), ["TOTAL CONTRACT VALUE", money(order.totalAmount, order.currency)]);
  w.space(6);

  w.text("2. Payment Terms", { size: 9, bold: true, gap: 3 });
  w.text(
    `Payment method: ${paymentLabel(order.paymentMethod)}` +
      `; payment schedule: ${order.paymentTerms ?? DEFAULT_ORDER_TERMS.paymentTerms}` +
      `. All amounts shall be paid in ${order.currency}.`,
    { size: 8.5, gap: 8 }
  );

  w.text("3. Trade Terms and Delivery", { size: 9, bold: true, gap: 3 });
  w.text(
    `Incoterms: ${incotermsLine(order)}. The Seller shall deliver the goods to: ` +
      `${order.shippingAddress ?? "-"}` +
      (order.shippingCity ? `, ${order.shippingCity}` : "") +
      (order.shippingCountry ? `, ${order.shippingCountry}` : "") +
      ".",
    { size: 8.5, gap: 8 }
  );

  w.text("4. Packing and Marking", { size: 9, bold: true, gap: 3 });
  w.text(
    "Goods shall be packed in export-standard packing suitable for international carriage and marked in accordance with " +
      "the shipping marks shown on the packing list.",
    { size: 8.5, gap: 8 }
  );

  w.text("5. Title and Risk", { size: 9, bold: true, gap: 3 });
  w.text(
    "Title to the goods passes to the Buyer only upon receipt of payment in full. Risk of loss or damage passes in " +
      "accordance with the agreed Incoterms.",
    { size: 8.5, gap: 8 }
  );

  w.text("6. Inspection and Claims", { size: 9, bold: true, gap: 3 });
  w.text(
    "The Buyer shall inspect the goods upon receipt and notify the Seller in writing of any shortage, damage or defect " +
      "within 7 days, failing which the goods shall be deemed accepted.",
    { size: 8.5, gap: 8 }
  );

  w.text("7. Force Majeure", { size: 9, bold: true, gap: 3 });
  w.text(
    "Neither party shall be liable for delay or failure to perform caused by events beyond its reasonable control, " +
      "including but not limited to natural disasters, war, government actions and transport interruptions.",
    { size: 8.5, gap: 8 }
  );

  w.text("8. Default", { size: 9, bold: true, gap: 3 });
  w.text(
    "If either party fails to perform its obligations, the other party may claim damages and, where the breach is " +
      "material, terminate this Contract by written notice.",
    { size: 8.5, gap: 8 }
  );

  w.text("9. Governing Law and Arbitration", { size: 9, bold: true, gap: 3 });
  w.text(
    "This Contract shall be governed by the laws of the Seller's place of business. Disputes shall first be resolved " +
      "by friendly negotiation; failing that, by arbitration in the Seller's jurisdiction. The arbitral award is final " +
      "and binding on both parties.",
    { size: 8.5, gap: 8 }
  );

  w.text("10. Entire Agreement", { size: 9, bold: true, gap: 3 });
  w.text(
    "This Contract, together with its annexes and the documents referred to herein, constitutes the entire agreement " +
      "between the parties and supersedes all prior negotiations and understandings.",
    { size: 8.5, gap: 14 }
  );

  w.signature("For the Seller (signature and company stamp)", "For the Buyer (signature and company stamp)");
  w.finalize();
}

function drawCommercialInvoice(pdf: PDFDocument, font: PDFFont, bold: PDFFont, order: DocumentOrder) {
  const w = new Writer(pdf, font, bold, `Commercial Invoice · ${order.orderNumber}`);
  w.heading("COMMERCIAL INVOICE", "ORIGINAL");
  w.text(`Invoice No.: ${order.orderNumber}`, { size: 9 });
  w.text(`Date: ${fmtDate(order.createdAt)}`, { size: 9 });
  w.text(`Currency: ${order.currency}`, { size: 9, gap: 8 });

  w.parties(sellerLines(), buyerLines(order));
  w.space(10);

  w.text("Goods Description", { size: 8, bold: true, color: COLOR_MUTED, gap: 4 });
  w.table(itemColumns(), itemRows(order));
  w.space(8);
  w.totals(totalRows(order), ["TOTAL INVOICE VALUE", money(order.totalAmount, order.currency)]);
  w.space(6);

  w.text(`Payment Method: ${paymentLabel(order.paymentMethod)}`, { size: 8.5 });
  w.text(`Payment Terms: ${order.paymentTerms ?? DEFAULT_ORDER_TERMS.paymentTerms}`, { size: 8.5 });
  w.text(`Incoterms: ${incotermsLine(order)}`, { size: 8.5 });
  w.text(`Country of Origin: ${order.origin ?? TO_BE_CONFIRMED}`, { size: 8.5 });
  w.text(`Destination Country: ${order.shippingCountry ?? "-"}`, { size: 8.5 });
  w.text(`Ship To: ${order.shippingAddress ?? "-"}`, { size: 8.5 });
  if (order.customerNote) w.text(`Port of Destination: ${order.customerNote}`, { size: 8.5 });
  w.space(10);

  w.text(
    "We hereby certify that this invoice shows the actual price of the goods described, that no other invoice has " +
      "been or will be issued, and that all particulars are true and correct. The goods are of the origin stated above.",
    { size: 7.5, color: COLOR_MUTED, gap: 8 }
  );
  w.text(
    "This invoice is issued for customs and payment purposes. Amounts are exclusive of any duties or taxes levied " +
      "at the place of importation, which are for the account of the Buyer unless otherwise agreed.",
    { size: 7.5, color: COLOR_MUTED, gap: 14 }
  );
  w.signature(`For and on behalf of ${SELLER_NAME} (signature and company stamp)`);
  w.finalize();
}

function drawPackingList(pdf: PDFDocument, font: PDFFont, bold: PDFFont, order: DocumentOrder) {
  const w = new Writer(pdf, font, bold, `Packing List · ${order.orderNumber}`);
  w.heading("PACKING LIST", "ORIGINAL");
  w.text(`P/L No.: ${order.orderNumber}`, { size: 9 });
  w.text(`Date: ${fmtDate(order.createdAt)}`, { size: 9, gap: 8 });

  w.parties(sellerLines(), buyerLines(order));
  w.space(10);

  const columns: Column[] = [
    { label: "No.", width: 22 },
    { label: "Brand", width: 76 },
    { label: "Model", width: CONTENT_WIDTH - 22 - 76 - 70 - 60 - 44 },
    { label: "Condition", width: 70 },
    { label: "HS Code", width: 60 },
    { label: "Qty", width: 44, align: "right" },
  ];

  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const rows = order.items.map((item, index) => [
    String(index + 1),
    item.brand || "-",
    item.model || item.productName,
    item.condition || "-",
    itemHsCode(order, item),
    String(item.quantity),
  ]);

  w.text("Packing Details", { size: 8, bold: true, color: COLOR_MUTED, gap: 4 });
  w.table(columns, rows);
  w.space(8);
  w.totals([["Lines", String(order.items.length)]], ["TOTAL QUANTITY", String(totalQuantity)]);
  w.space(6);

  w.text(`Incoterms: ${incotermsLine(order)}`, { size: 8.5 });
  w.text(`Country of Origin: ${order.origin ?? TO_BE_CONFIRMED}`, { size: 8.5 });
  w.text(`Destination Country: ${order.shippingCountry ?? "-"}`, { size: 8.5, gap: 8 });

  w.text("Shipping Marks", { size: 8, bold: true, color: COLOR_MUTED, gap: 3 });
  w.text(order.shippingName ?? "-", { size: 8.5 });
  w.text(order.shippingAddress ?? "-", { size: 8.5 });
  const cityLine = [order.shippingCity, order.shippingZip, order.shippingCountry].filter(Boolean).join(", ");
  if (cityLine) w.text(cityLine, { size: 8.5 });
  w.space(10);

  w.text(
    "The quantities listed above are based on the order record. Actual figures are subject to final counting at dispatch.",
    { size: 7.5, color: COLOR_MUTED, gap: 14 }
  );
  w.signature(`For and on behalf of ${SELLER_NAME} (signature and company stamp)`);
  w.finalize();
}

/* ------------------------------- 对外入口 ------------------------------- */

export async function generateOrderDocuments(order: DocumentOrder): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  pdf.setTitle(`${order.orderNumber} - Proforma Invoice, Contract, Commercial Invoice, Packing List`);
  pdf.setAuthor(SELLER_NAME);
  pdf.setCreator(SELLER_NAME);

  drawProformaInvoice(pdf, font, bold, order);
  drawSalesContract(pdf, font, bold, order);
  drawCommercialInvoice(pdf, font, bold, order);
  drawPackingList(pdf, font, bold, order);

  return pdf.save();
}
