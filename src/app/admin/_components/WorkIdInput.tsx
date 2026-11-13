"use client";

/**
 * Work ID 输入 — 超级管理员在 Admin 列表内直接填写工号
 * 失焦或回车时提交；清空后保存表示移除工号。
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAdminWorkId } from "@/app/actions/adminActions";

interface Props {
  adminId: string;
  workId: string | null;
}

export function WorkIdInput({ adminId, workId }: Props) {
  const saved = workId ?? "";
  const [val, setVal] = useState(saved);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  const commit = () => {
    const next = val.trim();
    if (next === saved.trim()) return;
    const fd = new FormData();
    fd.set("adminId", adminId);
    fd.set("workId", next);
    startTransition(async () => {
      const res = await updateAdminWorkId(fd);
      if (res.success) {
        setError("");
        router.refresh();
      } else {
        setError(res.message);
        setVal(saved);
      }
    });
  };

  return (
    <input
      type="text"
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
      placeholder="—"
      className={`w-20 border border-slate-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-[#336633] focus:ring-1 focus:ring-[#336633] ${
        pending ? "opacity-50" : ""
      } ${error ? "border-rose-400" : ""}`}
      title={error || "Work ID"}
    />
  );
}
