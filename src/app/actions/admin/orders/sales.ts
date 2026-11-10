"use server";

// 销售订单相关 admin actions：审核 / 状态 / 删除 / 明细改价改量增行。

import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth-admin";
import { round4 } from "./shared";

// ============ 订单审核 ============

// 销售订单审核
export async function approveSalesOrder(formData: FormData): Promise<{ success: boolean; message: string }> {
  const orderId = (formData.get("orderId") as string)?.trim();
  if (!orderId) return { success: false, message: "Order ID is required." };
  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };
  try {
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
    await prisma.salesOrder.update({ where: { orderId }, data: { auditStatus: "rejected" } });
    return { success: true, message: "Sales order rejected." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to reject: ${msg}` };
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
