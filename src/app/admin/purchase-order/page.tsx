import Link from "next/link";
import { AuditActionButtons } from "../_components/AuditActionButtons";
import { OrderItemPriceInput } from "../_components/OrderItemPriceInput";
import { OrderItemQtyInput } from "../_components/OrderItemQtyInput";
import { formatUSDSafe } from "@/lib/format";
import { formatLeadtime } from "@/lib/cart-display";
import {
  getPurchaseOrderList,
  getPurchaseOrderDetail,
  getPurchaseOrdersBySalesOrder,
} from "./_data/purchase-order-data";

export const dynamic = "force-dynamic";

function toStr(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

// PO 明细表（单 PO / 多 PO 共用）：PurOrder / Model / PurPrice / Qty / Condition / Leadtime / Amount
function PurchaseItemsTable({
  items,
  poNumber,
  conditionByModel,
}: {
  items: Array<{
    itemId: string;
    model: string | null;
    unitPrice: { toString(): string };
    purPrice: { toString(): string } | null;
    quantity: number;
    leadTime: string | null;
  }>;
  poNumber: string;
  conditionByModel: Map<string, string | null>;
}) {
  const totalAmount = items.reduce(
    (sum, it) => sum + Number(it.purPrice ?? it.unitPrice) * it.quantity,
    0
  );
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-3">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-[11px]">
          <colgroup>
            <col style={{ width: "16%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "11%" }} />
          </colgroup>
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
            <tr>
              <th className="px-1 py-0.5 text-left">PurOrder</th>
              <th className="px-1 py-0.5 text-left">Model</th>
              <th className="px-1 py-0.5 text-left">PurPrice</th>
              <th className="px-1 py-0.5 text-left">Qty</th>
              <th className="px-1 py-0.5 text-left">Condition</th>
              <th className="px-1 py-0.5 text-left">Leadtime</th>
              <th className="px-1 py-0.5 text-left">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-left text-slate-400">
                  No items found for this purchase order.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const purPrice = Number(item.purPrice ?? item.unitPrice);
                return (
                  <tr key={item.itemId} className="hover:bg-slate-50">
                    <td className="px-1 py-0.5 text-slate-700 truncate">
                      {poNumber}
                    </td>
                    <td className="px-1 py-0.5 text-slate-600 truncate">
                      {item.model ?? "—"}
                    </td>
                    <td className="px-1 py-0.5">
                      {/* PurPrice 数值输入框：初始=供应单价 unitPrice，实际采购价落 purPrice 字段 */}
                      <OrderItemPriceInput
                        kind="purchase"
                        itemId={item.itemId}
                        value={purPrice}
                      />
                    </td>
                    <td className="px-1 py-0.5">
                      {/* Qty 数值输入框：初始=订单创建时按报价从低到高分配的数量 */}
                      <OrderItemQtyInput
                        kind="purchase"
                        itemId={item.itemId}
                        value={item.quantity}
                      />
                    </td>
                    <td className="px-1 py-0.5 text-slate-600 truncate">
                      {/* Condition：经关联销售订单的 ModelPrice 快照映射，无数据显示 — */}
                      {conditionByModel.get(item.model ?? "") ?? "—"}
                    </td>
                    <td className="px-1 py-0.5 text-slate-600 truncate">
                      {/* Leadtime 统一文本：缺货红 / 现货绿 / 交期琥珀 */}
                      <span className={(item.leadTime ?? "").toLowerCase().includes("out of stock")
                        ? "text-red-600"
                        : (item.leadTime ?? "").toLowerCase().includes("in stock")
                          ? "text-emerald-600"
                          : "text-amber-600"}
                      >
                        {formatLeadtime(item.leadTime)}
                      </span>
                    </td>
                    {/* Amount = PurPrice × Qty（行内小计）；无报价空值行显示 — */}
                    <td className="px-1 py-0.5 text-slate-700 tabular-nums text-right">
                      {purPrice > 0 && item.quantity > 0 ? `$${(purPrice * item.quantity).toFixed(2)}` : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* 底部汇总行（与 Sales 明细一致） */}
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-t border-slate-200 bg-slate-50">
        <div className="text-[11px] text-slate-600">
          Items ({items.length}):{" "}
          <span className="text-[12px] font-bold text-slate-900 ml-0.5">
            ${totalAmount.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
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
                              poStatus={po.poStatus}
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
