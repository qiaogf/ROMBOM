import test from "node:test";
import assert from "node:assert/strict";

import {
  LIFECYCLE_VALUES,
  STATUS_META,
  canAdminApproveOrReject,
  canAdminCancel,
  canConfirmHandover,
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
const deliveredAt = new Date("2026-11-02T10:00:00Z");

/** 6 种客户侧状态的最小样本 */
const SAMPLES: Record<OrderLifecycle, OrderStateInput> = {
  draft: makeOrder(),
  pending: makeOrder({ submittedAt, auditStatus: "pending" }),
  rejected: makeOrder({ submittedAt, auditStatus: "rejected" }),
  approved: makeOrder({ submittedAt, auditStatus: "approved" }),
  confirmed: makeOrder({ submittedAt, auditStatus: "approved", deliveredAt }),
  cancelled: makeOrder({ orderStatus: "cancelled", submittedAt, auditStatus: "approved" }),
};

test("resolveOrderLifecycle：6 种状态各自解析正确", () => {
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
  // Cancelled > Confirmed
  assert.equal(
    resolveOrderLifecycle(
      makeOrder({ orderStatus: "cancelled", submittedAt, auditStatus: "approved", deliveredAt })
    ),
    "cancelled"
  );
});

test("resolveOrderLifecycle：Rejected 优先级高于 Confirmed", () => {
  // 管理员驳回优先于客户确认收货（正常业务不会出现，但状态机要兜底）
  assert.equal(
    resolveOrderLifecycle(makeOrder({ submittedAt, auditStatus: "rejected", deliveredAt })),
    "rejected"
  );
});

test("resolveOrderLifecycle：未提交即 Draft（即使审核字段为 approved）", () => {
  assert.equal(resolveOrderLifecycle(makeOrder({ auditStatus: "approved" })), "draft");
});

test("resolveOrderLifecycle：Confirmed = Approved + deliveredAt", () => {
  assert.equal(resolveOrderLifecycle(makeOrder({ submittedAt, auditStatus: "approved" })), "approved");
  assert.equal(
    resolveOrderLifecycle(makeOrder({ submittedAt, auditStatus: "approved", deliveredAt })),
    "confirmed"
  );
});

test("resolveOrderLifecycle：未知 auditStatus 视为 Pending", () => {
  assert.equal(resolveOrderLifecycle(makeOrder({ submittedAt, auditStatus: "unknown" })), "pending");
});

test("canSubmit：仅 Draft / Rejected 可提交（Rejected 可重新提交）", () => {
  assert.equal(canSubmit(SAMPLES.draft), true);
  assert.equal(canSubmit(SAMPLES.rejected), true);
  assert.equal(canSubmit(SAMPLES.pending), false);
  assert.equal(canSubmit(SAMPLES.approved), false);
  assert.equal(canSubmit(SAMPLES.confirmed), false);
  assert.equal(canSubmit(SAMPLES.cancelled), false);
});

test("canWithdraw：Draft / Pending / Rejected 可撤回，撤回后订单删除", () => {
  assert.equal(canWithdraw(SAMPLES.draft), true);
  assert.equal(canWithdraw(SAMPLES.pending), true);
  assert.equal(canWithdraw(SAMPLES.rejected), true);
  assert.equal(canWithdraw(SAMPLES.approved), false);
  assert.equal(canWithdraw(SAMPLES.confirmed), false);
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
  assert.equal(canRequestCancel(SAMPLES.confirmed), false);
  assert.equal(canRequestCancel(SAMPLES.cancelled), false);
});

test("canConfirmHandover：仅 Approved 且尚未 deliveredAt 可确认", () => {
  assert.equal(canConfirmHandover(SAMPLES.approved), true);
  assert.equal(canConfirmHandover(SAMPLES.confirmed), false, "已确认过，不能重复");
  assert.equal(canConfirmHandover(SAMPLES.pending), false);
  assert.equal(canConfirmHandover(SAMPLES.rejected), false);
  assert.equal(canConfirmHandover(SAMPLES.draft), false);
  assert.equal(canConfirmHandover(SAMPLES.cancelled), false);
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
  assert.equal(canAdminApproveOrReject(SAMPLES.confirmed), false);
  assert.equal(canAdminApproveOrReject(SAMPLES.cancelled), false);
});

test("canAdminCancel：Approved 且客户已提交取消申请才可 Cancel", () => {
  const approved = { orderStatus: "ordered", auditStatus: "approved", submittedAt };
  assert.equal(canAdminCancel({ ...approved, cancelRequestedAt: submittedAt }), true);
  assert.equal(canAdminCancel({ ...approved, cancelRequestedAt: null }), false);
  assert.equal(canAdminCancel({ ...approved, cancelRequestedAt: undefined }), false);
  assert.equal(canAdminCancel({ ...approved, auditStatus: "pending", cancelRequestedAt: submittedAt }), false);
  assert.equal(canAdminCancel({ ...approved, auditStatus: "rejected", cancelRequestedAt: submittedAt }), false);
});

test("canAdminCancel：管理员点 Cancel 后（orderStatus=cancelled）按钮停用", () => {
  assert.equal(
    canAdminCancel({
      orderStatus: "cancelled",
      auditStatus: "approved",
      submittedAt,
      cancelRequestedAt: submittedAt,
    }),
    false,
    "已取消的订单不能再点 Cancel"
  );
  assert.equal(
    canAdminCancel({
      orderStatus: "ordered",
      auditStatus: "approved",
      submittedAt,
      deliveredAt,
      cancelRequestedAt: submittedAt,
    }),
    false,
    "已交付（Handover）的订单不能再取消"
  );
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

test("按钮显隐规则：6 态 × 客户/管理员操作矩阵", () => {
  const expected: Record<
    OrderLifecycle,
    { withdraw: boolean; submit: boolean; cancelRequest: boolean; adminApproveOrReject: boolean; adminCancel: boolean }
  > = {
    draft: { withdraw: true, submit: true, cancelRequest: false, adminApproveOrReject: false, adminCancel: false },
    pending: { withdraw: true, submit: false, cancelRequest: false, adminApproveOrReject: true, adminCancel: false },
    rejected: { withdraw: true, submit: true, cancelRequest: false, adminApproveOrReject: false, adminCancel: false },
    approved: { withdraw: false, submit: false, cancelRequest: true, adminApproveOrReject: false, adminCancel: false },
    confirmed: { withdraw: false, submit: false, cancelRequest: false, adminApproveOrReject: false, adminCancel: false },
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
        adminCancel: canAdminCancel({
          orderStatus: order.orderStatus,
          auditStatus: order.auditStatus,
          submittedAt: order.submittedAt,
          deliveredAt: order.deliveredAt,
          cancelRequestedAt: order.cancelRequestedAt,
        }),
      },
      expected[lifecycle],
      `lifecycle=${lifecycle}`
    );
  }
});

test("完整流转：Draft → Pending → Rejected → Pending → Approved → Confirmed → Cancelled", () => {
  // 1) Draft：客户填好信息，未提交
  let order = makeOrder();
  assert.equal(resolveOrderLifecycle(order), "draft");
  assert.equal(canSubmit(order), true);

  // 2) Submit：手动型号 → Pending
  order = makeOrder({ submittedAt: new Date(), auditStatus: resolveSubmittedAuditStatus([{ requiresManualConfirm: true }]) });
  assert.equal(resolveOrderLifecycle(order), "pending");
  assert.equal(canWithdraw(order), true);

  // 3) 管理员 Reject → Rejected：订单保留，可撤回改明细，或改地址/付款后重提
  order = { ...order, auditStatus: "rejected" };
  assert.equal(resolveOrderLifecycle(order), "rejected");
  assert.equal(canSubmit(order), true);
  assert.equal(canWithdraw(order), true);

  // 4) 重新 Submit → Pending（新一轮审核从零开始，取消申请被清空）
  order = { ...order, submittedAt: new Date(), auditStatus: "pending", cancelRequestedAt: null };
  assert.equal(resolveOrderLifecycle(order), "pending");

  // 5) 管理员 Approve → Approved：不可 Withdraw，可发起 Cancel Request，可 Confirm Handover
  order = { ...order, auditStatus: "approved" };
  assert.equal(resolveOrderLifecycle(order), "approved");
  assert.equal(canWithdraw(order), false);
  assert.equal(canRequestCancel(order), true);
  assert.equal(canConfirmHandover(order), true);

  // 6) 客户 Confirm Handover → Confirmed：CanRequestCancel 禁用，canConfirmHandover 禁用
  order = { ...order, deliveredAt: new Date() };
  assert.equal(resolveOrderLifecycle(order), "confirmed");
  assert.equal(canRequestCancel(order), false);
  assert.equal(canConfirmHandover(order), false);

  // 7) 客户 Cancel Request 后管理员 Cancel → Cancelled：记录保留，解除关联采购 PO
  order = { ...order, cancelRequestedAt: new Date(), deliveredAt: null }; // 先回到 Approved 才能 Cancel Request
  order = { ...order, orderStatus: "cancelled" };
  assert.equal(resolveOrderLifecycle(order), "cancelled");
  assert.equal(canWithdraw(order), false);
  assert.equal(canRequestCancel(order), false);
});

test("STATUS_META：6 种状态各有独立配色", () => {
  assert.deepEqual(Object.keys(STATUS_META).sort(), [...LIFECYCLE_VALUES].sort());
  assert.deepEqual(
    LIFECYCLE_VALUES.map((lifecycle) => STATUS_META[lifecycle].color),
    ["#616161", "#F57C00", "#E53935", "#2E7D32", "#1976D2", "#607D8B"]
  );
  assert.equal(new Set(LIFECYCLE_VALUES.map((lifecycle) => STATUS_META[lifecycle].color)).size, 6);
  assert.equal(STATUS_META.confirmed.label, "Handover");
});
