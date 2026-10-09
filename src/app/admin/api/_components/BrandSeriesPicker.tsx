"use client";

// Brand Series 两级勾选弹窗：按 Brand 分组列出其下 Series；
// 勾 Brand = 全选其下 Series；已选项以 chips 展示。
// 选中值为 seriesId 数组（CSV 由父组件负责序列化为 brandSeriesFilter）。

import { useEffect, useRef, useState } from "react";
import type { BrandSeriesOption } from "./api-account-types";

interface Props {
  options: BrandSeriesOption[];
  /** 当前选中的 seriesId 数组 */
  selected: string[];
  /** 选中项变化回调 */
  onChange: (seriesIds: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function BrandSeriesPicker({
  options,
  selected,
  onChange,
  disabled,
  placeholder = "All brands",
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 点外部关闭弹窗
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedSet = new Set(selected);

  // 已选项的展示 chips：查找 brandName/seriesName
  const chips: { seriesId: string; label: string }[] = [];
  for (const brand of options) {
    for (const s of brand.series) {
      if (selectedSet.has(s.seriesId)) {
        chips.push({ seriesId: s.seriesId, label: `${brand.brandName} / ${s.seriesName}` });
      }
    }
  }

  const toggleSeries = (seriesId: string) => {
    if (selectedSet.has(seriesId)) {
      onChange(selected.filter((id) => id !== seriesId));
    } else {
      onChange([...selected, seriesId]);
    }
  };

  const toggleBrand = (brand: BrandSeriesOption) => {
    const brandSeriesIds = brand.series.map((s) => s.seriesId);
    const allSelected =
      brandSeriesIds.length > 0 &&
      brandSeriesIds.every((id) => selectedSet.has(id));
    if (allSelected) {
      // 取消该品牌下全部系列
      const drop = new Set(brandSeriesIds);
      onChange(selected.filter((id) => !drop.has(id)));
    } else {
      // 选中该品牌下全部系列（去重合并）
      const merged = new Set(selected);
      for (const id of brandSeriesIds) merged.add(id);
      onChange(Array.from(merged));
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className="w-full border border-slate-300 rounded px-1 py-0.5 text-[11px] text-left bg-white hover:border-[#336633] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
      >
        <span className={chips.length === 0 ? "text-slate-400" : "text-slate-900"}>
          {chips.length === 0 ? placeholder : `${chips.length} series selected`}
        </span>
        <span className="text-slate-400 text-[9px]">▾</span>
      </button>

      {/* 已选 chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-0.5 mt-0.5">
          {chips.map((c) => (
            <span
              key={c.seriesId}
              className="inline-flex items-center gap-0.5 bg-[#336633]/10 text-[#336633] text-[9px] px-1 py-px rounded leading-tight"
            >
              {c.label}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggleSeries(c.seriesId)}
                  className="text-[#336633]/60 hover:text-[#336633] leading-none"
                  aria-label={`Remove ${c.label}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* 弹出勾选树 */}
      {open && (
        <div className="absolute z-50 mt-1 w-72 max-h-72 overflow-auto bg-white border border-slate-300 rounded shadow-lg p-1.5">
          {options.length === 0 ? (
            <div className="text-[10px] text-slate-400 p-1">No brands available.</div>
          ) : (
            options.map((brand) => {
              const brandSeriesIds = brand.series.map((s) => s.seriesId);
              const checkedCount = brandSeriesIds.filter((id) =>
                selectedSet.has(id)
              ).length;
              const allChecked =
                brandSeriesIds.length > 0 && checkedCount === brandSeriesIds.length;
              const someChecked = checkedCount > 0 && !allChecked;
              return (
                <div key={brand.brandId} className="mb-1">
                  <label className="flex items-center gap-1 px-1 py-0.5 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = someChecked;
                      }}
                      onChange={() => toggleBrand(brand)}
                      className="w-2.5 h-2.5"
                    />
                    <span className="text-[10px] font-semibold text-slate-700">
                      {brand.brandName}
                    </span>
                    {checkedCount > 0 && (
                      <span className="text-[9px] text-slate-400">
                        ({checkedCount}/{brandSeriesIds.length})
                      </span>
                    )}
                  </label>
                  {brand.series.length > 0 && (
                    <div className="ml-3">
                      {brand.series.map((s) => (
                        <label
                          key={s.seriesId}
                          className="flex items-center gap-1 px-1 py-0.5 hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSet.has(s.seriesId)}
                            onChange={() => toggleSeries(s.seriesId)}
                            className="w-2.5 h-2.5"
                          />
                          <span className="text-[10px] text-slate-600">{s.seriesName}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
