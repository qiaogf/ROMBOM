import test from "node:test";
import assert from "node:assert/strict";

import {
  LIFECYCLE_VALUES,
  STATUS_META,
  canAdminApproveOrReject,
  canAdminCancel,
  canRequestCancel,
  canSubmit,
  canWithdraw,
  isCancelPending,
  resolveOrderLifecycle,
  resolveSubmittedAuditStatus,
  type OrderLifecycle,
  type OrderStateInput,
} from "./status-machine";

/** 构造一条订单状态（默认：未提交的 Draft） */
function makeOrder(patch: Partial<OrderStateInput> = {}): OrderStateInput {
  return {
    orderStatus: "ordered",
    submittedAt: null,
    auditStatus: "pending",
    ...patch,
  };
}

const submittedAt = new Date("2026-11-01T08:00:00Z");

/** 5 种客户侧状态的最小样本 */
const SAMPLES: Record<OrderLifecycle, OrderStateInput> = {
  draft: makeOrder(),
  pending: makeOrder({ submittedAt, auditStatus: "pending" }),
  rejected: makeOrder({ submittedAt, auditStatus: "rejected" }),
  approved: makeOrder({ submittedAt, auditStatus: "approved" }),
  cancelled: makeOrder({ orderStatus: "cancelled", submittedAt, auditStatus: "approved" }),
};

test("resolveOrderLifecycle：5 种状态各自解析正确", () => {
  for (const lifecycle of LIFECYCLE_VALUES) {
    assert.equal(resolveOrderLifecycle(SAMPLES[lifecycle]), lifecycle);
  }
});

test("resolveOrderLifecycle：已取消优先级最高", () => {
  assert.equal(
    resolveOrderLifecycle(makeOrder({ orderStatus: "cancelled", submittedAt: null, auditStatus: "rejected" })),
    "cancelled"
  );
  assert.equal(
    resolveOrderLifecycle(
      makeOrder({ orderStatus: "cancelled", submittedAt, auditStatus: "approved", cancelRequestedAt: submittedAt })
    ),
    "cancelled"
  );
});

test("resolveOrderLifecycle：未提交即 Draft（即使审核字段为 approved）", () => {
  assert.equal(resolveOrderLifecycle(makeOrder({ auditStatus: "approved" })), "draft");
});

test("resolveOrderLifecycle：未知 auditStatus 视为 Pending", () => {
  assert.equal(resolveOrderLifecycle(makeOrder({ submittedAt, auditStatus: "unknown" })), "pending");
});

test("canSubmit：仅 Draft / Rejected 可提交（Rejected 可重新提交）", () => {
  assert.equal(canSubmit(SAMPLES.draft), true);
  assert.equal(canSubmit(SAMPLES.rejected), true);
  assert.equal(canSubmit(SAMPLES.pending), false);
  assert.equal(canSubmit(SAMPLES.approved), false);
  assert.equal(canSubmit(SAMPLES.cancelled), false);
});

test("canWithdraw：仅 Draft / Pending 可撤回，撤回后订单删除", () => {
  assert.equal(canWithdraw(SAMPLES.draft), true);
  assert.equal(canWithdraw(SAMPLES.pending), true);
  assert.equal(canWithdraw(SAMPLES.rejected), false);
  assert.equal(canWithdraw(SAMPLES.approved), false);
  assert.equal(canWithdraw(SAMPLES.cancelled), false);
});

test("canRequestCancel：仅 Approved 且未申请过可发起取消申请", () => {
  assert.equal(canRequestCancel(SAMPLES.approved), true);
  assert.equal(
    canRequestCancel(makeOrder({ submittedAt, auditStatus: "approved", cancelRequestedAt: submittedAt })),
    false,
    "已提交过取消申请，不能重复提交"
  );
  assert.equal(canRequestCancel(SAMPLES.pending), false);
  assert.equal(canRequestCancel(SAMPLES.rejected), false);
  assert.equal(canRequestCancel(SAMPLES.draft), false);
  assert.equal(canRequestCancel(SAMPLES.cancelled), false);
});

test("isCancelPending：Approved 且已提交取消申请，等待管理员处理", () => {
  assert.equal(isCancelPending(makeOrder({ submittedAt, auditStatus: "approved", cancelRequestedAt: submittedAt })), true);
  assert.equal(isCancelPending(SAMPLES.approved), false);
  assert.equal(isCancelPending(SAMPLES.pending), false);
  assert.equal(isCancelPending(SAMPLES.cancelled), false);
});

test("canAdminApproveOrReject：仅已提交且 Pending 可 Approve / Reject", () => {
  assert.equal(canAdminApproveOrReject(SAMPLES.pending), true);
  assert.equal(canAdminApproveOrReject(SAMPLES.draft), false, "未提交的 Draft 不可审核");
  assert.equal(canAdminApproveOrReject(SAMPLES.rejected), false);
  assert.equal(canAdminApproveOrReject(SAMPLES.approved), false);
  assert.equal(canAdminApproveOrReject(SAMPLES.cancelled), false);
});

