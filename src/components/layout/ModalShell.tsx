"use client";

/**
 * 通用弹窗外壳（Header / Footer 各登录弹窗共用）
 * · 关键修复：使用 React Portal 渲染到 document.body，彻底规避
 *   页面布局祖先的 overflow/transform/z-index stacking context
 *   导致弹窗被截断或无法显示的问题
 * · 遮罩点击 / Esc / 右上角 X 关闭
 * · Arial 字体，McMaster 风格白色面板
 */
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalShellProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}

export function ModalShell({ title, onClose, children, width = "320px" }: ModalShellProps) {
  const [mounted, setMounted] = useState(false);

  // Esc 键关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // 打开弹窗时禁止 body 滚动，避免遮罩下页面穿透滚动
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setMounted(true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // SSR 时 document 不存在，需等 mounted 后再 portal
  const node = (
    <div
      className="fixed inset-0 z-[2000] flex items-start justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
          className="mt-10 sm:mt-14 w-[min(320px,100%)] bg-white rounded shadow-2xl"
          style={{ fontFamily: "Arial, Helvetica, sans-serif", maxWidth: width }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="text-sm font-bold text-slate-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              title="Close"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="px-4 pb-4 max-h-[64vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );

  if (typeof document === "undefined" || !mounted) return null;
  return createPortal(node, document.body);
}
