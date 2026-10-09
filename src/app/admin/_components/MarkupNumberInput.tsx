"use client";

/**
 * 行内 Markup (%) 数字输入框（共享组件）
 * - 仅允许 0-1000、最多 2 位小数
 * - 键盘拦截非法字符、粘贴内容清洗、实时校验
 * - Enter / 失焦提交，Esc 取消；提交成功后回调 onCommitted
 */
import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";

const MARKUP_MIN = 0;
const MARKUP_MAX = 1000;
const MARKUP_MAX_DECIMALS = 2;

/** 判断键入字符是否合法（数字、小数点、控制键放行） */
function isAllowedKey(e: React.KeyboardEvent<HTMLInputElement>): boolean {
  const key = e.key;
  if (
    key === "Backspace" ||
    key === "Delete" ||
    key === "ArrowLeft" ||
    key === "ArrowRight" ||
    key === "Home" ||
    key === "End" ||
    key === "Tab" ||
    key === "Enter" ||
    key === "Escape" ||
    e.ctrlKey ||
    e.metaKey
  ) {
    return true;
  }
  if (/^\d$/.test(key)) return true;
  if (key === ".") {
    const el = e.currentTarget;
    const sel = el.value.slice(el.selectionStart ?? 0, el.selectionEnd ?? 0);
    if (sel.includes(".")) return true;
    return !el.value.includes(".");
  }
  return false;
}

/** 实时校验：空串合法（视为 0），否则返回错误信息 */
export function validateMarkupValue(raw: string): string {
  if (raw === "") return "";
  const num = Number(raw);
  if (!Number.isFinite(num)) return "Invalid number";
  if (num < MARKUP_MIN) return `≥ ${MARKUP_MIN}`;
  if (num > MARKUP_MAX) return `≤ ${MARKUP_MAX}`;
  if (raw.includes(".")) {
    const decimals = raw.split(".")[1]?.length ?? 0;
    if (decimals > MARKUP_MAX_DECIMALS) return `≤ ${MARKUP_MAX_DECIMALS} decimals`;
  }
  return "";
}

export interface MarkupCommitResult {
  success: boolean;
  message: string;
}

interface MarkupNumberInputProps {
  /** 当前 markup 值（null/undefined 显示为空） */
  initialValue?: number | null;
  /** 成本价：传入时显示 ≈ 售价预览 */
  costPrice?: number | null;
  /** 提交回调，percent 为空串时按 "0" 提交 */
  onCommit: (percent: string) => Promise<MarkupCommitResult>;
  /** 提交成功后回调（如 router.refresh） */
  onCommitted?: () => void;
  inputClassName?: string;
  placeholder?: string;
}

export function MarkupNumberInput({
  initialValue = null,
  costPrice = null,
  onCommit,
  onCommitted,
  inputClassName = "w-16",
  placeholder = "0",
}: MarkupNumberInputProps) {
  const initialStr = initialValue === null || initialValue === undefined ? "" : String(initialValue);
  const [value, setValue] = useState<string>(initialStr);
  const [original] = useState<string>(initialStr);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const dirty = value !== original;
  const inputError = validateMarkupValue(value);

  const commit = () => {
    if (!dirty) return;
    const vError = validateMarkupValue(value);
    if (vError) {
      setError(vError);
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await onCommit(value === "" ? "0" : value);
      if (res.success) {
        onCommitted?.();
      } else {
        setError(res.message);
      }
    });
  };

  const reset = () => {
    setValue(original);
    setError("");
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text/plain").trim();
    const cleaned = pasted.replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    const sanitized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("")}` : cleaned;
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    setValue(el.value.slice(0, start) + sanitized + el.value.slice(end));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      reset();
      return;
    }
    if (!isAllowedKey(e)) e.preventDefault();
  };

  const hasError = !!error || !!inputError;
  const displayError = error || inputError;

  return (
    <div>
      <div className="inline-flex items-center gap-1">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={commit}
          disabled={pending}
          placeholder={placeholder}
          className={`text-right text-xs border rounded px-1.5 py-1 focus:outline-none focus:ring-1 ${inputClassName} ${
            hasError
              ? "border-rose-300 focus:ring-rose-400"
              : dirty
                ? "border-amber-300 focus:ring-amber-400 bg-amber-50"
                : "border-slate-300 focus:ring-blue-400"
          }`}
        />
        {dirty && !inputError && (
          <button
            type="button"
            onClick={commit}
            disabled={pending}
            className="text-emerald-600 hover:text-emerald-700"
            title="Save"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        {dirty && (
          <button
            type="button"
            onClick={reset}
            disabled={pending}
            className="text-slate-400 hover:text-slate-600"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {displayError && (
        <div className="text-[10px] text-rose-500 mt-0.5 whitespace-nowrap">{displayError}</div>
      )}
      {!hasError && costPrice !== null && value && Number(value) > 0 && costPrice > 0 && (
        <div className="text-[10px] text-slate-400 mt-0.5">
          ≈ ${(costPrice * (1 + Number(value) / 100)).toFixed(2)}
        </div>
      )}
    </div>
  );
}
