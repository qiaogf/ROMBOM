import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/order-documents?orderId=xxx
 * 生成该订单的报关单证（Commercial Invoice + Packing List）为一个 Excel 工作簿下载。
 * 管理界面后续可直接加载该文件。
 */
export async function GET(request: Request) {
  try {
    const customerId = await getCurrentUserId();
    if (!customerId) {
      return NextResponse.json({ success: false, message: "Please login first." }, { status: 401 });
    }

    const url = new URL(request.url);
    const orderId = (url.searchParams.get("orderId") ?? "").trim();
    if (!orderId || !/^[a-zA-Z0-9_-]+$/.test(orderId) || orderId.length > 255) {
      return NextResponse.json({ success: false, message: "Invalid order ID" }, { status: 400 });
    }

    const order = await prisma.salesOrder.findUnique({
      where: { orderId },
      include: { items: true },
    });
    if (!order || order.customerId !== customerId) {
      return NextResponse.json({ success: false, message: "Order not found or unauthorized" }, { status: 404 });
    }

    // exceljs 按需加载：避免构建期 page-data 收集时触发 Turbopack 外部包哈希解析失败
    const ExcelJS = (await import("exceljs")).default;

    const wb = new ExcelJS.Workbook();
    wb.creator = "Order System";
    wb.created = new Date();

    const currency = order.currency || "USD";
    const invoiceDate = (order.orderTime ?? order.createdAt).toISOString().slice(0, 10);

    const consigneeLines = [
      order.shippingName,
      order.shippingAddress,
      [order.shippingCity, order.shippingZip].filter(Boolean).join(" "),
      order.shippingCountry,
      order.shippingPhone ? `Tel: ${order.shippingPhone}` : null,
    ].filter(Boolean) as string[];

    // ---------- Sheet 1: Commercial Invoice ----------
    const ci = wb.addWorksheet("Commercial Invoice");
    ci.columns = [
      { header: "Model", key: "model", width: 28 },
      { header: "Description", key: "desc", width: 36 },
      { header: "Qty", key: "qty", width: 10 },
      { header: "Unit Price", key: "price", width: 14 },
      { header: "Amount", key: "amount", width: 14 },
    ];

    ci.spliceRows(1, 0, []);
    ci.getCell("A1").value = "COMMERCIAL INVOICE";
    ci.getCell("A1").font = { bold: true, size: 14 };
    ci.spliceRows(2, 0, []);
    ci.getCell("A2").value = `Order No.: ${order.orderNumber}`;
    ci.getCell("D2").value = `Date: ${invoiceDate}`;
    ci.getCell("A3").value = "Consignee:";
    consigneeLines.forEach((line, i) => {
      ci.getCell(`B${3 + i}`).value = line;
    });
    ci.getCell(`A${4 + consigneeLines.length}`).value = `Currency: ${currency}`;

    const headerRow = ci.getRow(6 + consigneeLines.length);
    headerRow.values = ["Model", "Description", "Qty", "Unit Price", "Amount"];
    headerRow.font = { bold: true };

    let rowIdx = headerRow.number + 1;
    for (const item of order.items) {
      ci.getRow(rowIdx).values = [
        item.model ?? "",
        item.productName,
        item.quantity,
        Number(item.finalSellPrice),
        Number(item.subtotal),
      ];
      rowIdx += 1;
    }

    const subtotal = Number(order.subtotal);
    const shipping = Number(order.shippingCost);
    const total = Number(order.totalAmount);
    ci.getRow(rowIdx + 1).values = ["", "", "", "Subtotal", subtotal];
    ci.getRow(rowIdx + 2).values = ["", "", "", "Local Charges", shipping];
    const totalRow = ci.getRow(rowIdx + 3);
    totalRow.values = ["", "", "", "Total", total];
    totalRow.font = { bold: true };
    [rowIdx + 1, rowIdx + 2, rowIdx + 3].forEach((r) => {
      ci.getRow(r).getCell(4).font = { bold: true };
    });

    // ---------- Sheet 2: Packing List ----------
    const pl = wb.addWorksheet("Packing List");
    pl.columns = [
      { header: "Model", key: "model", width: 28 },
      { header: "Description", key: "desc", width: 36 },
      { header: "Qty", key: "qty", width: 10 },
      { header: "Unit Weight", key: "unitWeight", width: 14 },
      { header: "Total Weight", key: "totalWeight", width: 14 },
    ];

    pl.spliceRows(1, 0, []);
    pl.getCell("A1").value = "PACKING LIST";
    pl.getCell("A1").font = { bold: true, size: 14 };
    pl.spliceRows(2, 0, []);
    pl.getCell("A2").value = `Order No.: ${order.orderNumber}`;
    pl.getCell("D2").value = `Date: ${invoiceDate}`;
    pl.getCell("A3").value = "Consignee:";
    consigneeLines.forEach((line, i) => {
      pl.getCell(`B${3 + i}`).value = line;
    });

    const plHeaderRow = pl.getRow(6 + consigneeLines.length);
    plHeaderRow.values = ["Model", "Description", "Qty", "Unit Weight", "Total Weight"];
    plHeaderRow.font = { bold: true };

    let plRowIdx = plHeaderRow.number + 1;
    let totalQty = 0;
    let totalWeight = 0;
    let hasWeight = false;
    for (const item of order.items) {
      const unitWeight = item.weight != null ? Number(item.weight) : null;
      const lineWeight = unitWeight != null ? unitWeight * item.quantity : null;
      if (lineWeight != null) hasWeight = true;
      totalQty += item.quantity;
      if (lineWeight != null) totalWeight += lineWeight;
      pl.getRow(plRowIdx).values = [
        item.model ?? "",
        item.productName,
        item.quantity,
        unitWeight != null ? `${unitWeight} ${item.weightUnit ?? "kg"}` : "",
        lineWeight != null ? `${lineWeight.toFixed(4)} ${item.weightUnit ?? "kg"}` : "",
      ];
      plRowIdx += 1;
    }

    const plTotalRow = pl.getRow(plRowIdx + 1);
    plTotalRow.values = [
      "",
      "Total",
      totalQty,
      "",
      hasWeight ? `${totalWeight.toFixed(4)} kg` : "",
    ];
    plTotalRow.font = { bold: true };

    const buffer = await wb.xlsx.writeBuffer();
    const safeNumber = order.orderNumber.replace(/[^\w.\-]+/g, "_").slice(0, 80) || orderId;

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeNumber}-documents.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("order-documents route error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate documents. Please try again later." },
      { status: 500 }
    );
  }
}
