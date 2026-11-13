// 订单状态机纯逻辑：不依赖 Prisma / 框架，便于单元测试。
// 客户侧 5 态：Draft → Pending → Rejected / Approved → Cancelled

export type OrderLifecycle = "draft" | "pending" | "rejected" | "approved" | "cancelled";

/** 状态机判定所需的最小订单字段 */
export interface OrderStateInput {
  /** 履约状态：ordered / paid / received / cancelled ... */
  orderStatus: string;
  /** 客户尚未点击 Submit 时为 null */
  submittedAt: Date | string | null;
  /** 审核状态：pending / rejected / approved */
  auditStatus: string;
  /** 客户在 Approved 状态下提交取消申请的时间 */
  cancelRequestedAt?: Date | string | null;
}

/** 状态框展示配置：5 态各自独立配色 */
export const STATUS_META: Record<OrderLifecycle, { label: string; color: string }> = {
  draft: { label: "Draft", color: "#616161" },
  pending: { label: "Pending", color: "#F57C00" },
  rejected: { label: "Rejected", color: "#E53935" },
  approved: { label: "Approved", color: "#2E7D32" },
  cancelled: { label: "Cancelled", color: "#607D8B" },
};

export const LIFECYCLE_VALUES: OrderLifecycle[] = ["draft", "pending", "rejected", "approved", "cancelled"];

/**
 * 解析客户侧生命周期状态
 * 优先级：已取消 > 未提交（Draft）> 审核结果 > 待审核
 */
export function resolveOrderLifecycle(order: OrderStateInput): OrderLifecycle {
  if (order.orderStatus === "cancelled") return "cancelled";
  if (!order.submittedAt) return "draft";
  if (order.auditStatus === "rejected") return "rejected";
  if (order.auditStatus === "approved") return "approved";
  return "pending";
}

/** 客户可 Submit：Draft（首次提交）或 Rejected（修改后重新提交，审核从零开始） */
export function canSubmit(order: OrderStateInput): boolean {
  const lifecycle = resolveOrderLifecycle(order);
  return lifecycle === "draft" || lifecycle === "rejected";
}

/** 客户可 Withdraw：仅 Draft / Pending；撤回后订单删除、选型退回购物车 */
export function canWithdraw(order: OrderStateInput): boolean {
  const lifecycle = resolveOrderLifecycle(order);
  return lifecycle === "draft" || lifecycle === "pending";
}

/** 客户可提交取消申请：仅 Approved 且本单尚未申请过 */
export function canRequestCancel(order: OrderStateInput): boolean {
  return resolveOrderLifecycle(order) === "approved" && !order.cancelRequestedAt;
}

/** 取消申请已提交、等待管理员批准 */
export function isCancelPending(order: OrderStateInput): boolean {
  return resolveOrderLifecycle(order) === "approved" && !!order.cancelRequestedAt;
}

/** 管理员 Approve / Reject：仅已提交且待审核（Pending）的订单可操作 */
export function canAdminApproveOrReject(
  order: Pick<OrderStateInput, "submittedAt" | "auditStatus">
): boolean {
  return !!order.submittedAt && order.auditStatus === "pending";
}

/** 管理员 Cancel：Approved 且客户已提交取消申请 */
export function canAdminCancel(auditStatus: string, cancelRequestedAt?: Date | string | null): boolean {
  return auditStatus === "approved" && !!cancelRequestedAt;
}

/**
 * Submit 后的审核状态：
 * 全部型号可自助下单 → approved（免审）；否则 → pending（等管理员确认）
 */
export function resolveSubmittedAuditStatus(
  items: Array<{ requiresManualConfirm: boolean }>
): "approved" | "pending" {
  return items.length > 0 && items.every((item) => !item.requiresManualConfirm) ? "approved" : "pending";
}
