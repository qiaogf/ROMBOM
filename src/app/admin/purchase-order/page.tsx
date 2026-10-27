import Link from "next/link";
import { AuditActionButtons } from "../_components/AuditActionButtons";
import { formatUSDSafe } from "@/lib/format";
import {
  getPurchaseOrderList,
  getPurchaseOrderDetail,
  getPurchaseOrdersBySalesOrder,
} from "./_data/purchase-order-data";
import { toStr } from "@/lib/search-params";
import { StatusBadge } from "../_components/StatusBadge";
import { PurchaseItemsTable } from "./_components/PurchaseItemsTable";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderListPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[]; sales?: string | string[] }>;
}) {
  const sp = await searchParams;
  const selectedId = toStr(sp.id);
  const selectedSalesOrder = toStr(sp.sales);

  const purchaseOrders = await getPurchaseOrderList();

  // 右半明细两种模式：
  //   ?sales={销售单号} → 该销售订单对应的所有采购订单明细（多 PO 分块显示）
  //   ?id={poId}       → 仅该采购订单明细
  const salesOrderPOs = selectedSalesOrder
    ? await getPurchaseOrdersBySalesOrder(selectedSalesOrder)
    : null;
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
                    <th className="px-1.5 py-0.5 text-left">SalesOrder</th>
                    <th className="px-1.5 py-0.5 text-left">PurOrder</th>
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
                      const isSalesSelected =
                        selectedSalesOrder !== null &&
                        po.salesOrder?.orderNumber === selectedSalesOrder;
                      return (
                        <tr
                          key={po.poId}
                          className={isSelected || isSalesSelected ? "bg-blue-50" : "hover:bg-slate-50"}
                        >
                          <td className="px-1.5 py-0.5 text-slate-700 whitespace-nowrap" title={po.supplier?.email}>
                            {po.supplier?.email ?? "—"}
                          </td>
                          <td className="px-1.5 py-0.5 whitespace-nowrap">
                            {/* 点击 SalesOrder → 右侧显示该销售订单对应的所有采购订单明细 */}
                            {po.salesOrder?.orderNumber ? (
                              <Link
                                href={`?sales=${encodeURIComponent(po.salesOrder.orderNumber)}`}
                                className={`block hover:underline ${
                                  isSalesSelected
                                    ? "text-blue-700 font-medium"
                                    : "text-blue-600"
                                }`}
                              >
                                {po.salesOrder.orderNumber}
                              </Link>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
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

      {/* 右半：明细行（列结构与 Sales 明细对齐）。
          ?sales= → 该销售订单对应的所有采购订单明细（每 PO 一块，各带合计）；
          ?id=    → 仅该采购订单明细 */}
      <div className="min-w-0 flex flex-col min-h-0">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {salesOrderPOs ? (
            salesOrderPOs.length === 0 ? (
              <div className="py-6 text-left text-sm text-slate-400">
                No purchase orders found for sales order {selectedSalesOrder}.
              </div>
            ) : (
              salesOrderPOs.map((po) => {
                const conditionByModel = new Map<string, string | null>();
                for (const soItem of po.salesOrder?.items ?? []) {
                  if (soItem.model && !conditionByModel.has(soItem.model)) {
                    conditionByModel.set(soItem.model, soItem.modelPrice?.condition ?? null);
                  }
                }
                return (
                  <PurchaseItemsTable
                    key={po.poId}
                    items={po.items}
                    poNumber={po.poNumber}
                    conditionByModel={conditionByModel}
                  />
                );
              })
            )
          ) : selected ? (() => {
            // Condition 映射：同销售订单内 model → 下单时 ModelPrice 快照
            const conditionByModel = new Map<string, string | null>();
            for (const soItem of selected.salesOrder?.items ?? []) {
              if (soItem.model && !conditionByModel.has(soItem.model)) {
                conditionByModel.set(soItem.model, soItem.modelPrice?.condition ?? null);
              }
            }
            return (
              <PurchaseItemsTable
                items={selected.items}
                poNumber={selected.poNumber}
                conditionByModel={conditionByModel}
              />
            );
          })() : (
            <div className="py-6 text-left text-sm text-slate-400">
              Select a purchase order from the list to view its items.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
