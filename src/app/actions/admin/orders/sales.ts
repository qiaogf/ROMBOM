"use server";

// 销售订单相关 admin actions：审核 / 状态 / 删除 / 明细改价改量增行。

import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth-admin";
import { canAdminApproveOrReject, canAdminCancel } from "@/app/actions/order/status-machine";
import { isValidOrderTerm, type OrderTermField } from "@/lib/order-terms";
import { round4 } from "./shared";

// ============ 订单审核 ============

// 销售订单审核：Approve / Reject 仅对 Pending 生效
export async function approveSalesOrder(formData: FormData): Promise<{ success: boolean; message: string }> {
  const orderId = (formData.get("orderId") as string)?.trim();
  if (!orderId) return { success: false, message: "Order ID is required." };
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  try {
    const order = await prisma.salesOrder.findUnique({ where: { orderId } });
    if (!order) return { success: false, message: "Sales order not found." };
    if (!canAdminApproveOrReject(order)) {
      return { success: false, message: "Only pending orders can be approved." };
    }
    await prisma.salesOrder.update({ where: { orderId }, data: { auditStatus: "approved" } });
    return { success: true, message: "Sales order approved." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to approve: ${msg}` };
  }
}

export async function rejectSalesOrder(formData: FormData): Promise<{ success: boolean; message: string }> {
  const orderId = (formData.get("orderId") as string)?.trim();
  if (!orderId) return { success: false, message: "Order ID is required." };
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  try {
    const order = await prisma.salesOrder.findUnique({ where: { orderId } });
    if (!order) return { success: false, message: "Sales order not found." };
    if (!canAdminApproveOrReject(order)) {
      return { success: false, message: "Only pending orders can be rejected." };
    }
    await prisma.salesOrder.update({ where: { orderId }, data: { auditStatus: "rejected" } });
    return { success: true, message: "Sales order rejected." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to reject: ${msg}` };
  }
}

/**
 * 批准客户的取消申请（Cancel）
 * 订单 → cancelled（记录保留），并作废关联的供应商采购 PO（解除关联）
 */
export async function cancelSalesOrder(formData: FormData): Promise<{ success: boolean; message: string }> {
  const orderId = (formData.get("orderId") as string)?.trim();
  if (!orderId) return { success: false, message: "Order ID is required." };
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({ where: { orderId } });
      if (!order) return { success: false, message: "Sales order not found." };
      if (order.orderStatus === "cancelled") {
        return { success: false, message: "This order is already cancelled." };
      }
      if (!canAdminCancel(order.auditStatus, order.cancelRequestedAt)) {
        return {
          success: false,
          message:
            order.auditStatus !== "approved"
              ? "Only approved orders can be cancelled."
              : "The customer has not submitted a cancellation request.",
        };
      }
      await tx.salesOrder.update({ where: { orderId }, data: { orderStatus: "cancelled" } });
      // 解除关联采购 PO：作废该销售订单下的所有采购单
      await tx.purchaseOrder.updateMany({
        where: { salesOrderId: orderId },
        data: { poStatus: "cancelled", auditStatus: "pending" },
      });
      return { success: true, message: "Order cancelled and linked purchase orders voided." };
    });
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to cancel: ${msg}` };
  }
}

// 销售订单状态：ordered（默认）→ paid（客户已付全款）→ received（客户已收货）
const SO_STATUS_VALUES = ["ordered", "paid", "received"] as const;

export async function updateSalesOrderStatus(formData: FormData): Promise<{ success: boolean; message: string }> {
  const orderId = (formData.get("orderId") as string)?.trim();
  if (!orderId) return { success: false, message: "Order ID is required." };
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  const status = (formData.get("status") as string)?.trim() ?? "ordered";
  if (!(SO_STATUS_VALUES as readonly string[]).includes(status)) {
    return { success: false, message: "Invalid status." };
  }
  try {
    await prisma.salesOrder.update({ where: { orderId }, data: { soStatus: status } });
    return { success: true, message: "Sales order status updated." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to update status: ${msg}` };
  }
}

