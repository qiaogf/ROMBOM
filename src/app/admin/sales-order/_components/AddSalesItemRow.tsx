"use client";

// 销售单手动添加行 — Model / Price / Qty / Condition / Leadtime 输入，Add 后写入 SalesOrderItem 并重算订单金额
// 渲染为明细表最后一行（<tr>），列结构与 Sales 明细对齐
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { inferHsCode } from "@/lib/hs-code";
import { addSalesOrderItem } from "@/app/actions/adminActions";

export function AddSalesItemRow({
  orderId,
  orderHsCode = null,
}: {
  orderId: string;
  /** 订单统一 HS Code：已设定时本行锁定显示该值（绿色），新增行自动继承 */
  orderHsCode?: string | null;
}) {
  const [model, setModel] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [condition, setCondition] = useState("");
  const [leadTime, setLeadTime] = useState("");
  const [hsCode, setHsCode] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // 订单统一 HS Code 优先：设定后新增行直接显示绿码且不可改
  const lockedHs = Boolean(orderHsCode && orderHsCode.trim());
  const effectiveHs = lockedHs ? orderHsCode!.trim() : hsCode.trim();
  const numericPrice = Number(price);
  const numericQty = Number(qty);
  const lineAmount =
    (Number.isFinite(numericPrice) ? numericPrice : 0) *
    (Number.isFinite(numericQty) ? numericQty : 0);

  const handleAdd = () => {
    if (pending) return;
    const m = model.trim();
    const p = Number(price);
    const q = Number(qty);
    if (!m) {
      window.alert("Model is required.");
      return;
    }
    if (!Number.isFinite(p) || p <= 0 || p > 1000000) {
      window.alert("Price must be a number between 0 and 1,000,000.");
      return;
    }
    if (!Number.isInteger(q) || q < 1 || q > 99999) {
      window.alert("Quantity must be an integer between 1 and 99,999.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("orderId", orderId);
      fd.set("model", m);
      fd.set("price", String(p));
      fd.set("quantity", String(q));
      fd.set("condition", condition.trim());
      fd.set("leadTime", leadTime.trim());
      fd.set("hsCode", lockedHs ? "" : hsCode.trim());
      const res = await addSalesOrderItem(fd);
      if (res.success) {
        setModel("");
        setPrice("");
        setQty("");
        setCondition("");
        setLeadTime("");
        setHsCode("");
        router.refresh();
      } else {
        window.alert(res.message);
      }
    });
  };

  const inputCls =
    "w-full h-[22px] px-1 text-[11px] leading-none border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50";
  // 数字框去掉浏览器上下加减按钮，宽度与同列普通输入框一致
  const numberCls = `${inputCls} text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;

  return (
    <tr className="bg-blue-50/40">
      {/* Add 按钮放在本行最左侧（SalesOrder 列） */}
      <td className="px-1 py-0.5 text-center">
        <button
          type="button"
          onClick={handleAdd}
          disabled={pending}
          title="Add item to this sales order"
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Plus className="w-3 h-3" />
          )}
          Add
        </button>
      </td>
      <td className="px-1 py-0.5">
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={pending}
          placeholder="Model"
          aria-label="Model"
          className={inputCls}
        />
      </td>
      <td className="px-1 py-0.5">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.0001"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={pending}
          placeholder="0.00"
          aria-label="Price"
          className={`${numberCls} max-w-none`}
        />
      </td>
      <td className="px-1 py-0.5">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={99999}
          step={1}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          disabled={pending}
          placeholder="Qty"
          aria-label="Qty"
          className={`${numberCls} max-w-none`}
        />
      </td>
      {/* Amount = 本行 Price × Qty；空值或 0 均显示为 $0.00 */}
      <td className="px-1 py-0.5 text-slate-700 tabular-nums text-left">
        ${lineAmount.toFixed(2)}
      </td>
      {/* HS Code：默认灰色显示系统按型号推导的编码；管理员填写后绿色 */}
      <td className="px-1 py-0.5">
        <input
          type="text"
          inputMode="numeric"
          value={effectiveHs}
          maxLength={10}
          readOnly={lockedHs}
          onChange={(e) => setHsCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          disabled={pending}
          placeholder={inferHsCode(model) || "HS Code"}
          aria-label="HS Code"
          title={
            lockedHs
              ? "Order-level HS Code applies to all items"
              : "Leave blank to use the system-suggested code"
          }
          className={`${inputCls} max-w-[10ch] tabular-nums ${
            effectiveHs ? "text-[#336633] font-semibold" : "text-slate-500"
          } ${lockedHs ? "bg-slate-50" : ""}`}
        />
      </td>
      <td className="px-1 py-0.5">
        <input
          type="text"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          disabled={pending}
          placeholder="Condition"
          aria-label="Condition"
          className={inputCls}
        />
      </td>
      <td className="px-1 py-0.5">
        <input
          type="text"
          value={leadTime}
          onChange={(e) => setLeadTime(e.target.value)}
          disabled={pending}
          placeholder="Leadtime"
          aria-label="Leadtime"
          className={inputCls}
        />
      </td>
      <td className="px-1 py-0.5" />
    </tr>
  );
}
