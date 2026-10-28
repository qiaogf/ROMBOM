import Link from "next/link";
import { AuditActionButtons } from "../_components/AuditActionButtons";
import { OrderItemPriceInput } from "../_components/OrderItemPriceInput";
import { OrderItemQtyInput } from "../_components/OrderItemQtyInput";
import { formatUSDSafe } from "@/lib/format";
import { getSalesOrderList, getSalesOrderDetail } from "./_data/sales-order-data";

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

function customerLabel(c: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const full = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  return full || c.email;
}

function resolveSalesOrderStatus(
  soStatus: string | null,
  orderStatus: string
): string {
  return soStatus ?? orderStatus.replace(/_/g, " ");
}

export default async function SalesOrderListPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const sp = await searchParams;
  const selectedId = toStr(sp.id);

  const salesOrders = await getSalesOrderList();

  const selected = selectedId ? await getSalesOrderDetail(selectedId) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-[calc(100vh-3rem-1px)]">
      {/* 左半：销售订单列表 */}
      <div className="min-w-0 flex flex-col min-h-0">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-auto table-fixed text-xs min-w-[560px]">
                <colgroup>
                  <col style={{ width: "130px" }} />
                  <col style={{ width: "95px" }} />
                  <col style={{ width: "80px" }} />
                  <col style={{ width: "78px" }} />
                  <col style={{ width: "175px" }} />
                </colgroup>
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
                  <tr>
                    <th className="px-1.5 py-0.5 text-left">Customer</th>
                    <th className="px-1.5 py-0.5 text-left">SalesOrder</th>
                    <th className="px-1.5 py-0.5 text-left">Total</th>
                    <th className="px-1.5 py-0.5 text-left">Status</th>
                    <th className="px-1.5 py-0.5 text-left">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-6 text-left text-slate-400"
                      >
                        No sales orders found.
                      </td>
                    </tr>
                  ) : (
                    salesOrders.map((so) => {
                      const isSelected = so.orderId === selectedId;
                      return (
                        <tr
                          key={so.orderId}
                          className={isSelected ? "bg-blue-50" : "hover:bg-slate-50"}
                        >
                          <td className="px-1.5 py-0.5 text-slate-700 truncate">
                            {customerLabel(so.customer)}
                          </td>
                          <td className="px-1.5 py-0.5">
                            <Link
                              href={`?id=${so.orderId}`}
                              className={`block truncate hover:underline ${
                                isSelected
                                  ? "text-blue-700 font-medium"
                                  : "text-blue-600"
                              }`}
                              title={so.orderNumber}
                            >
                              {so.orderNumber}
                            </Link>
                          </td>
                          <td className="px-1.5 py-0.5 text-slate-700 tabular-nums">
                            {formatUSDSafe(so.totalAmount)}
                          </td>
                          <td className="px-1.5 py-0.5">
                            <StatusBadge
                              status={resolveSalesOrderStatus(
                                so.soStatus,
                                so.orderStatus
                              )}
                            />
                          </td>
                          <td className="px-1.5 py-0.5">
                            <AuditActionButtons
                              auditId={so.orderId}
                              auditStatus={so.auditStatus}
                              kind="sales"
                              label={so.orderNumber}
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

      {/* 右半：选中销售订单的明细行 */}
      <div className="min-w-0 flex flex-col min-h-0">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {selected ? (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div>
                <table className="w-full table-fixed text-[11px]">
                  <colgroup>
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "20ch" }} />
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "17%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "10%" }} />
                  </colgroup>
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
                    <tr>
                      <th className="px-1 py-0.5 text-left">SalesOrder</th>
                      <th className="px-1 py-0.5 text-left">Model</th>
                      <th className="px-1 py-0.5 text-left">Price</th>
                      <th className="px-1 py-0.5 text-left">Qty</th>
                      <th className="px-1 py-0.5 text-left">Condition</th>
                      <th className="px-1 py-0.5 text-left">Leadtime</th>
                      <th className="px-1 py-0.5 text-left">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selected.items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-6 text-left text-slate-400"
                        >
                          No items found for this sales order.
                        </td>
                      </tr>
                    ) : (
                      selected.items.map((item) => {
                        const unitPrice = Number(item.finalSellPrice ?? item.unitPrice);
                        return (
                          <tr key={item.itemId} className="hover:bg-slate-50">
                            <td className="px-1 py-0.5 text-slate-700 truncate">
                              {selected.orderNumber}
                            </td>
                            <td className="px-1 py-0.5 text-slate-600 truncate">
                              {item.model ?? "—"}
                            </td>
                            <td className="px-1.5 py-0.5">
                              {/* Price 数值输入框：初始=下单时 ListPrice 快照（=finalSellPrice），可改实际销售价 */}
                              <OrderItemPriceInput
                                kind="sales"
                                itemId={item.itemId}
                                value={unitPrice}
                              />
                            </td>
                            <td className="px-1.5 py-0.5">
                              {/* Qty 数值输入框：初始=下单数量，失焦提交并重算该行/订单金额 */}
                              <OrderItemQtyInput
                                itemId={item.itemId}
                                value={item.quantity}
                              />
                            </td>
                            <td className="px-1 py-0.5 text-slate-600">
                              {/* Condition：下单时 ModelPrice 快照，旧数据回退 — */}
                              {item.modelPrice?.condition ?? "—"}
                            </td>
                            <td className="px-1 py-0.5 text-slate-600 truncate">
                              {item.leadTime || "—"}
                            </td>
                            {/* Amount = Price × Qty（行内小计，随 Price/Qty 输入实时刷新） */}
                            <td className="px-1 py-0.5 text-slate-700 tabular-nums text-right">
                              ${(unitPrice * item.quantity).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {/* 底部汇总行（与客户订单明细一致） */}
              <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-t border-slate-200 bg-slate-50">
                <div className="text-[11px] text-slate-600">
                  Items ({selected.items.length}):{" "}
                  <span className="text-[12px] font-bold text-slate-900 ml-0.5">
                    ${selected.items
                      .reduce((sum, it) => sum + Number(it.finalSellPrice ?? it.unitPrice) * it.quantity, 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-left text-sm text-slate-400">
              Select a sales order from the list to view its items.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
