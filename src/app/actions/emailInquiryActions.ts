"use server";

/**
 * Email Us 留言转发 Server Action
 * 通过 nodemailer + SMTP 将访客留言转发到客服收件邮箱。
 * 全部凭证从环境变量读取，绝不硬编码；适配 Vercel serverless：每次请求新建 transporter，不维护全局连接池。
 */
import nodemailer from "nodemailer";

export interface SendEmailInquiryInput {
  from: string;
  message: string;
}

export interface SendEmailInquiryResult {
  ok: boolean;
  error?: string;
}

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function sendEmailInquiry(
  input: SendEmailInquiryInput
): Promise<SendEmailInquiryResult> {
  try {
    const fromRaw = (input?.from ?? "").trim();
    const messageRaw = (input?.message ?? "").trim();

    if (!isEmail(fromRaw)) {
      return { ok: false, error: "Please enter a valid email address." };
    }
    if (messageRaw.length === 0) {
      return { ok: false, error: "Message cannot be empty." };
    }
    if (messageRaw.length > 5000) {
      return { ok: false, error: "Message is too long (max 5000 characters)." };
    }

    const host = env("SMTP_HOST");
    const portStr = env("SMTP_PORT");
    const user = env("SMTP_USER");
    const pass = env("SMTP_PASS");
    const toEmail = env("INQUIRY_TO_EMAIL");

    if (!host || !user || !pass || !toEmail) {
      // 凭证缺失属于配置错误，向调用方返回明确错误而非崩溃
      return {
        ok: false,
        error:
          "Email service is not configured. Please contact us directly at the address below."
      };
    }

    const port = portStr ? Number.parseInt(portStr, 10) : 587;
    if (!Number.isFinite(port) || port <= 0 || port > 65535) {
      return { ok: false, error: "Invalid SMTP port configuration." };
    }
    // 465 → SSL 直连（secure:true）；587/25 → STARTTLS（secure:false）
    const secure = port === 465;
    const fromEmail = env("INQUIRY_FROM_EMAIL") ?? user;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });

    const submittedAt = new Date().toISOString();

    await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      replyTo: fromRaw,
      subject: `New inquiry from ${fromRaw}`,
      text: `From: ${fromRaw}\nSubmitted: ${submittedAt}\n\nMessage:\n${messageRaw}`
    });

    return { ok: true };
  } catch (error) {
    console.error("sendEmailInquiry error:", error);
    return {
      ok: false,
      error: "Failed to send your message. Please try again later."
    };
  }
}
