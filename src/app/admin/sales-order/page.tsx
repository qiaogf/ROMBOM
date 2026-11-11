import Link from "next/link";
import { AuditActionButtons } from "../_components/AuditActionButtons";
import { OrderItemPriceInput } from "../_components/OrderItemPriceInput";
import { OrderItemQtyInput } from "../_components/OrderItemQtyInput";
import { SalesOrderStatusSelect } from "./_components/SalesOrderStatusSelect";
import { AddSalesItemRow } from "./_components/AddSalesItemRow";
import { DeleteSalesItemButton } from "./_components/DeleteSalesItemButton";
import { AllChargesInput } from "./_components/AllChargesInput";
import { AdminSlipUploadButton } from "./_components/AdminSlipUploadButton";
import { AdminDownloadDocsButton } from "./_components/AdminDownloadDocsButton";
import { formatUSDSafe } from "@/lib/format";
import { getSalesOrderList, getSalesOrderDetail } from "./_data/sales-order-data";

export const dynamic = "force-dynamic";

function toStr(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function customerLabel(c: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const full = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  return full || c.email;
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
              <table className="w-full table-fixed text-xs min-w-[674px]">
                <colgroup>
                  <col style={{ width: "88px" }} />
                  <col style={{ width: "72px" }} />
                  <col style={{ width: "64px" }} />
                  <col style={{ width: "84px" }} />
                  <col style={{ width: "100px" }} />
                  <col style={{ width: "62px" }} />
                  <col style={{ width: "170px" }} />
                </colgroup>
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
                  <tr>
                    <th className="px-1.5 py-0.5 text-left">Customer</th>
                    <th className="px-1.5 py-0.5 text-left">SalesOrder</th>
                    <th className="px-1.5 py-0.5 text-left">Total</th>
                    <th className="px-1.5 py-0.5 text-left">Status</th>
                    <th className="px-1.5 py-0.5 text-center">Pay</th>
                    <th className="px-1.5 py-0.5 text-center">Mode</th>
                    <th className="px-1.5 py-0.5 text-left">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
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
                                  ? "text-green-800 font-medium"
                                  : "text-green-700"
                              }`}
                              title={so.orderNumber}
                            >
                              {so.orderNumber}
                            </Link>
                          </td>
                          <td className="px-1.5 py-0.5 text-slate-700 tabular-nums">
                            {formatUSDSafe(so.totalAmount)}
                          </td>
                          <td className="px-1 py-0.5">
                            <SalesOrderStatusSelect
                              orderId={so.orderId}
                              value={so.soStatus}
                            />
                          </td>
                          <td className="px-1 py-0.5 align-middle">
                            {/* 与客户 Order Summary / My Orders 同色：未点深黄，已点淡绿 */}
                            <div className="flex flex-wrap items-center justify-center gap-0.5">
                              <span
                                className={`inline-flex items-center px-1 py-0.5 text-[9px] font-semibold rounded text-white ${
                                  so.subtotalPaid ? "bg-emerald-300" : "bg-amber-600"
                                }`}
                              >
                                Goods
                              </span>
                              <span
                                className={`inline-flex items-center px-1 py-0.5 text-[9px] font-semibold rounded text-white ${
                                  so.shippingPaid ? "bg-emerald-300" : "bg-amber-600"
                                }`}
                              >
                                Charges
                              </span>
                            </div>
                          </td>
                          <td className="px-1.5 py-0.5 text-center align-middle">
                            {/* Mode：订单产品全部可自助下单 → Self（免审批）；否则 Manual（需管理员 Approved 后客户 My Orders 才可见） */}
                            {so.requiresManualConfirm ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-700">
                                Manual
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-100 text-emerald-700">
                                Self
                              </span>
                            )}
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
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] table-fixed text-[11px]">
                  <colgroup>
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "17ch" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "17%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "28px" }} />
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
                      <th className="px-1 py-0.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selected.items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
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
                            <td className="px-1 py-0.5 text-green-700 truncate">
                              {selected.orderNumber}
                            </td>
                            <td className="px-1 py-0.5 text-slate-600 truncate" title={item.model ?? ""}>
                              {item.model ?? "—"}
                            </td>
                            <td className="px-1.5 py-0.5">
                              {/* Price 数值输入框：初始=下单时 ListPrice 快照（=finalSellPrice），可改实际销售价 */}
                              <OrderItemPriceInput
                                kind="sales"
                                itemId={item.itemId}
                                value={unitPrice}
                                widthClass="max-w-[84px]"
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
                              {/* Condition：优先行自身快照（手动添加行填写），旧数据回退下单时 ModelPrice 快照 */}
                              {item.condition ?? item.modelPrice?.condition ?? "—"}
                            </td>
                            <td className="px-1 py-0.5 text-slate-600 truncate">
                              {item.leadTime || "—"}
                            </td>
                            {/* Amount = Price × Qty（行内小计，随 Price/Qty 输入实时刷新） */}
                            <td className="px-1 py-0.5 text-slate-700 tabular-nums text-right">
                              ${(unitPrice * item.quantity).toFixed(2)}
                            </td>
                            {/* 删除该行型号 */}
                            <td className="px-1 py-0.5 text-center">
                              <DeleteSalesItemButton itemId={item.itemId} model={item.model} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                    {/* 手动添加销售行：Model / Price / Qty / Condition / Leadtime 输入，Add 后重算 Items 合计 */}
                    <AddSalesItemRow orderId={selected.orderId} />
                    {/* All Charges + Items 合并一行：Model=All Charges，Price=补录输入，Leadtime=Items(N)，Amount=合计 */}
                    <tr className="bg-slate-50/60">
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5 text-black truncate">All Charges</td>
                      <td className="px-1.5 py-0.5">
                        <AllChargesInput orderId={selected.orderId} value={Number(selected.shippingCost)} />
                      </td>
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5 text-[11px] font-semibold text-black">
                        Items ({selected.items.length})
                      </td>
                      <td className="px-1 py-0.5 text-[11px] font-bold text-black tabular-nums text-right">
                        ${selected.items
                          .reduce((sum, it) => sum + Number(it.finalSellPrice ?? it.unitPrice) * it.quantity, 0)
                          .toFixed(2)}
                      </td>
                      <td className="px-1 py-0.5" />
                    </tr>
                    {/* 单证收发一行：Model 列上传 PI（Slip），Price 列生成下载单证（Documents） */}
                    <tr>
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5">
                        <AdminSlipUploadButton orderId={selected.orderId} />
                      </td>
                      <td className="px-1.5 py-0.5">
                        <AdminDownloadDocsButton orderId={selected.orderId} orderNumber={selected.orderNumber} />
                      </td>
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5" />
                    </tr>
                  </tbody>
                </table>
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
