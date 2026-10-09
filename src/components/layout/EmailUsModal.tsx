"use client";

/**
 * Email Us 弹窗 — 参照 mcmaster.com
 * 布局：标题 / 说明文案 / From 输入框 / 留言框 / SEND·CANCEL / 客服邮箱
 * SEND 调用 Server Action sendEmailInquiry，经 nodemailer + SMTP 转发到客服收件邮箱
 */
import { useState, useTransition } from "react";
import { ModalShell } from "./ModalShell";
import { sendEmailInquiry } from "@/app/actions/emailInquiryActions";

const inputClass =
  "w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#336633] focus:ring-1 focus:ring-[#336633]";
const labelClass = "block text-xs font-semibold text-slate-700 mb-1";

export function EmailUsModal({ onClose }: { onClose: () => void }) {
  const [from, setFrom] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from.trim());
  const canSend = emailValid && message.trim().length > 0 && !isPending;
  const showError = touched && !canSend && !isPending;

  const handleSend = () => {
    setTouched(true);
    setServerError(null);
    if (!emailValid || message.trim().length === 0) return;
    startTransition(async () => {
      const result = await sendEmailInquiry({ from, message });
      if (result.ok) {
        setSent(true);
      } else {
        setServerError(result.error ?? "Failed to send your message.");
      }
    });
  };

  return (
    <ModalShell title="Email Us" onClose={onClose} width="320px">
      {sent ? (
        <div className="py-4 text-center">
          <p className="text-sm font-semibold text-[#336633] mb-4">
            Your message has been sent.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded bg-[#336633] text-white text-sm font-bold hover:bg-[#2d5a2d] transition-colors"
          >
            Close
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <label htmlFor="email-us-from" className={labelClass}>
              From
            </label>
            <input
              id="email-us-from"
              type="email"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="your-email@example.com"
              className={inputClass}
              autoComplete="email"
              disabled={isPending}
            />
          </div>

          <div className="mb-5">
            <label htmlFor="email-us-message" className={labelClass}>
              Message
            </label>
            <textarea
              id="email-us-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Let us know what you need."
              rows={6}
              className={`${inputClass} resize-none`}
              disabled={isPending}
            />
            {showError && (
              <p className="mt-1.5 text-xs text-rose-600">
                Please enter a valid email address and your message.
              </p>
            )}
            {serverError && (
              <p className="mt-1.5 text-xs text-rose-600">{serverError}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSend}
              disabled={isPending}
              className="px-6 py-2 rounded bg-[#336633] text-white text-sm font-bold tracking-wide hover:bg-[#2d5a2d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? "SENDING…" : "SEND"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-6 py-2 rounded border border-slate-300 text-slate-700 text-sm font-bold tracking-wide hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              CANCEL
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}
