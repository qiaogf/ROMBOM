"use client";

// 新建 API 账户行：客户下拉（仅已 Enable 且未绑定）+ Brand Series 勾选弹窗。
// 选中客户后自动带出 name/email；提交时一并传 customerId + brandSeriesFilter。

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createApiAccount } from "@/app/actions/adminActions";
import {
  numCls,
  customerDisplayName,
  seriesIdsToFilter,
} from "./api-account-types";
import { BrandSeriesPicker } from "./BrandSeriesPicker";
import type { CustomerOption, BrandSeriesOption } from "./api-account-types";

interface Props {
  customers: CustomerOption[];
  brandSeriesOptions: BrandSeriesOption[];
}

const EMPTY_ROW = {
  customerId: "",
  brandSeriesIds: [] as string[],
  markupRate: "0",
  quotaPerMinute: "60",
};

export function ApiAccountNewRow({ customers, brandSeriesOptions }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [newRow, setNewRow] = useState(EMPTY_ROW);

  const selectedCustomer =
    customers.find((c) => c.customerId === newRow.customerId) ?? null;

  const handleAdd = () => {
    if (!newRow.customerId) return;
    const fd = new FormData();
    fd.set("customerId", newRow.customerId);
    fd.set("brandSeriesFilter", seriesIdsToFilter(newRow.brandSeriesIds));
    fd.set("markupRate", newRow.markupRate);
    fd.set("quotaPerMinute", newRow.quotaPerMinute);
    startTransition(async () => {
      const res = await createApiAccount(fd);
      if (res.success) {
        setNewRow(EMPTY_ROW);
        router.refresh();
      }
    });
  };

  return (
    <tr className="bg-emerald-50/40">
      <td className="px-1 py-0.5">
        <select
          value={newRow.customerId}
          onChange={(e) => setNewRow({ ...newRow, customerId: e.target.value })}
          className="w-full border border-slate-300 rounded px-1 py-0.5 text-[11px] bg-white focus:outline-none focus:border-[#336633]"
        >
          <option value="">— Pick customer —</option>
          {customers.map((c) => (
            <option key={c.customerId} value={c.customerId}>
              {customerDisplayName(c)} ({c.email})
            </option>
          ))}
        </select>
      </td>
      <td className="px-1 py-0.5">
        <div className="w-full border border-slate-200 bg-slate-50 rounded px-1 py-0.5 text-[11px] text-slate-500 min-h-[20px]">
          {selectedCustomer?.email ?? (
            <span className="text-slate-300">—</span>
          )}
        </div>
      </td>
      <td className="px-1 py-0.5">
        <BrandSeriesPicker
          options={brandSeriesOptions}
          selected={newRow.brandSeriesIds}
          onChange={(ids) => setNewRow({ ...newRow, brandSeriesIds: ids })}
          placeholder="All brands"
        />
      </td>
      <td className="px-1 py-0.5">
        <span className="text-[10px] text-slate-300">—</span>
      </td>
      <td className="px-1 py-0.5">
        <input
          type="number"
          step="0.1"
          value={newRow.markupRate}
          onChange={(e) => setNewRow({ ...newRow, markupRate: e.target.value })}
          className={numCls}
        />
      </td>
      <td className="px-1 py-0.5">
        <input
          type="number"
          value={newRow.quotaPerMinute}
          onChange={(e) =>
            setNewRow({ ...newRow, quotaPerMinute: e.target.value })
          }
          className={numCls}
        />
      </td>
      <td className="px-1 py-0.5">
        <button
          type="button"
          onClick={handleAdd}
          disabled={pending || !newRow.customerId}
          className="px-2 py-0.5 text-[10px] font-medium text-white bg-[#336633] rounded hover:bg-[#2d5a2d] disabled:opacity-50"
        >
          Add
        </button>
      </td>
    </tr>
  );
}
