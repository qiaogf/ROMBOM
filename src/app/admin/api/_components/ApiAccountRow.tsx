"use client";

// Existing-row：已绑定客户（只读展示）+ Brand Series 勾选弹窗 + 自动保存。
// 无 customerId 的 legacy 行仍保留 customerName/email 文本输入（向后兼容）。
// 已绑定行的 customerName/email 由后端从 customer 读出，不接受前端覆盖。

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateApiAccount, toggleApiAccount } from "@/app/actions/adminActions";
import {
  inputCls,
  numCls,
  seriesIdsToFilter,
  filterToSeriesIds,
} from "./api-account-types";
import { BrandSeriesPicker } from "./BrandSeriesPicker";
import type { ApiAccount, BrandSeriesOption } from "./api-account-types";
import type { ApiAccountEditsApi } from "./useApiAccountEdits";

interface Props {
  acc: ApiAccount;
  editsApi: ApiAccountEditsApi;
  brandSeriesOptions: BrandSeriesOption[];
}

export function ApiAccountRow({ acc, editsApi, brandSeriesOptions }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { getEdit, setEdit, clearEdit, hasEdits } = editsApi;

  const isBound = !!acc.customerId;

  const saveRow = () => {
    const fd = new FormData();
    fd.set("apiAccountId", acc.apiAccountId);
    fd.set(
      "brandSeriesFilter",
      getEdit(acc.apiAccountId, "brandSeriesFilter", acc.brandSeriesFilter)
    );
    fd.set(
      "markupRate",
      getEdit(acc.apiAccountId, "markupRate", String(acc.markupRate))
    );
    fd.set(
      "quotaPerMinute",
      getEdit(acc.apiAccountId, "quotaPerMinute", String(acc.quotaPerMinute))
    );
    // 仅 legacy 行（无 customerId）允许改 customerName/email
    if (!isBound) {
      fd.set(
        "customerName",
        getEdit(acc.apiAccountId, "customerName", acc.customerName)
      );
      fd.set("email", getEdit(acc.apiAccountId, "email", acc.email));
    }
    startTransition(async () => {
      const res = await updateApiAccount(fd);
      if (res.success) {
        clearEdit(acc.apiAccountId);
        router.refresh();
      }
    });
  };

  const handleToggle = () => {
    const fd = new FormData();
    fd.set("apiAccountId", acc.apiAccountId);
    startTransition(async () => {
      await toggleApiAccount(fd);
      router.refresh();
    });
  };

  const edited = hasEdits(acc.apiAccountId);
  const id = acc.apiAccountId;
  const currentSeriesIds = filterToSeriesIds(
    getEdit(id, "brandSeriesFilter", acc.brandSeriesFilter)
  );

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-1 py-0.5">
        {isBound ? (
          <div className="w-full border border-slate-200 bg-slate-50 rounded px-1 py-0.5 text-[11px] text-slate-700 min-h-[20px] flex items-center gap-1">
            <span className="truncate">{acc.customerName}</span>
            <span className="text-[8px] text-[#336633] flex-shrink-0">●bound</span>
          </div>
        ) : (
          <input
            type="text"
            value={getEdit(id, "customerName", acc.customerName)}
            onChange={(e) => setEdit(id, "customerName", e.target.value)}
            onBlur={() => edited && saveRow()}
            className={inputCls}
          />
        )}
      </td>
      <td className="px-1 py-0.5">
        {isBound ? (
          <div className="w-full border border-slate-200 bg-slate-50 rounded px-1 py-0.5 text-[11px] text-slate-500 min-h-[20px] truncate">
            {acc.email}
          </div>
        ) : (
          <input
            type="email"
            value={getEdit(id, "email", acc.email)}
            onChange={(e) => setEdit(id, "email", e.target.value)}
            onBlur={() => edited && saveRow()}
            className={inputCls}
          />
        )}
      </td>
      <td className="px-1 py-0.5">
        <BrandSeriesPicker
          options={brandSeriesOptions}
          selected={currentSeriesIds}
          onChange={(ids) =>
            setEdit(id, "brandSeriesFilter", seriesIdsToFilter(ids))
          }
          placeholder="All brands"
        />
        {/* BrandSeriesPicker 无 onBlur 触发，提供显式 Save 按钮 */}
        {edited && (
          <button
            type="button"
            onClick={saveRow}
            disabled={pending}
            className="mt-0.5 px-1.5 py-0.5 text-[9px] font-medium text-white bg-[#336633] rounded hover:bg-[#2d5a2d] disabled:opacity-50"
          >
            Save
          </button>
        )}
      </td>
      <td className="px-1 py-0.5">
        {acc.isActive ? (
          <div
            className="w-full border border-slate-200 bg-slate-50 rounded px-1 py-0.5 text-[10px] font-mono text-slate-700 break-all leading-tight min-h-[20px]"
            title={acc.apiKey}
          >
            {acc.apiKey}
          </div>
        ) : (
          <span className="text-[10px] text-slate-300">—</span>
        )}
      </td>
      <td className="px-1 py-0.5">
        <input
          type="number"
          step="0.1"
          value={getEdit(id, "markupRate", String(acc.markupRate))}
          onChange={(e) => setEdit(id, "markupRate", e.target.value)}
          onBlur={() => edited && saveRow()}
          className={numCls}
        />
      </td>
      <td className="px-1 py-0.5">
        <input
          type="number"
          value={getEdit(id, "quotaPerMinute", String(acc.quotaPerMinute))}
          onChange={(e) => setEdit(id, "quotaPerMinute", e.target.value)}
          onBlur={() => edited && saveRow()}
          className={numCls}
        />
      </td>
      <td className="px-1 py-0.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => !acc.isActive && handleToggle()}
            disabled={pending}
            className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
              acc.isActive
                ? "text-white bg-emerald-600"
                : "text-emerald-700 border border-emerald-300 hover:bg-emerald-50"
            }`}
          >
            Enable
          </button>
          <button
            type="button"
            onClick={() => acc.isActive && handleToggle()}
            disabled={pending}
            className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
              !acc.isActive
                ? "text-white bg-rose-600"
                : "text-rose-600 border border-rose-300 hover:bg-rose-50"
            }`}
          >
            Disable
          </button>
        </div>
      </td>
    </tr>
  );
}
