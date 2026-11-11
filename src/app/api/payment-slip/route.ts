import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { saveOrderFile } from "@/lib/order-files";

export const dynamic = "force-dynamic";

const MAX_SLIP_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

/**
 * POST /api/payment-slip — 上传转账水单并邮件转发到收款邮箱。
 * 文件不落库：邮件发送成功后仅在订单 adminNote 追加一行上传记录。
 */
export async function POST(request: Request) {
  try {
    const customerId = await getCurrentUserId();
    if (!customerId) {
      return NextResponse.json({ success: false, message: "Please login first." }, { status: 401 });
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
      return NextResponse.json({ success: false, message: "Please choose a slip file." }, { status: 400 });
    }
    if (file.size > MAX_SLIP_BYTES) {
      return NextResponse.json({ success: false, message: "Slip file must be 5 MB or smaller." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "Unsupported file type. Please upload an image or PDF." },
        { status: 400 }
      );
    }

    const order = await prisma.salesOrder.findUnique({
      where: { orderId },
      select: { customerId: true, orderNumber: true, adminNote: true },
    });
    if (!order || order.customerId !== customerId) {
      return NextResponse.json({ success: false, message: "Order not found or unauthorized" }, { status: 404 });
    }

    const host = env("SMTP_HOST");
    const portStr = env("SMTP_PORT");
    const user = env("SMTP_USER");
    const pass = env("SMTP_PASS");
    if (!host || !user || !pass) {
      return NextResponse.json(
        { success: false, message: "Email service is not configured. Please contact support." },
        { status: 500 }
      );
    }

    const port = portStr ? Number.parseInt(portStr, 10) : 587;
    if (!Number.isFinite(port) || port <= 0 || port > 65535) {
      return NextResponse.json({ success: false, message: "Invalid SMTP port configuration." }, { status: 500 });
    }

    const toEmail = env("PAYMENT_SLIP_TO_EMAIL") ?? "qiaogf1@gmail.com";
    const fromEmail = env("INQUIRY_FROM_EMAIL") ?? user;
    const safeName =
      (file.name || "payment-slip").replace(/[^\w.\-]+/g, "_").slice(0, 120) || "payment-slip";

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const uploadedAt = new Date();
    const buffer = Buffer.from(await file.arrayBuffer());

    await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      subject: `Payment slip — Order ${order.orderNumber}`,
      text: [
        "A bank transfer slip was uploaded by the customer.",
        `Order: ${order.orderNumber} (${orderId})`,
        `File: ${safeName}`,
        `Uploaded at: ${uploadedAt.toISOString()}`,
      ].join("\n"),
      attachments: [{ filename: safeName, content: buffer }],
    });

    // 落盘存档，供管理员在 Admin Panel → Sales → Documents 下载
    await saveOrderFile(orderId, "slip", file);

    const noteLine = `[Bank slip uploaded] ${safeName} @ ${uploadedAt.toISOString()}`;
    await prisma.salesOrder.update({
      where: { orderId },
      data: {
        adminNote: order.adminNote ? `${order.adminNote}\n${noteLine}` : noteLine,
      },
    });

    return NextResponse.json({ success: true, message: "Bank slip sent." });
  } catch (error) {
    console.error("payment-slip route error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send the slip. Please try again later." },
      { status: 500 }
    );
  }
}
