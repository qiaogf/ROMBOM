// 订单状态徽标（采购单 / 销售单共用的状态配色与标签）

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

export function StatusBadge({ status }: { status: string | null | undefined }) {
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
