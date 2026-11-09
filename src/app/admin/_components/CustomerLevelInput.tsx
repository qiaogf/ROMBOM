"use client";

/**
 * 客户评级输入 — 0-5 数字
 * 数字越大等级越高
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCustomerLevel } from "@/app/actions/adminActions";

interface Props {
  customerId: string;
  level: number;
}

export function CustomerLevelInput({ customerId, level }: Props) {
  const [val, setVal] = useState(String(level));
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const commit = () => {
    const n = Number(val);
    if (isNaN(n) || n < 0 || n > 5 || n === level) {
      setVal(String(level));
      return;
    }
    const fd = new FormData();
    fd.set("customerId", customerId);
    fd.set("level", String(n));
    startTransition(async () => {
      const res = await updateCustomerLevel(fd);
      if (res.success) router.refresh();
    });
  };

  return (
    <input
      type="number"
      min={0}
      max={5}
      value={val}
      disabled={pending}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={`w-12 border border-slate-300 rounded px-1 py-0.5 text-xs text-center focus:outline-none focus:border-[#336633] focus:ring-1 focus:ring-[#336633] ${
        pending ? "opacity-50" : ""
      }`}
      title="Customer Level (0-5): higher=better"
    />
  );
}
