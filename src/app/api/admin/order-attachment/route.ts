import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth-admin";
import { saveOrderFile } from "@/lib/order-files";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

/**
 * POST /api/admin/order-attachment — 管理员上传 PI / 单证，落盘存档并在订单 adminNote 追加记录。
 */
export async function POST(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Please login as admin." }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ success: false, message: "Invalid form data" }, { status: 400 });
    }

    const orderId = (formData.get("orderId") ?? "").toString().trim();
    if (!orderId || !/^[a-zA-Z0-9_-]+$/.test(orderId) || orderId.length > 255) {
      return NextResponse.json({ success: false, message: "Invalid order ID" }, { status: 400 });
    }

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ success: false, message: "Please choose a file." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ success: false, message: "File must be 10 MB or smaller." }, { status: 400 });
    }
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "Unsupported file type. Please upload a PDF, image, Word or Excel file." },
        { status: 400 }
      );
    }

    const order = await prisma.salesOrder.findUnique({
      where: { orderId },
      select: { orderId: true, adminNote: true },
    });
    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    const safeName = await saveOrderFile(orderId, "pi", file);

    const stamp = new Date().toISOString();
    const noteLine = `[PI] ${admin.email} uploaded ${file.name} (${Math.round(file.size / 1024)} KB) at ${stamp}`;
    await prisma.salesOrder.update({
      where: { orderId },
      data: { adminNote: order.adminNote ? `${order.adminNote}\n${noteLine}` : noteLine },
    });

    return NextResponse.json({ success: true, message: "File uploaded.", file: safeName });
  } catch (error) {
    console.error("Admin order attachment upload error:", error);
    return NextResponse.json({ success: false, message: "Upload failed." }, { status: 500 });
  }
}