test("canAdminCancel：Approved 且客户已提交取消申请才可 Cancel", () => {
  assert.equal(canAdminCancel("approved", submittedAt), true);
  assert.equal(canAdminCancel("approved", null), false);
  assert.equal(canAdminCancel("approved", undefined), false);
  assert.equal(canAdminCancel("pending", submittedAt), false);
  assert.equal(canAdminCancel("rejected", submittedAt), false);
});

test("resolveSubmittedAuditStatus：全部可自助下单自动 Approved，否则 Pending", () => {
  assert.equal(resolveSubmittedAuditStatus([]), "pending", "空订单不允许自动通过");
  assert.equal(resolveSubmittedAuditStatus([{ requiresManualConfirm: false }]), "approved");
  assert.equal(
    resolveSubmittedAuditStatus([{ requiresManualConfirm: false }, { requiresManualConfirm: false }]),
    "approved"
  );
  assert.equal(
    resolveSubmittedAuditStatus([{ requiresManualConfirm: true }, { requiresManualConfirm: false }]),
    "pending"
  );
});

test("按钮显隐规则：5 态 × 客户/管理员操作矩阵", () => {
  const expected: Record<
    OrderLifecycle,
    { withdraw: boolean; submit: boolean; cancelRequest: boolean; adminApproveOrReject: boolean; adminCancel: boolean }
  > = {
    draft: { withdraw: true, submit: true, cancelRequest: false, adminApproveOrReject: false, adminCancel: false },
    pending: { withdraw: true, submit: false, cancelRequest: false, adminApproveOrReject: true, adminCancel: false },
    rejected: { withdraw: false, submit: true, cancelRequest: false, adminApproveOrReject: false, adminCancel: false },
    approved: { withdraw: false, submit: false, cancelRequest: true, adminApproveOrReject: false, adminCancel: false },
    cancelled: { withdraw: false, submit: false, cancelRequest: false, adminApproveOrReject: false, adminCancel: false },
  };

  for (const lifecycle of LIFECYCLE_VALUES) {
    const order = SAMPLES[lifecycle];
    assert.deepEqual(
      {
        withdraw: canWithdraw(order),
        submit: canSubmit(order),
        cancelRequest: canRequestCancel(order),
        adminApproveOrReject: canAdminApproveOrReject(order),
        adminCancel: canAdminCancel(order.auditStatus, order.cancelRequestedAt),
      },
      expected[lifecycle],
      `lifecycle=${lifecycle}`
    );
  }
});

test("完整流转：Draft → Pending → Rejected → Pending → Approved → 取消申请 → Cancelled", () => {
  // 1) Draft：客户填好信息，未提交
  let order = makeOrder();
  assert.equal(resolveOrderLifecycle(order), "draft");
  assert.equal(canSubmit(order), true);

  // 2) Submit：手动型号 → Pending
  order = makeOrder({ submittedAt: new Date(), auditStatus: resolveSubmittedAuditStatus([{ requiresManualConfirm: true }]) });
  assert.equal(resolveOrderLifecycle(order), "pending");
  assert.equal(canWithdraw(order), true);

  // 3) 管理员 Reject → Rejected：订单保留，可编辑后重新提交
  order = { ...order, auditStatus: "rejected" };
  assert.equal(resolveOrderLifecycle(order), "rejected");
  assert.equal(canSubmit(order), true);
  assert.equal(canWithdraw(order), false);

  // 4) 重新 Submit → Pending（新一轮审核从零开始，取消申请被清空）
  order = { ...order, submittedAt: new Date(), auditStatus: "pending", cancelRequestedAt: null };
  assert.equal(resolveOrderLifecycle(order), "pending");

  // 5) 管理员 Approve → Approved：不可 Withdraw，可发起 Cancel Request
  order = { ...order, auditStatus: "approved" };
  assert.equal(resolveOrderLifecycle(order), "approved");
  assert.equal(canWithdraw(order), false);
  assert.equal(canRequestCancel(order), true);

  // 6) 客户 Cancel Request：订单保留，等待管理员批准
  order = { ...order, cancelRequestedAt: new Date() };
  assert.equal(resolveOrderLifecycle(order), "approved");
  assert.equal(isCancelPending(order), true);
  assert.equal(canAdminCancel(order.auditStatus, order.cancelRequestedAt), true);

  // 7) 管理员 Cancel → Cancelled：记录保留，解除关联采购 PO
  order = { ...order, orderStatus: "cancelled" };
  assert.equal(resolveOrderLifecycle(order), "cancelled");
  assert.equal(canWithdraw(order), false);
  assert.equal(canRequestCancel(order), false);
});

test("STATUS_META：5 种状态各有独立配色", () => {
  assert.deepEqual(Object.keys(STATUS_META).sort(), [...LIFECYCLE_VALUES].sort());
  assert.deepEqual(
    LIFECYCLE_VALUES.map((lifecycle) => STATUS_META[lifecycle].color),
    ["#616161", "#F57C00", "#E53935", "#2E7D32", "#607D8B"]
  );
  assert.equal(new Set(LIFECYCLE_VALUES.map((lifecycle) => STATUS_META[lifecycle].color)).size, 5);
});
