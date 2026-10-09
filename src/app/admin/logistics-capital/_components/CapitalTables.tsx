"use client";

/**
 * Logistics-Capital 资金台账
 * 左：销售订单收款（Receivables）；右：采购订单付款（Payables）
 * 单号/客户/供应商/金额系统自动填写；收付款方式手动输入；状态手动选择
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSalesCapital, updatePurchaseCapital } from "@/app/actions/adminActions";
import { formatUSD } from "@/lib/price";

export interface ReceivableRow {
  orderId: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  paymentMethod: string | null;
  status: string;
}

export interface PayableRow {
  poId: string;
  salesOrderNumber: string | null;
  poNumber: string;
  supplierEmail: string | null;
  totalAmount: number;
  paymentMethod: string | null;
  status: string;
}

type SaveResult = { success: boolean; message: string };
type SaveAction = (fd: FormData) => Promise<SaveResult>;
type RowPatch = { paymentMethod?: string; status?: string };

const STATUS_OPTIONS = ["ordered", "paid", "shipped", "received"] as const;

const cellCls = "px-1.5 py-1 text-[11px] text-slate-700 truncate";
const inputCls =
  "w-full border border-slate-300 rounded px-1 py-0.5 text-[11px] text-slate-900 focus:outline-none focus:border-[#336633] focus:ring-1 focus:ring-[#336633]";
const selectCls =
  "w-full border border-slate-300 rounded px-0.5 py-0.5 text-[11px] text-slate-900 bg-white focus:outline-none focus:border-[#336633] focus:ring-1 focus:ring-[#336633] capitalize";

/** 收款/付款行的编辑态与保存逻辑（付款方式输入框 + 状态选择共用） */
function useCapitalRows(idKey: "orderId" | "poId", action: SaveAction) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [methods, setMethods] = useState<Record<string, string>>({});

  const methodValue = (id: string, fallback: string | null): string => methods[id] ?? fallback ?? "";

  const save = (id: string, fallbackMethod: string | null, currentStatus: string, patch: RowPatch) => {
    const fd = new FormData();
    fd.set(idKey, id);
    fd.set("paymentMethod", patch.paymentMethod ?? methodValue(id, fallbackMethod));
    fd.set("status", patch.status ?? currentStatus);
    startTransition(async () => {
      const res = await action(fd);
      if (res.success) {
        setMethods((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        router.refresh();
      } else {
        window.alert(res.message);
      }
    });
  };

  return { pending, setMethods, methodValue, save };
}

function StatusSelect({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={STATUS_OPTIONS.includes(value as (typeof STATUS_OPTIONS)[number]) ? value : "ordered"}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={selectCls}
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

/** 收/付款方式输入框（失焦且有改动时保存） */
function MethodInput({
  value,
  onChange,
  onSave,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onSave}
      placeholder="T/T, L/C"
      className={inputCls}
    />
  );
}

export function ReceivablesTable({ rows }: { rows: ReceivableRow[] }) {
  const { pending, setMethods, methodValue, save } = useCapitalRows("orderId", updateSalesCapital);

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-2 py-1.5 bg-emerald-50/60 border-b border-slate-200">
        <p className="text-[11px] font-semibold text-emerald-800">Receivables</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-[11px]">
          <colgroup>
            <col />
            <col />
            <col />
            <col />
            <col />
          </colgroup>
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
            <tr>
              <th className="px-1.5 py-1 text-left">Sales Order</th>
              <th className="px-1.5 py-1 text-left">Customer</th>
              <th className="px-1.5 py-1 text-left">Received Amount</th>
              <th className="px-1.5 py-1 text-left">Receipt Method</th>
              <th className="px-1.5 py-1 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-slate-400">
                  No sales orders found.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const method = methodValue(r.orderId, r.paymentMethod);
                return (
                  <tr key={r.orderId} className="hover:bg-slate-50">
                    <td className={cellCls} title={r.orderNumber}>{r.orderNumber}</td>
                    <td className={cellCls} title={r.customerName}>{r.customerName}</td>
                    <td className={`${cellCls} tabular-nums`}>{formatUSD(r.totalAmount)}</td>
                    <td className="px-1 py-0.5">
                      <MethodInput
                        value={method}
                        onChange={(v) => setMethods((prev) => ({ ...prev, [r.orderId]: v }))}
                        onSave={() => method !== (r.paymentMethod ?? "") && save(r.orderId, r.paymentMethod, r.status, { paymentMethod: method })}
                      />
                    </td>
                    <td className="px-1 py-0.5">
                      <StatusSelect
                        value={r.status}
                        disabled={pending}
                        onChange={(v) => save(r.orderId, r.paymentMethod, r.status, { status: v })}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PayablesTable({ rows }: { rows: PayableRow[] }) {
  const { pending, setMethods, methodValue, save } = useCapitalRows("poId", updatePurchaseCapital);

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-2 py-1.5 bg-amber-50/60 border-b border-slate-200">
        <p className="text-[11px] font-semibold text-amber-800">Payables</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-[11px]">
          <colgroup>
            <col />
            <col />
            <col />
            <col />
            <col />
            <col />
          </colgroup>
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
            <tr>
              <th className="px-1.5 py-1 text-left">Sales Order</th>
              <th className="px-1.5 py-1 text-left">Purchase Order</th>
              <th className="px-1.5 py-1 text-left">Supplier</th>
              <th className="px-1.5 py-1 text-left">Paid Amount</th>
              <th className="px-1.5 py-1 text-left">Payment Method</th>
              <th className="px-1.5 py-1 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                  No purchase orders found.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const method = methodValue(r.poId, r.paymentMethod);
                return (
                  <tr key={r.poId} className="hover:bg-slate-50">
                    <td className={cellCls} title={r.salesOrderNumber ?? ""}>
                      {r.salesOrderNumber ?? "—"}
                    </td>
                    <td className={cellCls} title={r.poNumber}>{r.poNumber}</td>
                    <td className={cellCls} title={r.supplierEmail ?? ""}>
                      {r.supplierEmail ?? "—"}
                    </td>
                    <td className={`${cellCls} tabular-nums`}>{formatUSD(r.totalAmount)}</td>
                    <td className="px-1 py-0.5">
                      <MethodInput
                        value={method}
                        onChange={(v) => setMethods((prev) => ({ ...prev, [r.poId]: v }))}
                        onSave={() => method !== (r.paymentMethod ?? "") && save(r.poId, r.paymentMethod, r.status, { paymentMethod: method })}
                      />
                    </td>
                    <td className="px-1 py-0.5">
                      <StatusSelect
                        value={r.status}
                        disabled={pending}
                        onChange={(v) => save(r.poId, r.paymentMethod, r.status, { status: v })}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
