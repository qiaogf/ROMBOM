﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Check, X } from "lucide-react";
import { createBrand, updateBrand, deleteBrand } from "@/app/actions/adminActions";
import { DeleteButton } from "@/app/admin/DeleteButton";

interface BrandItem {
  brandId: string;
  brandName: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}

interface BrandContentProps {
  brands: BrandItem[];
}

const inputClass =
  "w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#336633] focus:ring-1 focus:ring-[#336633]";

export function BrandContent({ brands }: BrandContentProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // 行内编辑状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);

  const startEdit = (brand: BrandItem) => {
    setError("");
    setEditingId(brand.brandId);
    setEditName(brand.brandName);
    setEditActive(brand.isActive);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError("");
  };

  const handleSave = (brandId: string) => {
    if (!editName.trim()) {
      setError("Brand name is required.");
      return;
    }
    setError("");
    const fd = new FormData();
    fd.set("brandId", brandId);
    fd.set("brandName", editName.trim());
    fd.set("isActive", editActive ? "true" : "false");

    startTransition(async () => {
      const res = await updateBrand(fd);
      if (res.success) {
        setEditingId(null);
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  };

  const handleCreate = () => {
    if (!name.trim()) {
      setError("Brand name is required.");
      return;
    }
    setError("");
    const fd = new FormData();
    fd.set("brandName", name.trim());

    startTransition(async () => {
      const res = await createBrand(fd);
      if (res.success) {
        setName("");
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
              <col className="w-[30%]" />
              <col className="w-[28%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
              <tr>
                <th className="px-1.5 py-0.5 text-left">Brand Name</th>
                <th className="px-1.5 py-0.5 text-left">Slug</th>
                <th className="px-1.5 py-0.5 text-left">Sort Order</th>
                <th className="px-1.5 py-0.5 text-left">Active</th>
                <th className="px-1.5 py-0.5 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {brands.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-left text-slate-400">
                    No brands found
                  </td>
                </tr>
              ) : (
                brands.map((brand) => {
                  const isEditing = editingId === brand.brandId;
                  if (isEditing) {
                    return (
                      <tr key={brand.brandId} className="bg-blue-50/40">
                        <td className="px-1.5 py-0.5">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className={inputClass}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSave(brand.brandId);
                              if (e.key === "Escape") cancelEdit();
                            }}
                          />
                        </td>
                        <td className="px-1.5 py-0.5 text-slate-400 text-[11px] italic">auto</td>
                        <td className="px-1.5 py-0.5 text-left text-slate-600">{brand.sortOrder}</td>
                        <td className="px-1.5 py-0.5">
                          <select
                            value={editActive ? "true" : "false"}
                            onChange={(e) => setEditActive(e.target.value === "true")}
                            className={inputClass}
                          >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        </td>
                        <td className="px-1.5 py-0.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleSave(brand.brandId)}
                            disabled={pending}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-white bg-[#336633] hover:bg-[#2d5a2d] rounded disabled:opacity-50"
                            title="Save"
                          >
                            <Check className="w-3 h-3" />
                            {pending ? "..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={pending}
                            className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50"
                            title="Cancel"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={brand.brandId} className="hover:bg-slate-50">
                      <td className="px-1.5 py-0.5 text-slate-800 font-medium truncate" title={brand.brandName}>{brand.brandName}</td>
                      <td className="px-1.5 py-0.5 text-slate-600 text-[11px] truncate" title={brand.slug}>{brand.slug}</td>
                      <td className="px-1.5 py-0.5 text-left text-slate-600">{brand.sortOrder}</td>
                      <td className="px-1.5 py-0.5">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 text-[10px] rounded ${
                            brand.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {brand.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-1.5 py-0.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => startEdit(brand)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit this brand"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                        <span className="ml-2 inline-flex align-middle">
                          <DeleteButton
                            id={brand.brandId}
                            action={deleteBrand}
                            label={brand.brandName}
                            entity="brand"
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
                    placeholder="New brand name"
                    className={inputClass}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate();
                    }}
                  />
                </td>
                <td className="px-1.5 py-0.5 text-slate-400 text-[11px] italic">auto</td>
                <td className="px-1.5 py-0.5 text-slate-400 text-left">—</td>
                <td className="px-1.5 py-0.5 text-slate-400 text-[11px]">Active</td>
                <td className="px-1.5 py-0.5">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={pending}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-white bg-[#336633] hover:bg-[#2d5a2d] rounded disabled:opacity-50"
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
