"use client";

// 销售单手动添加行 — Model / Price / Qty / Condition / Leadtime 输入，Add 后写入 SalesOrderItem 并重算订单金额
// 渲染为明细表最后一行（<tr>），列结构与 Sales 明细对齐
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { addSalesOrderItem } from "@/app/actions/adminActions";

export function AddSalesItemRow({ orderId }: { orderId: string }) {
  const [model, setModel] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [condition, setCondition] = useState("");
  const [leadTime, setLeadTime] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

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
      const res = await addSalesOrderItem(fd);
      if (res.success) {
        setModel("");
        setPrice("");
        setQty("");
        setCondition("");
        setLeadTime("");
        router.refresh();
      } else {
        window.alert(res.message);
      }
    });
  };

  const inputCls =
    "w-full px-1 py-0.5 text-[11px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50";

  return (
    <tr className="bg-blue-50/40">
      <td className="px-1 py-0.5 text-slate-400">+</td>
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
          className={`${inputCls} text-right tabular-nums`}
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
          className={`${inputCls} text-right tabular-nums max-w-[48px]`}
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
      <td className="px-1 py-0.5 text-right">
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
    </tr>
  );
}
