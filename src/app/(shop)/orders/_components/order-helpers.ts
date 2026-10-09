// Shared display helpers for My Orders page (list + detail sub-tables).
// Extracted from OrdersContent.tsx (Phase 19) — pure move, zero behavior change.

/** soStatus → display label */
export const SO_STATUS_LABEL: Record<string, string> = {
  ordered: "Ordered",
  paid: "Paid",
  shipped: "Shipped",
  received: "Received",
};

export function soStatusBadgeClass(status: string) {
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

/** DD/MM/YY 格式 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

export function formatStockStatus(stock: string | null | undefined): string {
  switch (stock) {
    case "in_stock":
      return "In Stock";
    case "out_of_stock":
      return "Out of Stock";
    case "pre_order":
      return "Pre-order";
    default:
      return stock || "—";
  }
}
