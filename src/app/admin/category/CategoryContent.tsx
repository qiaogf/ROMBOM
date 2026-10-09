﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { createCategory, updateCategory, deleteCategory } from "@/app/actions/adminActions";
import { DeleteButton } from "@/app/admin/DeleteButton";
import { useInlineEditTable } from "@/app/admin/_hooks/useInlineEditTable";
import {
  SaveCancelButtons,
  ActiveStatusBadge,
  EditActiveSelect,
} from "@/app/admin/_components/InlineEditActions";

interface CategoryItem {
  categoryId: string;
  categoryName: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  parentId: string;
}

interface CategoryOption {
  categoryId: string;
  categoryName: string;
}

interface CategoryContentProps {
  categories: CategoryItem[];
  parentOptions: CategoryOption[];
}

const inputClass =
  "w-full border border-slate-300 rounded px-1.5 py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#336633] focus:ring-1 focus:ring-[#336633]";

export function CategoryContent({ categories, parentOptions }: CategoryContentProps) {
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

  // 行内编辑的实体特有字段（parent）
  const [parentId, setParentId] = useState("0");
  const [editParentId, setEditParentId] = useState("0");

  const parentById = new Map(parentOptions.map((c) => [c.categoryId, c.categoryName]));

  const startEdit = (cat: CategoryItem) => {
    beginEdit({ id: cat.categoryId, name: cat.categoryName, isActive: cat.isActive });
    setEditParentId(cat.parentId && cat.parentId !== "0" ? cat.parentId : "0");
  };

  const handleSave = (categoryId: string) => {
    if (!editName.trim()) {
      setError("Category name is required.");
      return;
    }
    setError("");
    const fd = new FormData();
    fd.set("categoryId", categoryId);
    fd.set("categoryName", editName.trim());
    fd.set("parentId", editParentId);
    fd.set("isActive", editActive ? "true" : "false");

    startTransition(async () => {
      const res = await updateCategory(fd);
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
      setError("Category name is required.");
      return;
    }
    setError("");
    const fd = new FormData();
    fd.set("categoryName", name.trim());
    fd.set("parentId", parentId);

    startTransition(async () => {
      const res = await createCategory(fd);
      if (res.success) {
        setName("");
        setParentId("0");
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
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
              <tr>
                <th className="px-1.5 py-1 text-left">Name</th>
                <th className="px-1.5 py-1 text-left">Slug</th>
                <th className="px-1.5 py-1 text-right">Sort Order</th>
                <th className="px-1.5 py-1 text-left">Active</th>
                <th className="px-1.5 py-1 text-left">Parent</th>
                <th className="px-1.5 py-1 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                    No categories found
                  </td>
                </tr>
              ) : (
                categories.map((cat) => {
                  const isEditing = editingId === cat.categoryId;
                  if (isEditing) {
                    return (
                      <tr key={cat.categoryId} className="bg-blue-50/40">
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className={inputClass}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSave(cat.categoryId);
                              if (e.key === "Escape") cancelEdit();
                            }}
                          />
                        </td>
                        <td className="px-2 py-1 text-slate-400 text-[11px] italic">auto</td>
                        <td className="px-2 py-1 text-right text-slate-600">{cat.sortOrder}</td>
                        <td className="px-2 py-1">
                          <EditActiveSelect
                            value={editActive}
                            onChange={setEditActive}
                            className={inputClass}
                          />
                        </td>
                        <td className="px-2 py-1">
                          <select
                            value={editParentId}
                            onChange={(e) => setEditParentId(e.target.value)}
                            className={inputClass}
                          >
                            <option value="0">— Top Level —</option>
                            {parentOptions
                              .filter((p) => p.categoryId !== cat.categoryId)
                              .map((p) => (
                                <option key={p.categoryId} value={p.categoryId}>
                                  {p.categoryName}
                                </option>
                              ))}
                          </select>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          <SaveCancelButtons
                            onSave={() => handleSave(cat.categoryId)}
                            onCancel={cancelEdit}
                            pending={pending}
                          />
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={cat.categoryId} className="hover:bg-slate-50">
                      <td className="px-1.5 py-1 text-slate-800 font-medium">{cat.categoryName}</td>
                      <td className="px-1.5 py-1 text-slate-600 text-[11px]">{cat.slug}</td>
                      <td className="px-1.5 py-1 text-right text-slate-600">{cat.sortOrder}</td>
                      <td className="px-1.5 py-1">
                        <ActiveStatusBadge isActive={cat.isActive} />
                      </td>
                      <td className="px-1.5 py-1 text-slate-600 text-[11px]">
                        {cat.parentId && cat.parentId !== "0"
                          ? parentById.get(cat.parentId) ?? (
                              <span className="text-slate-400 italic">
                                (deleted #{cat.parentId.slice(-6)})
                              </span>
                            )
                          : <span className="text-slate-400 italic">—</span>}
                      </td>
                      <td className="px-1.5 py-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => startEdit(cat)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit this category"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                        <span className="ml-2 inline-flex align-middle">
                          <DeleteButton
                            id={cat.categoryId}
                            action={deleteCategory}
                            label={cat.categoryName}
                            entity="category"
                          />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}

              {/* 行内新建行 */}
              <tr className="bg-amber-50/50">
                <td className="px-2 py-1">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="New category name"
                    className={inputClass}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate();
                    }}
                  />
                </td>
                <td className="px-2 py-1 text-slate-400 text-[11px] italic">auto</td>
                <td className="px-2 py-1 text-slate-400 text-center">—</td>
                <td className="px-2 py-1 text-slate-400 text-[11px]">Active</td>
                <td className="px-2 py-1">
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="0">— Top Level —</option>
                    {parentOptions.map((p) => (
                      <option key={p.categoryId} value={p.categoryId}>
                        {p.categoryName}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={pending}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-white bg-[#336633] hover:bg-[#2d5a2d] rounded disabled:opacity-50"
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
