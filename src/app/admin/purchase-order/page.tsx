import Link from "next/link";
import { AuditActionButtons } from "../_components/AuditActionButtons";
import { formatUSDSafe } from "@/lib/format";
import { getPurchaseOrderList, getPurchaseOrderDetail } from "./_data/purchase-order-data";

export const dynamic = "force-dynamic";

function toStr(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "ordered":
      return "bg-amber-50 text-amber-700";
    case "paid":
      return "bg-blue-50 text-blue-700";
    case "shipped":
      return "bg-purple-50 text-purple-700";
    case "received":
      return "bg-emerald-50 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  const label = status ? status.replace(/_/g, " ") : "—";
  const cls = status ? statusBadgeClass(status) : "bg-slate-100 text-slate-500";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] rounded capitalize ${cls}`}
    >
      {label}
    </span>
  );
}

export default async function PurchaseOrderListPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const sp = await searchParams;
  const selectedId = toStr(sp.id);

  const purchaseOrders = await getPurchaseOrderList();

  const selected = selectedId ? await getPurchaseOrderDetail(selectedId) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-[calc(100vh-3rem-1px)]">
      {/* 左半：采购订单列表 */}
      <div className="min-w-0 flex flex-col min-h-0">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-auto table-fixed text-xs min-w-[660px]">
                <colgroup>
                  <col style={{ width: "130px" }} />
                  <col style={{ width: "95px" }} />
                  <col style={{ width: "102px" }} />
                  <col style={{ width: "80px" }} />
                  <col style={{ width: "78px" }} />
                  <col style={{ width: "175px" }} />
                </colgroup>
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
                  <tr>
                    <th className="px-1.5 py-0.5 text-left">Supplier</th>
                    <th className="px-1.5 py-0.5 text-left">Sales Order</th>
                    <th className="px-1.5 py-0.5 text-left">Purchase Order</th>
                    <th className="px-1.5 py-0.5 text-left">Total</th>
                    <th className="px-1.5 py-0.5 text-left">Status</th>
                    <th className="px-1.5 py-0.5 text-left">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchaseOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-6 text-left text-slate-400"
                      >
                        No purchase orders found.
                      </td>
                    </tr>
                  ) : (
                    purchaseOrders.map((po) => {
                      const isSelected = po.poId === selectedId;
                      return (
                        <tr
                          key={po.poId}
                          className={isSelected ? "bg-blue-50" : "hover:bg-slate-50"}
                        >
                          <td className="px-1.5 py-0.5 text-slate-700 whitespace-nowrap" title={po.supplier?.email}>
                            {po.supplier?.email ?? "—"}
                          </td>
                          <td className="px-1.5 py-0.5 text-slate-600 whitespace-nowrap">
                            {po.salesOrder?.orderNumber ?? "—"}
                          </td>
                          <td className="px-1.5 py-0.5 whitespace-nowrap">
                            <Link
                              href={`?id=${po.poId}`}
                              className={`block hover:underline ${
                                isSelected
                                  ? "text-blue-700 font-medium"
                                  : "text-blue-600"
                              }`}
                              title={po.poNumber}
                            >
                              {po.poNumber}
                            </Link>
                          </td>
                          <td className="px-1.5 py-0.5 text-slate-700 tabular-nums">
                            {formatUSDSafe(po.totalAmount)}
                          </td>
                          <td className="px-1.5 py-0.5">
                            <StatusBadge status={po.poStatus} />
                          </td>
                          <td className="px-1.5 py-0.5">
                            <AuditActionButtons
                              auditId={po.poId}
                              auditStatus={po.auditStatus}
                              kind="purchase"
                              label={po.poNumber}
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
        </div>
      </div>

      {/* 右半：选中采购订单的明细行 */}
      <div className="min-w-0 flex flex-col min-h-0">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {selected ? (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-auto table-fixed text-xs min-w-[660px]">
                  <colgroup>
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "170px" }} />
                    <col style={{ width: "90px" }} />
                    <col style={{ width: "50px" }} />
                    <col style={{ width: "130px" }} />
                    <col style={{ width: "100px" }} />
                  </colgroup>
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
                    <tr>
                      <th className="px-1.5 py-0.5 text-left">Purchase Order</th>
                      <th className="px-1.5 py-0.5 text-left">Model</th>
                      <th className="px-1.5 py-0.5 text-left">Unit Price</th>
                      <th className="px-1.5 py-0.5 text-left">Qty</th>
                      <th className="px-1.5 py-0.5 text-left">Stock Status</th>
                      <th className="px-1.5 py-0.5 text-left">Order Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selected.items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-6 text-left text-slate-400"
                        >
                          No items found for this purchase order.
                        </td>
                      </tr>
                    ) : (
                      selected.items.map((item) => (
                        <tr key={item.itemId} className="hover:bg-slate-50">
                          <td className="px-1.5 py-0.5 text-slate-700 whitespace-nowrap">
                            {selected.poNumber}
                          </td>
                          <td className="px-1.5 py-0.5 text-slate-600 whitespace-nowrap">
                            {item.model ?? "—"}
                          </td>
                          <td className="px-1.5 py-0.5 text-slate-700 tabular-nums">
                            {formatUSDSafe(item.unitPrice)}
                          </td>
                          <td className="px-1.5 py-0.5 text-slate-700 tabular-nums">
                            {item.quantity}
                          </td>
                          <td className="px-1.5 py-0.5">
                            {item.stockStatus === "in_stock" ? (
                              <span className="text-emerald-600">in stock</span>
                            ) : item.stockStatus === "out_of_stock" ? (
                              <span className="text-red-600">out of stock</span>
                            ) : item.leadTime ? (
                              <span className="text-amber-600">{item.leadTime}</span>
                            ) : (
                              <span className="text-slate-600 capitalize">{item.stockStatus.replace(/_/g, " ")}</span>
                            )}
                          </td>
                          <td className="px-1.5 py-0.5">
                            <StatusBadge status={item.itemStatus} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-6 text-left text-sm text-slate-400">
              Select a purchase order from the list to view its items.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
