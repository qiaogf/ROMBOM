import Link from "next/link";
import { AuditActionButtons } from "../_components/AuditActionButtons";
import { OrderItemPriceInput } from "../_components/OrderItemPriceInput";
import { OrderItemQtyInput } from "../_components/OrderItemQtyInput";
import { SalesOrderStatusSelect } from "./_components/SalesOrderStatusSelect";
import { AddSalesItemRow } from "./_components/AddSalesItemRow";
import { DeleteSalesItemButton } from "./_components/DeleteSalesItemButton";
import { AllChargesInput } from "./_components/AllChargesInput";
import { AdminDownloadDocsButton } from "./_components/AdminDownloadDocsButton";
import { OrderTermsSelect } from "@/components/order/OrderTermsSelect";
import { HsCodeInput } from "./_components/HsCodeInput";
import { inferHsCode } from "@/lib/hs-code";
import {
  DELIVERY_TERMS_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
} from "@/lib/order-terms";
import { formatUSDSafe } from "@/lib/format";
import { getSalesOrderList, getSalesOrderDetail } from "./_data/sales-order-data";

export const dynamic = "force-dynamic";

// Sales 数值框：只允许直接输入，隐藏浏览器上下加减按钮
const directNumberInputClass =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

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

  // 明细合计（用于 Goods Subtotal 行）与系统推导的订单统一 HS Code（多品类显示 Mixed）
  const itemsTotal = selected
    ? selected.items.reduce(
        (sum, item) => sum + Number(item.finalSellPrice ?? item.unitPrice) * item.quantity,
        0
      )
    : 0;
  const orderSuggestedHs = selected
    ? (() => {
        const codes = new Set(
          selected.items.map((item) => inferHsCode(item.productName, item.model)).filter(Boolean)
        );
        if (codes.size === 0) return "";
        return codes.size === 1 ? [...codes][0] : "Mixed";
      })()
    : "";

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
                              submittedAt={so.submittedAt ? so.submittedAt.toISOString() : null}
                              cancelRequestedAt={so.cancelRequestedAt ? so.cancelRequestedAt.toISOString() : null}
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
              <div className="overflow-x-hidden">
                <table className="w-full table-fixed text-[11px]">
                  <colgroup>
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "11%" }} />
                    <col style={{ width: "4%" }} />
                  </colgroup>
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
                    <tr>
                      <th className="px-1 py-0.5 text-left">SalesOrder</th>
                      <th className="px-1 py-0.5 text-left">Model</th>
                      <th className="px-1 py-0.5 text-left">Price</th>
                      <th className="px-1 py-0.5 text-left">Qty</th>
                      <th className="px-1 py-0.5 text-left">Amount</th>
                      <th className="px-1 py-0.5 text-left">HS Code</th>
                      <th className="px-1 py-0.5 text-left">Condition</th>
                      <th className="px-1 py-0.5 text-left">Leadtime</th>
                      <th className="px-1 py-0.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selected.items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-3 py-6 text-left text-slate-400"
                        >
                          No items found for this sales order.
                        </td>
                      </tr>
                    ) : (
                      selected.items.map((item) => {
                        const unitPrice = Number(item.finalSellPrice ?? item.unitPrice);
                        const suggestedHs = inferHsCode(item.productName, item.model);
                        const orderHs = selected.hsCode ?? null;
                        return (
                          <tr key={item.itemId} className="hover:bg-slate-50">
                            <td className="px-1 py-0.5 text-green-700 truncate">
                              {selected.orderNumber}
                            </td>
                            <td className="px-1 py-0.5 text-slate-600 break-all leading-tight" title={item.model ?? ""}>
                              {item.model ?? "—"}
                            </td>
                            <td className="px-1.5 py-0.5">
                              {/* Price 数值输入框：初始=下单时 ListPrice 快照（=finalSellPrice），可改实际销售价 */}
                              <OrderItemPriceInput
                                kind="sales"
                                itemId={item.itemId}
                                value={unitPrice}
                                widthClass={`max-w-none ${directNumberInputClass}`}
                              />
                            </td>
                            <td className="px-1.5 py-0.5">
                              {/* Qty 数值输入框：初始=下单数量，失焦提交并重算该行/订单金额 */}
                              <OrderItemQtyInput
                                itemId={item.itemId}
                                value={item.quantity}
                                widthClass={`max-w-none ${directNumberInputClass}`}
                              />
                            </td>
                            {/* Amount = Price × Qty（行内小计，随 Price/Qty 输入实时刷新） */}
                            <td className="px-1 py-0.5 text-slate-700 tabular-nums text-left">
                              ${(unitPrice * item.quantity).toFixed(2)}
                            </td>
                            {/* HS Code：未设定时灰色显示系统推导值；管理员修改后绿色 */}
                            <td className="px-1 py-0.5">
                              <HsCodeInput
                                mode="item"
                                id={item.itemId}
                                value={orderHs ?? item.hsCode ?? null}
                                suggested={suggestedHs}
                                disabled={Boolean(orderHs)}
                              />
                            </td>
                            <td className="px-1 py-0.5 text-slate-600">
                              {/* Condition：优先行自身快照（手动添加行填写），旧数据回退下单时 ModelPrice 快照 */}
                              {item.condition ?? item.modelPrice?.condition ?? "—"}
                            </td>
                            <td className="px-1 py-0.5 text-slate-600 truncate">
                              {item.leadTime || "—"}
                            </td>
                            {/* 删除该行型号 */}
                            <td className="px-1 py-0.5 text-center">
                              <DeleteSalesItemButton itemId={item.itemId} model={item.model} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                    {/* 手动添加销售行：Model / Price / Qty / Condition / Leadtime 输入，Add 后重算 Goods Subtotal */}
                    <AddSalesItemRow orderId={selected.orderId} orderHsCode={selected.hsCode ?? null} />
                    {/* Goods Subtotal：上面各型号 Amount 之和，HS Code 列保留订单统一码 */}
                    <tr className="bg-slate-50/60">
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5" />
                      <td colSpan={2} className="px-1 py-0.5 text-[11px] font-semibold text-black whitespace-nowrap">
                        Goods Subtotal
                      </td>
                      <td className="px-1 py-0.5 text-[11px] font-bold text-black tabular-nums text-left">
                        ${itemsTotal.toFixed(2)}
                      </td>
                      <td className="px-1 py-0.5">
                        <HsCodeInput
                          mode="order"
                          id={selected.orderId}
                          value={selected.hsCode ?? null}
                          suggested={orderSuggestedHs}
                        />
                      </td>
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5" />
                    </tr>
                    {/* All Charges：输入框移至 Amount 列 */}
                    <tr className="bg-slate-50/60">
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5 text-[11px] font-semibold text-black whitespace-nowrap">All Charges</td>
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5">
                        <AllChargesInput orderId={selected.orderId} value={Number(selected.shippingCost)} />
                      </td>
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5" />
                    </tr>
                    {/* Total = Goods Subtotal + All Charges */}
                    <tr className="bg-slate-50/60">
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5 text-[11px] font-bold text-black">Total</td>
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5 text-[11px] font-bold text-black tabular-nums text-left">
                        ${(itemsTotal + Number(selected.shippingCost)).toFixed(2)}
                      </td>
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5" />
                    </tr>
                    {/* 商务条款：管理员设定后锁定，客户侧同步显示（绿色、不可修改） */}
                    <tr>
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5 text-[11px] text-slate-600">Payment Terms</td>
                      <td colSpan={4} className="px-1 py-0.5">
                        <OrderTermsSelect
                          orderId={selected.orderId}
                          field="paymentTerms"
                          options={PAYMENT_TERMS_OPTIONS}
                          value={selected.paymentTerms ?? null}
                          locked={selected.paymentTermsSetByAdmin}
                          mode="admin"
                        />
                      </td>
                      {/* Documents PDF：靠订单明细表右边框对齐 */}
                      <td colSpan={3} className="px-1 py-0.5 text-right overflow-visible">
                        <AdminDownloadDocsButton orderId={selected.orderId} orderNumber={selected.orderNumber} format="pdf" />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5 text-[11px] text-slate-600">Payment Method</td>
                      <td colSpan={4} className="px-1 py-0.5">
                        <OrderTermsSelect
                          orderId={selected.orderId}
                          field="paymentMethod"
                          options={PAYMENT_METHOD_OPTIONS}
                          value={selected.paymentMethod ?? null}
                          locked={selected.paymentMethodSetByAdmin}
                          mode="admin"
                        />
                      </td>
                      {/* Documents EXCEL：靠订单明细表右边框对齐 */}
                      <td colSpan={3} className="px-1 py-0.5 text-right overflow-visible">
                        <AdminDownloadDocsButton orderId={selected.orderId} orderNumber={selected.orderNumber} format="xlsx" />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-1 py-0.5" />
                      <td className="px-1 py-0.5 text-[11px] text-slate-600">Delivery Terms</td>
                      <td colSpan={4} className="px-1 py-0.5">
                        <OrderTermsSelect
                          orderId={selected.orderId}
                          field="deliveryTerms"
                          options={DELIVERY_TERMS_OPTIONS}
                          value={selected.deliveryTerms ?? null}
                          locked={selected.deliveryTermsSetByAdmin}
                          mode="admin"
                        />
                      </td>
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
