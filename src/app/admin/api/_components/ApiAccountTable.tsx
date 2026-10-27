"use client";

import { ApiAccountNewRow } from "./ApiAccountNewRow";
import { ApiAccountRow } from "./ApiAccountRow";
import { useApiAccountEdits } from "./useApiAccountEdits";
import type {
  ApiAccount,
  CustomerOption,
  BrandSeriesOption,
} from "./api-account-types";

interface Props {
  accounts: ApiAccount[];
  customers: CustomerOption[];
  brandSeriesOptions: BrandSeriesOption[];
}

export function ApiAccountTable({
  accounts,
  customers,
  brandSeriesOptions,
}: Props) {
  const editsApi = useApiAccountEdits();

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-[11px]">
          <colgroup>
            <col style={{ width: "14%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "28%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "18%" }} />
          </colgroup>
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
            <tr>
              <th className="px-1.5 py-1 text-left">Customer Name</th>
              <th className="px-1.5 py-1 text-left">Email</th>
              <th className="px-1.5 py-1 text-left">Brand Series</th>
              <th className="px-1.5 py-1 text-left whitespace-nowrap">API Keys</th>
              <th className="px-1.5 py-1 text-left whitespace-nowrap">Markup %</th>
              <th className="px-1.5 py-1 text-left whitespace-nowrap">Quota/min</th>
              <th className="px-1.5 py-1 text-left whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <ApiAccountNewRow
              customers={customers}
              brandSeriesOptions={brandSeriesOptions}
            />

            {accounts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-slate-400">
                  No API accounts yet. Add one above.
                </td>
              </tr>
            ) : (
              accounts.map((acc) => (
                <ApiAccountRow
                  key={acc.apiAccountId}
                  acc={acc}
                  editsApi={editsApi}
                  brandSeriesOptions={brandSeriesOptions}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {customers.length === 0 && (
        <div className="px-3 py-2 text-[10px] text-amber-700 bg-amber-50 border-t border-amber-200">
          No enabled customers available to bind. Enable a customer in the
          Accounts page first.
        </div>
      )}
    </div>
  );
}
