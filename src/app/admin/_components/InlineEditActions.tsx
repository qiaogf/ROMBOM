"use client";

// Shared row-level UI for admin inline-edit tables (Series / Category).
// Extracted in Phase 18 — pure move, zero behavior change.

import { Check, X } from "lucide-react";

/** 编辑行操作列：Save + Cancel 按钮对 */
export function SaveCancelButtons({
  onSave,
  onCancel,
  pending,
}: {
  onSave: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onSave}
        disabled={pending}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-white bg-[#336633] hover:bg-[#2d5a2d] rounded disabled:opacity-50"
        title="Save"
      >
        <Check className="w-3 h-3" />
        {pending ? "..." : "Save"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50"
        title="Cancel"
      >
        <X className="w-3 h-3" />
      </button>
    </>
  );
}

/** Active/Inactive 状态徽标 */
export function ActiveStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] rounded ${
        isActive
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

/** 编辑行 Active 下拉（className 由各表格传入以保持原有样式） */
export function EditActiveSelect({
  value,
  onChange,
  className,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  className: string;
}) {
  return (
    <select
      value={value ? "true" : "false"}
      onChange={(e) => onChange(e.target.value === "true")}
      className={className}
    >
      <option value="true">Active</option>
      <option value="false">Inactive</option>
    </select>
  );
}
