import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getAdminSession } from "@/lib/auth-admin";
import { generateOrderDocuments, type DocumentOrder } from "@/lib/order-documents";
import { generateOrderDocumentsExcel } from "@/lib/order-documents-excel";

export const dynamic = "force-dynamic";

/**
 * GET /api/order-documents?orderId=xxx&format=pdf|xlsx
 * 按当前订单数据生成 PI + 销售合同 + 商业发票 + 装箱单。
 * 客户默认下载 PDF；管理员可下载 PDF 或包含四个工作表的 XLSX。
 */
export async function GET(request: Request) {
  try {
    const [customerId, admin] = await Promise.all([getCurrentUserId(), getAdminSession()]);
    if (!customerId && !admin) {
      return NextResponse.json({ success: false, message: "Please login first." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "pdf";
    if (format !== "pdf" && format !== "xlsx") {
      return NextResponse.json({ success: false, message: "Invalid document format." }, { status: 400 });
    }
    if (format === "xlsx" && !admin) {
      return NextResponse.json({ success: false, message: "Excel export is only available to admins." }, { status: 403 });
    }

    const orderId = (searchParams.get("orderId") ?? "").trim();
    if (!orderId || !/^[a-zA-Z0-9_-]+$/.test(orderId) || orderId.length > 255) {
      return NextResponse.json({ success: false, message: "Invalid order ID" }, { status: 400 });
    }

    const order = await prisma.salesOrder.findUnique({
      where: { orderId },
      include: {
        items: {
          include: {
            modelPrice: {
              select: {
                brandName: true,
                condition: true,
                origin: true,
                brand: { select: { brandName: true } },
              },
            },
          },
        },
        customer: { select: { email: true, companyName: true, taxId: true } },
      },
    });
    if (!order || (!admin && order.customerId !== customerId)) {
      return NextResponse.json({ success: false, message: "Order not found or unauthorized" }, { status: 404 });
    }
    if (order.items.length === 0) {
      return NextResponse.json({ success: false, message: "This order has no items." }, { status: 400 });
    }

    const payload: DocumentOrder = {
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      currency: order.currency,
      shippingName: order.shippingName,
      shippingPhone: order.shippingPhone,
      shippingAddress: order.shippingAddress,
      shippingCity: order.shippingCity,
      shippingCountry: order.shippingCountry,
      shippingZip: order.shippingZip,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      taxAmount: Number(order.taxAmount),
      discountAmount: Number(order.discountAmount),
      totalAmount: Number(order.totalAmount),
      paymentMethod: order.paymentMethod,
      paymentTerms: order.paymentTerms,
      deliveryTerms: order.deliveryTerms,
      hsCode: order.hsCode,
      customerNote: order.customerNote,
      buyerEmail: order.customer?.email ?? null,
      buyerCompany: order.customer?.companyName ?? null,
      buyerTaxId: order.customer?.taxId ?? null,
      origin: (() => {
        const origins = new Set(
          order.items
            .map((item) => item.modelPrice?.origin?.trim())
            .filter((value): value is string => Boolean(value))
        );
        if (origins.size === 0) return null;
        return origins.size === 1 ? [...origins][0] : "Mixed";
      })(),
      items: order.items.map((item) => ({
        productName: item.productName,
        // 品牌优先取价格行冗余品牌名，其次系列所属品牌
        brand: item.modelPrice?.brandName ?? item.modelPrice?.brand?.brandName ?? null,
        model: item.model,
        // 优先使用下单时的条件快照
        condition: item.condition ?? item.modelPrice?.condition ?? null,
        quantity: item.quantity,
        unitPrice: Number(item.finalSellPrice),
        subtotal: Number(item.subtotal),
        hsCode: item.hsCode,
      })),
    };

    const isExcel = format === "xlsx";
    const bytes = isExcel
      ? await generateOrderDocumentsExcel(payload)
      : Buffer.from(await generateOrderDocuments(payload));
    const filename = `${order.orderNumber}-Documents.${isExcel ? "xlsx" : "pdf"}`;

    return new NextResponse(Uint8Array.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": isExcel
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/pdf",
        "Content-Length": String(bytes.length),
        "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.-]+/g, "_")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("order-documents route error:", error);
    return NextResponse.json({ success: false, message: "Failed to generate the documents." }, { status: 500 });
  }
}
