"use client";

/**
 * 整批 Markup（加价）按钮 — 弹窗输入加价百分比
 * 计算规则：Sell Price = Cost Price × (1 + Markup%)
 */
import { useState, useTransition } from "react";
import { Percent, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { applyBatchMarkup } from "@/app/actions/adminActions";

interface BatchMarkupButtonProps {
  importBatchId: string;
  fileName: string;
}

export function BatchMarkupButton({ importBatchId, fileName }: BatchMarkupButtonProps) {
  const [open, setOpen] = useState(false);
  const [percent, setPercent] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  const submit = () => {
    setError("");
    const fd = new FormData();
    fd.set("importBatchId", importBatchId);
    fd.set("markupPercent", percent);
    startTransition(async () => {
      const res = await applyBatchMarkup(fd);
      if (res.success) {
        setOpen(false);
        setPercent("");
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setError("");
        }}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
        title={`Apply markup to all rows in ${fileName}`}
      >
        <Percent className="w-3.5 h-3.5" />
        <span>Markup</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg shadow-lg">
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Apply Markup</h3>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError("");
                }}
                disabled={pending}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-4 space-y-3">
              <p className="text-xs text-slate-500 truncate">
                File: <span className="font-medium text-slate-700">{fileName}</span>
              </p>
              <div>
                <label htmlFor={`markup-${importBatchId}`} className="block text-xs font-medium text-slate-600 mb-1">
                  Markup (%)
                </label>
                <input
                  id={`markup-${importBatchId}`}
                  type="number"
                  min="0"
                  max="1000"
                  step="0.1"
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                  placeholder="e.g. 15 for +15%"
                  autoFocus
                  disabled={pending}
                  className="block w-full text-sm text-slate-800 border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-slate-400">Sell Price = Cost Price × (1 + Markup%)</p>
              {error && <p className="text-xs text-rose-600">{error}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 px-2.5 py-1.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError("");
                }}
                disabled={pending}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending || percent === ""}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-60"
              >
                {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {pending ? "Applying..." : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
