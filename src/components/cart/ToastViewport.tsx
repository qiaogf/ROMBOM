"use client";

// Global toast viewport (fixed top-right, auto-dismiss driven by CartProvider).
// Extracted from CartProvider.tsx (Phase 20) — pure move, zero behavior change.

export type ToastKind = "success" | "error" | "info";

export interface ToastState {
  id: number;
  kind: ToastKind;
  message: string;
}

export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastState[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-2 right-2 z-[9999] flex flex-col gap-1.5 w-[min(320px,calc(100vw-16px))]">
      {toasts.map((t) => {
        const palette =
          t.kind === "success"
            ? "bg-emerald-600 text-white border-emerald-800"
            : t.kind === "error"
            ? "bg-rose-600 text-white border-rose-800"
            : "bg-slate-700 text-white border-slate-900";
        return (
          <div
            key={t.id}
            onClick={() => onDismiss(t.id)}
            className={`rounded-md border shadow-lg px-3 py-2 text-xs cursor-pointer select-none animate-in slide-in-from-right fade-in ${palette}`}
            role="status"
          >
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
