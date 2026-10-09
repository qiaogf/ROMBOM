﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { createSeries, updateSeries, deleteSeries } from "@/app/actions/adminActions";
import { DeleteButton } from "@/app/admin/DeleteButton";
import { useInlineEditTable } from "@/app/admin/_hooks/useInlineEditTable";
import {
  SaveCancelButtons,
  ActiveStatusBadge,
  EditActiveSelect,
} from "@/app/admin/_components/InlineEditActions";

interface SeriesItem {
  seriesId: string;
  seriesName: string;
  slug: string;
  isActive: boolean;
  brand: { brandId: string; brandName: string } | null;
  category: { categoryId: string; categoryName: string } | null;
}

interface BrandOption {
  brandId: string;
  brandName: string;
}

interface CategoryOption {
  categoryId: string;
  categoryName: string;
}

interface SeriesContentProps {
  series: SeriesItem[];
  brandOptions: BrandOption[];
  categoryOptions: CategoryOption[];
}

const inputClass =
  "w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#336633] focus:ring-1 focus:ring-[#336633]";

export function SeriesContent({ series, brandOptions, categoryOptions }: SeriesContentProps) {
  const {
    name, setName,
    error, setError,
    pending, startTransition,
    editingId,
    editName, setEditName,
    editActive, setEditActive,
    beginEdit, cancelEdit, finishEdit,
  } = useInlineEditTable();
  const router = useRouter();

  // 行内编辑的实体特有字段（brand / category）
  const [brandId, setBrandId] = useState(brandOptions[0]?.brandId || "");
  const [categoryId, setCategoryId] = useState("");
  const [editBrandId, setEditBrandId] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");

  const startEdit = (s: SeriesItem) => {
    beginEdit({ id: s.seriesId, name: s.seriesName, isActive: s.isActive });
    setEditBrandId(s.brand?.brandId ?? "");
    setEditCategoryId(s.category?.categoryId ?? "");
  };

  const handleSave = (seriesId: string) => {
    if (!editName.trim()) {
      setError("Series name is required.");
      return;
    }
    if (!editBrandId) {
      setError("Please select a brand.");
      return;
    }
    setError("");
    const fd = new FormData();
    fd.set("seriesId", seriesId);
    fd.set("seriesName", editName.trim());
    fd.set("brandId", editBrandId);
    if (editCategoryId) fd.set("categoryId", editCategoryId);
    fd.set("isActive", editActive ? "true" : "false");

    startTransition(async () => {
      const res = await updateSeries(fd);
      if (res.success) {
        finishEdit();
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  };

  const handleCreate = () => {
    if (!name.trim()) {
      setError("Series name is required.");
      return;
    }
    if (!brandId) {
      setError("Please select a brand.");
      return;
    }
    setError("");
    const fd = new FormData();
    fd.set("seriesName", name.trim());
    fd.set("brandId", brandId);
    if (categoryId) fd.set("categoryId", categoryId);

    startTransition(async () => {
      const res = await createSeries(fd);
      if (res.success) {
        setName("");
        setCategoryId("");
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  };

  return (
    <div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full w-full table-fixed text-xs">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[20%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[11%]" />
              <col className="w-[15%]" />
            </colgroup>
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
              <tr>
                <th className="px-1.5 py-0.5 text-left">Series Name</th>
                <th className="px-1.5 py-0.5 text-left">Slug</th>
                <th className="px-1.5 py-0.5 text-left">Brand</th>
                <th className="px-1.5 py-0.5 text-left">Category</th>
                <th className="px-1.5 py-0.5 text-left">Active</th>
                <th className="px-1.5 py-0.5 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {series.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-left text-slate-400">
                    No series found
                  </td>
                </tr>
              ) : (
                series.map((s) => {
                  const isEditing = editingId === s.seriesId;
                  if (isEditing) {
                    return (
                      <tr key={s.seriesId} className="bg-blue-50/40">
                        <td className="px-1.5 py-0.5">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className={inputClass}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSave(s.seriesId);
                              if (e.key === "Escape") cancelEdit();
                            }}
                          />
                        </td>
                        <td className="px-1.5 py-0.5 text-slate-400 text-[11px] italic">auto</td>
                        <td className="px-1.5 py-0.5">
                          <select
                            value={editBrandId}
                            onChange={(e) => setEditBrandId(e.target.value)}
                            className={inputClass}
                          >
                            <option value="">— Select —</option>
                            {brandOptions.map((b) => (
                              <option key={b.brandId} value={b.brandId}>
                                {b.brandName}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1.5 py-0.5">
                          <select
                            value={editCategoryId}
                            onChange={(e) => setEditCategoryId(e.target.value)}
                            className={inputClass}
                            title="Leave empty to auto-assign by brand"
                          >
                            <option value="">Auto by brand</option>
                            {categoryOptions.map((c) => (
                              <option key={c.categoryId} value={c.categoryId}>
                                {c.categoryName}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1.5 py-0.5">
                          <EditActiveSelect
                            value={editActive}
                            onChange={setEditActive}
                            className={inputClass}
                          />
                        </td>
                        <td className="px-1.5 py-0.5 whitespace-nowrap">
                          <SaveCancelButtons
                            onSave={() => handleSave(s.seriesId)}
                            onCancel={cancelEdit}
                            pending={pending}
                          />
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={s.seriesId} className="hover:bg-slate-50">
                      <td className="px-1.5 py-0.5 text-slate-800 font-medium truncate" title={s.seriesName}>{s.seriesName}</td>
                      <td className="px-1.5 py-0.5 text-slate-600 text-[11px] truncate" title={s.slug}>{s.slug}</td>
                      <td className="px-1.5 py-0.5 text-slate-600 truncate" title={s.brand?.brandName ?? ""}>
                        {s.brand?.brandName ?? <span className="text-slate-400 italic">—</span>}
                      </td>
                      <td className="px-1.5 py-0.5 text-slate-600 truncate" title={s.category?.categoryName ?? ""}>
                        {s.category?.categoryName ?? <span className="text-slate-400 italic">—</span>}
                      </td>
                      <td className="px-1.5 py-0.5">
                        <ActiveStatusBadge isActive={s.isActive} />
                      </td>
                      <td className="px-1.5 py-0.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => startEdit(s)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit this series"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                        <span className="ml-2 inline-flex align-middle">
                          <DeleteButton
                            id={s.seriesId}
                            action={deleteSeries}
                            label={s.seriesName}
                            entity="series"
                          />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}

              {/* 行内新建行 */}
              <tr className="bg-amber-50/50">
                <td className="px-1.5 py-0.5">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="New series name"
                    className={inputClass}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate();
                    }}
                  />
                </td>
                <td className="px-1.5 py-0.5 text-slate-400 text-[11px] italic">auto</td>
                <td className="px-1.5 py-0.5">
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">— Select —</option>
                    {brandOptions.map((b) => (
                      <option key={b.brandId} value={b.brandId}>
                        {b.brandName}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-1.5 py-0.5">
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className={inputClass}
                    title="Leave empty to auto-assign by brand"
                  >
                    <option value="">Auto by brand</option>
                    {categoryOptions.map((c) => (
                      <option key={c.categoryId} value={c.categoryId}>
                        {c.categoryName}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-1.5 py-0.5 text-slate-400 text-[11px]">Active</td>
                <td className="px-1.5 py-0.5">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={pending || brandOptions.length === 0}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-white bg-[#336633] hover:bg-[#2d5a2d] rounded disabled:opacity-50"
                    title={brandOptions.length === 0 ? "No brands available" : ""}
                  >
                    <Plus className="w-3 h-3" />
                    {pending ? "..." : "Add"}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {error && <p className="text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}