// 删除销售订单（SalesOrderItem 由 onDelete: Cascade 自动清理）
export async function deleteSalesOrder(formData: FormData): Promise<{ success: boolean; message: string }> {
  const orderId = (formData.get("orderId") as string)?.trim();
  if (!orderId) return { success: false, message: "Order ID is required." };
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  try {
    await prisma.salesOrder.delete({ where: { orderId } });
    return { success: true, message: "Sales order deleted." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to delete sales order: ${msg}` };
  }
}

// ============ 订单明细改价（2026-10-20）============

// 管理者改销售订单明细的实际销售价（ListPrice 输入框，初始=下单时 ListPrice 快照 unitPrice）
// 同步重算 item.subtotal 与订单 subtotal/totalAmount
export async function updateSalesOrderItemPrice(formData: FormData): Promise<{ success: boolean; message: string }> {
  const itemId = (formData.get("itemId") as string)?.trim();
  if (!itemId) return { success: false, message: "Item ID is required." };
  const price = Number(formData.get("price"));
  if (!Number.isFinite(price) || price <= 0 || price > 1000000) {
    return { success: false, message: "Price must be a number between 0 and 1,000,000." };
  }
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.salesOrderItem.findUnique({ where: { itemId } });
      if (!item) throw new Error("Order item not found.");
      const newSubtotal = round4(price * item.quantity);
      await tx.salesOrderItem.update({
        where: { itemId },
        data: { finalSellPrice: round4(price), subtotal: newSubtotal },
      });
      const order = await tx.salesOrder.findUnique({
        where: { orderId: item.orderId },
        include: { items: true },
      });
      if (!order) throw new Error("Sales order not found.");
      const subtotal = round4(
        order.items.reduce((sum, it) => sum + Number(it.finalSellPrice) * it.quantity, 0)
      );
      await tx.salesOrder.update({
        where: { orderId: order.orderId },
        data: {
          subtotal,
          totalAmount: round4(subtotal + Number(order.shippingCost) + Number(order.taxAmount) - Number(order.discountAmount)),
        },
      });
    });
    return { success: true, message: "Item price updated." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to update item price: ${msg}` };
  }
}

// 管理者改销售订单明细数量（Qty 输入框，初始=下单数量）
// 同步重算 item.subtotal 与订单 subtotal/totalAmount
export async function updateSalesOrderItemQty(formData: FormData): Promise<{ success: boolean; message: string }> {
  const itemId = (formData.get("itemId") as string)?.trim();
  if (!itemId) return { success: false, message: "Item ID is required." };
  const qty = Number(formData.get("quantity"));
  if (!Number.isInteger(qty) || qty < 1 || qty > 99999) {
    return { success: false, message: "Quantity must be an integer between 1 and 99,999." };
  }
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.salesOrderItem.findUnique({ where: { itemId } });
      if (!item) throw new Error("Order item not found.");
      const newSubtotal = round4(Number(item.finalSellPrice ?? item.unitPrice) * qty);
      await tx.salesOrderItem.update({
        where: { itemId },
        data: { quantity: qty, subtotal: newSubtotal },
      });
      const order = await tx.salesOrder.findUnique({
        where: { orderId: item.orderId },
        include: { items: true },
      });
      if (!order) throw new Error("Sales order not found.");
      const subtotal = round4(
        order.items.reduce((sum, it) => sum + Number(it.finalSellPrice ?? it.unitPrice) * it.quantity, 0)
      );
      await tx.salesOrder.update({
        where: { orderId: order.orderId },
        data: {
          subtotal,
          totalAmount: round4(subtotal + Number(order.shippingCost) + Number(order.taxAmount) - Number(order.discountAmount)),
        },
      });
    });
    return { success: true, message: "Quantity updated." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to update quantity: ${msg}` };
  }
}

// 管理者删除销售订单明细一行（减行）：删除 SalesOrderItem 并重算订单 subtotal / totalAmount
export async function deleteSalesOrderItem(formData: FormData): Promise<{ success: boolean; message: string }> {
  const itemId = (formData.get("itemId") as string)?.trim();
  if (!itemId) return { success: false, message: "Item ID is required." };
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.salesOrderItem.findUnique({ where: { itemId } });
      if (!item) throw new Error("Sales order item not found.");
      await tx.salesOrderItem.delete({ where: { itemId } });
      const items = await tx.salesOrderItem.findMany({ where: { orderId: item.orderId } });
      const subtotal = round4(
        items.reduce((sum, it) => sum + Number(it.finalSellPrice ?? it.unitPrice) * it.quantity, 0)
      );
      const order = await tx.salesOrder.findUnique({ where: { orderId: item.orderId } });
      if (!order) throw new Error("Sales order not found.");
      await tx.salesOrder.update({
        where: { orderId: item.orderId },
        data: {
          subtotal,
          totalAmount: round4(
            subtotal + Number(order.shippingCost) + Number(order.taxAmount) - Number(order.discountAmount)
          ),
        },
      });
    });
    return { success: true, message: "Item deleted." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to delete item: ${msg}` };
  }
}

