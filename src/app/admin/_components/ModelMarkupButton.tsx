﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿"use client";

/**
 * 单型号 Markup（加价）按钮 — 弹窗输入加价百分比
 * 计算规则：Sell Price = Cost Price × (1 + Markup%)
 * kind="model" → 线上 ModelPrice 行；kind="item" → pending 批次暂存行
 */
import { useState, useTransition } from "react";
import { Percent, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { applyModelMarkup, applyItemMarkup } from "@/app/actions/adminActions";

interface ModelMarkupButtonProps {
  kind: "model" | "item";
  rowId: string;
  model: string;
  /** 当前行已应用的加价百分比；null 表示未加价 */
  currentMarkup: number | null;
}

export function ModelMarkupButton({ kind, rowId, model, currentMarkup }: ModelMarkupButtonProps) {
  const [open, setOpen] = useState(false);
  const [percent, setPercent] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  const submit = () => {
    setError("");
    const fd = new FormData();
    fd.set("markupPercent", percent);
    if (kind === "model") fd.set("modelPriceId", rowId);
    else fd.set("itemId", rowId);
    startTransition(async () => {
      const res = kind === "model" ? await applyModelMarkup(fd) : await applyItemMarkup(fd);
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
        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors whitespace-nowrap"
        title={`Apply markup to model ${model}`}
      >
        <Percent className="w-3 h-3" />
        Markup
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
                Model: <span className="font-medium text-slate-700">{model}</span>
              </p>
              <div>
                <label htmlFor={`markup-${kind}-${rowId}`} className="block text-xs font-medium text-slate-600 mb-1">
                  Markup (%)
                </label>
                <input
                  id={`markup-${kind}-${rowId}`}
                  type="number"
                  min="0"
                  max="1000"
                  step="0.1"
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                  placeholder={currentMarkup !== null ? `Current: ${currentMarkup}%` : "e.g. 15 for +15%"}
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
