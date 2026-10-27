// PO 明细表（单 PO / 多 PO 共用）：PurOrder / Model / PurPrice / Qty / Condition / Leadtime / Amount

import { OrderItemPriceInput } from "@/app/admin/_components/OrderItemPriceInput";
import { OrderItemQtyInput } from "@/app/admin/_components/OrderItemQtyInput";
import { formatLeadtime } from "@/lib/cart-display";

export function PurchaseItemsTable({
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