// 管理者补录 All Charges（订单 shippingCost）：客户订单页 All Charges 同步显示
// 同步重算订单 totalAmount
export async function updateSalesOrderShippingCost(formData: FormData): Promise<{ success: boolean; message: string }> {
  const orderId = (formData.get("orderId") as string)?.trim();
  if (!orderId) return { success: false, message: "Order ID is required." };
  const shippingCost = Number(formData.get("shippingCost"));
  if (!Number.isFinite(shippingCost) || shippingCost < 0 || shippingCost > 1000000) {
    return { success: false, message: "All Charges must be a number between 0 and 1,000,000." };
  }
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({ where: { orderId } });
      if (!order) throw new Error("Sales order not found.");
      await tx.salesOrder.update({
        where: { orderId },
        data: {
          shippingCost: round4(shippingCost),
          totalAmount: round4(
            Number(order.subtotal) + round4(shippingCost) + Number(order.taxAmount) - Number(order.discountAmount)
          ),
        },
      });
    });
    return { success: true, message: "All Charges updated." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to update All Charges: ${msg}` };
  }
}

// 管理者设定商务条款（Payment Terms / Payment Method / Delivery Terms）：
// 写入订单并锁定该条款，客户端同步显示为绿色且不可再修改
export async function updateSalesOrderTerms(
  orderId: string,
  field: OrderTermField,
  value: string | null
): Promise<{ success: boolean; message: string }> {
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };

  const fields: OrderTermField[] = ["paymentTerms", "paymentMethod", "deliveryTerms"];
  if (!fields.includes(field)) return { success: false, message: "Invalid term field." };
  if (value !== null && !isValidOrderTerm(field, value)) {
    return { success: false, message: "Invalid option." };
  }

  const flag =
    field === "paymentTerms"
      ? "paymentTermsSetByAdmin"
      : field === "paymentMethod"
        ? "paymentMethodSetByAdmin"
        : "deliveryTermsSetByAdmin";

  try {
    const order = await prisma.salesOrder.findUnique({ where: { orderId }, select: { orderId: true } });
    if (!order) return { success: false, message: "Sales order not found." };
    await prisma.salesOrder.update({
      where: { orderId },
      data: { [field]: value, [flag]: true },
    });
    return { success: true, message: "Terms updated." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to update terms: ${msg}` };
  }
}

/** 规范化 HS Code：仅允许数字、点与空格，长度 4–20；空串表示清空 */
function normalizeHsCode(value: string | null): string | null {
  if (value === null) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!/^[0-9.\s]{4,20}$/.test(trimmed)) return null;
  return trimmed;
}

// 管理者修改单个型号的 HS Code（绿色表示已人工确认）
// 行级修改优先：同时清空订单级统一值，避免被覆盖
export async function updateSalesOrderItemHsCode(
  itemId: string,
  value: string | null
): Promise<{ success: boolean; message: string }> {
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };

  const code = normalizeHsCode(value);
  if (code === null) return { success: false, message: "HS Code must be digits with dots, 4-20 characters." };

  try {
    const item = await prisma.salesOrderItem.findUnique({
      where: { itemId },
      select: { orderId: true },
    });
    if (!item) return { success: false, message: "Item not found." };

    await prisma.$transaction([
      prisma.salesOrderItem.update({ where: { itemId }, data: { hsCode: code || null } }),
      prisma.salesOrder.update({ where: { orderId: item.orderId }, data: { hsCode: null } }),
    ]);
    return { success: true, message: "HS Code updated." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to update HS Code: ${msg}` };
  }
}

// 管理者设定订单统一 HS Code：对本订单全部型号生效
export async function updateSalesOrderHsCode(
  orderId: string,
  value: string | null
): Promise<{ success: boolean; message: string }> {
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };

  const code = normalizeHsCode(value);
  if (code === null) return { success: false, message: "HS Code must be digits with dots, 4-20 characters." };

  try {
    const order = await prisma.salesOrder.findUnique({ where: { orderId }, select: { orderId: true } });
    if (!order) return { success: false, message: "Sales order not found." };

    await prisma.salesOrder.update({ where: { orderId }, data: { hsCode: code || null } });
    return { success: true, message: "HS Code updated for all items." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to update HS Code: ${msg}` };
  }
}

// 管理者手动添加一行销售明细（Model / Price / Qty / Condition / Leadtime）
// 写入 SalesOrderItem 并重算订单 subtotal / totalAmount
export async function addSalesOrderItem(formData: FormData): Promise<{ success: boolean; message: string }> {
  const orderId = (formData.get("orderId") as string)?.trim();
  if (!orderId) return { success: false, message: "Order ID is required." };
  const model = (formData.get("model") as string)?.trim();
  if (!model) return { success: false, message: "Model is required." };
  const price = Number(formData.get("price"));
  if (!Number.isFinite(price) || price <= 0 || price > 1000000) {
    return { success: false, message: "Price must be a number between 0 and 1,000,000." };
  }
  const qty = Number(formData.get("quantity"));
  if (!Number.isInteger(qty) || qty < 1 || qty > 99999) {
    return { success: false, message: "Quantity must be an integer between 1 and 99,999." };
  }
  // Condition / Leadtime 可选：留空存 null
  const condition = (formData.get("condition") as string)?.trim() || null;
  const leadTime = (formData.get("leadTime") as string)?.trim() || null;
  // HS Code 可选：留空则存 null（列表里回落到系统推导值）
  const hsCodeRaw = normalizeHsCode((formData.get("hsCode") as string) ?? null);
  if (hsCodeRaw === null) {
    return { success: false, message: "HS Code must be digits with dots, 4-20 characters." };
  }
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({ where: { orderId }, select: { orderId: true } });
      if (!order) throw new Error("Sales order not found.");
      await tx.salesOrderItem.create({
        data: {
          orderId,
          productName: model,
          model,
          unitPrice: round4(price),
          finalSellPrice: round4(price),
          quantity: qty,
          subtotal: round4(price * qty),
          condition,
          leadTime,
          hsCode: hsCodeRaw || null,
          itemStatus: "ordered",
        },
      });
      const items = await tx.salesOrderItem.findMany({ where: { orderId } });
      const subtotal = round4(
        items.reduce((sum, it) => sum + Number(it.finalSellPrice ?? it.unitPrice) * it.quantity, 0)
      );
      const full = await tx.salesOrder.findUnique({ where: { orderId } });
      if (!full) throw new Error("Sales order not found.");
      await tx.salesOrder.update({
        where: { orderId },
        data: {
          subtotal,
          totalAmount: round4(subtotal + Number(full.shippingCost) + Number(full.taxAmount) - Number(full.discountAmount)),
        },
      });
    });
    return { success: true, message: "Item added." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to add item: ${msg}` };
  }
}
